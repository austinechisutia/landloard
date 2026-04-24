import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createEmailVerificationToken, getAppBaseUrl } from '@/lib/email-verification';
import { isValidEmail, normalizeEmail } from '@/lib/auth-utils';
import { sendVerificationEmail } from '@/lib/mailer';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const ipAllowed = await rateLimit(`resend-verification:${ip}`, 5, 60 * 60);
  if (!ipAllowed) {
    return NextResponse.json({ success: true });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { email } = body as Record<string, unknown>;

  if (typeof email !== 'string' || !isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);
  const emailAllowed = await rateLimit(`resend-verification:email:${normalizedEmail}`, 3, 60 * 60);
  if (!emailAllowed) {
    return NextResponse.json({ success: true });
  }
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { emailVerified: true },
  });

  if (!user || user.emailVerified) {
    return NextResponse.json({ success: true });
  }

  try {
    const { token } = await createEmailVerificationToken(normalizedEmail);
    const verifyUrl = `${getAppBaseUrl(req)}/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
    await sendVerificationEmail(normalizedEmail, verifyUrl);
  } catch (error) {
    console.error('[resend-verification]', error);
    return NextResponse.json({ error: 'We could not send the verification email right now. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
