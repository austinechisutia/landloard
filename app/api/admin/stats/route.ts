import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/current-user';

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, loggedInToday, activeThisWeek, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: last24h } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: last7d } } }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return Response.json({ totalUsers, loggedInToday, activeThisWeek, users });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
