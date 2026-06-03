import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

const MAX_BODY_BYTES = 100 * 1024; // 100 KB
const MUTATION_LIMIT = 500;        // requests per user per hour
const MUTATION_WINDOW = 60 * 60;

export async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// For protected API routes — throws a Response on failure
export async function requireUserId() {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return userId;
}

// For mutation API routes (POST/PATCH/DELETE) — checks body size, auth, and per-user rate limit
export async function requireMutation(request: Request): Promise<string> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    throw Response.json({ error: 'Request too large' }, { status: 413 });
  }
  const userId = await requireUserId();
  const allowed = await rateLimit(`mutation:${userId}`, MUTATION_LIMIT, MUTATION_WINDOW);
  if (!allowed) {
    throw Response.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }
  return userId;
}

async function resolveOrgId(userId: string): Promise<string> {
  const member = await prisma.orgMember.findFirst({
    where: { userId },
    select: { organizationId: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) {
    throw Response.json({ error: 'No organization found for this account' }, { status: 403 });
  }
  return member.organizationId;
}

// For org-scoped read routes
export async function requireOrgId(): Promise<{ userId: string; orgId: string }> {
  const userId = await requireUserId();
  const orgId = await resolveOrgId(userId);
  return { userId, orgId };
}

// For org-scoped mutation routes
export async function requireOrgMutation(request: Request): Promise<{ userId: string; orgId: string }> {
  const userId = await requireMutation(request);
  const orgId = await resolveOrgId(userId);
  return { userId, orgId };
}

// For admin API routes — throws a Response on auth or role failure
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    throw Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session.user.id;
}

// For protected server pages — redirects to /login on failure
export async function requireSession(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  return session!;
}

// For admin server pages — redirects on auth or role failure
export async function requireAdminSession(): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== 'ADMIN') redirect('/');
  return session;
}

// For org-scoped server pages — redirects to /login on failure
export async function requireOrgIdForPage(): Promise<{ userId: string; orgId: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;
  const member = await prisma.orgMember.findFirst({
    where:   { userId },
    select:  { organizationId: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/login');
  return { userId, orgId: member.organizationId };
}
