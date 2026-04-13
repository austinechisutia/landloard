import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/current-user';

export async function GET() {
  try {
    const userId = await requireUserId();
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalUnits,
      occupiedUnits,
      totalTenants,
      allTimeAgg,
      thisMonthAgg,
      pendingAgg,
      totalPayments,
    ] = await Promise.all([
      prisma.unit.count({ where: { userId } }),
      prisma.unit.count({ where: { userId, status: 'OCCUPIED' } }),
      prisma.tenant.count({ where: { userId } }),

      prisma.payment.aggregate({
        _sum: { amountPaid: true },
        where: { userId },
      }),

      prisma.payment.aggregate({
        _sum: { amountPaid: true },
        where: {
          userId,
          OR: [
            { paymentDate: { gte: monthStart, lt: monthEnd } },
            { paymentDate: null, createdAt: { gte: monthStart, lt: monthEnd } },
          ],
        },
      }),

      prisma.payment.aggregate({
        _sum: { balance: true },
        where: { userId, status: 'PENDING' },
      }),

      prisma.payment.count({ where: { userId } }),
    ]);

    return Response.json({
      totalUnits,
      occupiedUnits,
      vacantUnits:      totalUnits - occupiedUnits,
      totalTenants,
      totalPayments,
      totalRentPaid:    Number(allTimeAgg._sum.amountPaid   ?? 0),
      thisMonthRent:    Number(thisMonthAgg._sum.amountPaid ?? 0),
      totalPendingRent: Number(pendingAgg._sum.balance      ?? 0),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
