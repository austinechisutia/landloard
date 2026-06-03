import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import {
  AUTH_NAME_MAX_LENGTH,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  isValidEmail,
  normalizeEmail,
} from '@/lib/auth-utils';
import { createEmailVerificationToken, getAppBaseUrl } from '@/lib/email-verification';
import { sendVerificationEmail, sendAlreadyRegisteredEmail } from '@/lib/mailer';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const allowed = await rateLimit(`register:${ip}`, 5, 60 * 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { email, password, name, country } = body as Record<string, unknown>;

    if (!email || !password || !name || !country) {
      return NextResponse.json({ error: 'Name, email, password, and country are required.' }, { status: 400 });
    }

    if (typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    if (typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid password.' }, { status: 400 });
    }

    if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${AUTH_PASSWORD_MIN_LENGTH} characters.` }, { status: 400 });
    }

    if (password.length > AUTH_PASSWORD_MAX_LENGTH) {
      return NextResponse.json({ error: `Password must be at most ${AUTH_PASSWORD_MAX_LENGTH} characters.` }, { status: 400 });
    }

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (name.length > AUTH_NAME_MAX_LENGTH) {
      return NextResponse.json({ error: `Name must be at most ${AUTH_NAME_MAX_LENGTH} characters.` }, { status: 400 });
    }
    if (typeof country !== 'string' || !country.trim()) {
      return NextResponse.json({ error: 'Country is required.' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing) {
      // Don't reveal whether the email is registered; handle silently.
      const baseUrl = getAppBaseUrl(req);
      try {
        if (!existing.emailVerified) {
          const { token } = await createEmailVerificationToken(normalizedEmail);
          const verifyUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
          await sendVerificationEmail(normalizedEmail, verifyUrl);
        } else {
          await sendAlreadyRegisteredEmail(normalizedEmail, `${baseUrl}/login`);
        }
      } catch (error) {
        console.error('[register:existing-email-notify]', error);
      }
      return NextResponse.json({ ok: true, email: normalizedEmail, verificationSent: true }, { status: 201 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: (name as string).trim(),
          email: normalizedEmail,
          passwordHash,
          country: (country as string).trim(),
        },
      });
      const org = await tx.organization.create({
        data: { name: (name as string).trim() },
      });
      await tx.orgMember.create({
        data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
      });
    });

    let verificationSent = false;

    try {
      const { token } = await createEmailVerificationToken(normalizedEmail);
      const verifyUrl = `${getAppBaseUrl(req)}/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
      await sendVerificationEmail(normalizedEmail, verifyUrl);
      verificationSent = true;
    } catch (error) {
      console.error('[register:sendVerificationEmail]', error);
    }

    return NextResponse.json({ ok: true, email: normalizedEmail, verificationSent }, { status: 201 });
  } catch (error) {
    console.error('[register]', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
