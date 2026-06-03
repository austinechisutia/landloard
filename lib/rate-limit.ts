import { type NextRequest } from 'next/server';
import { prisma } from './prisma';

export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export function getIPFromHeaders(headers: Record<string, unknown> | undefined): string {
  if (!headers) return 'unknown';
  const xff = headers['x-forwarded-for'];
  if (xff) return (Array.isArray(xff) ? xff[0] : String(xff)).split(',')[0].trim();
  const realIp = headers['x-real-ip'];
  if (realIp) return Array.isArray(realIp) ? realIp[0] : String(realIp);
  return 'unknown';
}

export async function rateLimit(key: string, limit: number, windowSecs: number): Promise<boolean> {
  const now = new Date();

  // Atomically consume a slot when the window is active and under the limit.
  const incremented = await prisma.rateLimitAttempt.updateMany({
    where: {
      key,
      resetAt: { gt: now },
      count: { lt: limit },
    },
    data: { count: { increment: 1 } },
  });

  if (incremented.count > 0) return true;

  // Check if currently blocked (active window at/over limit).
  const existing = await prisma.rateLimitAttempt.findUnique({ where: { key } });
  if (existing && existing.resetAt > now && existing.count >= limit) {
    return false;
  }

  // No record or window expired — start a fresh window.
  await prisma.rateLimitAttempt.upsert({
    where: { key },
    create: { key, count: 1, resetAt: new Date(now.getTime() + windowSecs * 1000) },
    update: { count: 1, resetAt: new Date(now.getTime() + windowSecs * 1000) },
  });

  // Fire-and-forget: delete expired entries to keep the table small.
  prisma.rateLimitAttempt.deleteMany({ where: { resetAt: { lt: now } } }).catch(() => {});

  return true;
}
