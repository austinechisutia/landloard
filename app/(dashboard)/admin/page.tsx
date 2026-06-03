import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/current-user';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default async function AdminPage() {
  await requireAdminSession();

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);

  const [totalUsers, loggedInToday, activeThisWeek, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastLoginAt: { gte: last24h } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: last7d  } } }),
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true,
        role: true, lastLoginAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <AdminDashboard
      stats={{ totalUsers, loggedInToday, activeThisWeek, users }}
    />
  );
}
