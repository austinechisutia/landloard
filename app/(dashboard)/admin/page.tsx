import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/');

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
