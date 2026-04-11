import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [totalUnits, occupiedUnits, totalTenants, allTimeAgg, thisMonthAgg, pendingAgg] = await Promise.all([
      prisma.unit.count(),
      prisma.unit.count({ where: { status: 'OCCUPIED' } }),
      prisma.tenant.count(),
      // All-time: sum every rand actually paid across all payments
      prisma.payment.aggregate({ _sum: { amountPaid: true } }),
      // This month: payments whose dueDate falls in the current month
      prisma.payment.aggregate({
        _sum: { amountPaid: true },
        where: { dueDate: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.payment.aggregate({
        _sum: { balance: true },
        where: { status: 'PENDING' },
      }),
    ]);

    return Response.json({
      totalUnits,
      occupiedUnits,
      vacantUnits:      totalUnits - occupiedUnits,
      totalTenants,
      totalRentPaid:    Number(allTimeAgg._sum.amountPaid   ?? 0),
      thisMonthRent:    Number(thisMonthAgg._sum.amountPaid ?? 0),
      totalPendingRent: Number(pendingAgg._sum.balance      ?? 0),
    });
  } catch {
    return Response.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
