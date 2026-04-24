import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeEmail } from '@/lib/auth-utils';
import { getAppBaseUrl } from '@/lib/email-verification';
import { sendPasswordResetEmail } from '@/lib/mailer';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const allowed = await rateLimit(`forgot-password:${ip}`, 5, 60 * 60);
  if (!allowed) {
    return NextResponse.json({ success: true });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { email } = body as Record<string, unknown>;

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);

  const emailAllowed = await rateLimit(`forgot-password:email:${normalizedEmail}`, 3, 60 * 60);
  if (!emailAllowed) {
    return NextResponse.json({ success: true });
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ success: true });
  }

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expires,
    },
  });

  const resetUrl = `${getAppBaseUrl(req)}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail(normalizedEmail, resetUrl);
  } catch (error) {
    console.error('[forgot-password]', error);
  }

  return NextResponse.json({ success: true });
}
