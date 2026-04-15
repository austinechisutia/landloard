import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { normalizeEmail } from '@/lib/auth-utils';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function getAppBaseUrl() {
  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

export async function createEmailVerificationToken(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  await prisma.verificationToken.deleteMany({
    where: { identifier: normalizedEmail },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token,
      expires,
    },
  });

  return { token, expires, email: normalizedEmail };
}

export async function verifyEmailToken(email: string, token: string) {
  const normalizedEmail = normalizeEmail(email);

  const record = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: normalizedEmail,
        token,
      },
    },
  });

  if (!record) {
    return { ok: false as const, reason: 'invalid' as const };
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    return { ok: false as const, reason: 'expired' as const };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, emailVerified: true },
  });

  if (!user) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    return { ok: false as const, reason: 'invalid' as const };
  }

  if (!user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  await prisma.verificationToken.deleteMany({
    where: { identifier: normalizedEmail },
  });

  return { ok: true as const };
}
