import { type NextRequest } from 'next/server';
import { prisma } from './prisma';

export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function rateLimit(key: string, limit: number, windowSecs: number): Promise<boolean> {
  const now = new Date();
  const existing = await prisma.rateLimitAttempt.findUnique({ where: { key } });

  if (!existing || existing.resetAt < now) {
    await prisma.rateLimitAttempt.upsert({
      where: { key },
      create: { key, count: 1, resetAt: new Date(now.getTime() + windowSecs * 1000) },
      update: { count: 1, resetAt: new Date(now.getTime() + windowSecs * 1000) },
    });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  await prisma.rateLimitAttempt.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return true;
}
