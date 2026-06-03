import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/current-user';

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    const skip  = (page - 1) * limit;

    const now     = new Date();
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
        take: limit,
        skip,
      }),
    ]);

    return Response.json({ totalUsers, loggedInToday, activeThisWeek, users, page, limit });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
