import { redirect } from 'next/navigation';
import type { AuditLog } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/current-user';

export default async function AccountPage() {
  const session = await requireSession();

  const [user, auditLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        accounts: { select: { provider: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);

  if (!user) {
    redirect('/login');
  }

  const providerNames = [...new Set((user.accounts as { provider: string }[]).map((account) => account.provider))];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#11430F]">My Account</h1>
        <p className="mt-0.5 text-sm text-[#11430F]/60">View your profile and recent edits in the system.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.75rem] border border-[#11430F]/10 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e4f386]/50 text-xl font-bold text-[#11430F]">
              {user.image ? (
                <img src={user.image} alt={user.name ?? ''} className="h-16 w-16 rounded-full object-cover" />
              ) : (
                (user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user.name ?? 'Unnamed user'}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-[#11430F]/8 pb-3">
              <dt className="text-gray-500">Account ID</dt>
              <dd className="font-medium text-gray-900">{user.id}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-[#11430F]/8 pb-3">
              <dt className="text-gray-500">Signed up</dt>
              <dd className="font-medium text-gray-900">{new Date(user.createdAt).toLocaleString()}</dd>
            </div>
            <div className="flex items-center justify-between pb-1">
              <dt className="text-gray-500">Sign-in methods</dt>
              <dd className="font-medium text-gray-900">{providerNames.length ? providerNames.join(', ') : 'Credentials'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[1.75rem] border border-[#11430F]/10 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent activity</h2>
            <p className="text-sm text-gray-500">The latest changes made from your account.</p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="rounded-xl bg-[#f7f2e9] px-4 py-8 text-center text-sm text-[#11430F]/60">No edits recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {(auditLogs as AuditLog[]).map((log) => (
                <div key={log.id} className="rounded-xl border border-[#11430F]/8 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{log.action} {log.entity}</p>
                      <p className="text-xs text-gray-500">Record ID: {log.entityId}{log.detail ? ` • ${log.detail}` : ''}</p>
                    </div>
                    <time className="shrink-0 text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
