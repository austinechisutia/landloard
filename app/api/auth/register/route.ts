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

export async function POST(req: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { email, password, name } = body as Record<string, unknown>;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
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

    if (name != null && (typeof name !== 'string' || name.length > AUTH_NAME_MAX_LENGTH)) {
      return NextResponse.json({ error: `Name must be at most ${AUTH_NAME_MAX_LENGTH} characters.` }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name: typeof name === 'string' ? name : undefined,
        email: normalizedEmail,
        passwordHash,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('[register]', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
