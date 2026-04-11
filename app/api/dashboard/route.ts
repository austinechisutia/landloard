import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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
      prisma.unit.count(),
      prisma.unit.count({ where: { status: 'OCCUPIED' } }),
      prisma.tenant.count(),

      // All-time: every shilling ever paid
      prisma.payment.aggregate({ _sum: { amountPaid: true } }),

      // This month: payments received this month (by paymentDate, fallback to createdAt)
      prisma.payment.aggregate({
        _sum: { amountPaid: true },
        where: {
          OR: [
            { paymentDate: { gte: monthStart, lt: monthEnd } },
            { paymentDate: null, createdAt: { gte: monthStart, lt: monthEnd } },
          ],
        },
      }),

      // Pending: total outstanding balance
      prisma.payment.aggregate({
        _sum: { balance: true },
        where: { status: 'PENDING' },
      }),

      // Total payment records count
      prisma.payment.count(),
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
  } catch {
    return Response.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
