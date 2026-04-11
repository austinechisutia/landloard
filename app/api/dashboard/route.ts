import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [totalUnits, occupiedUnits, paidAgg, pendingAgg] = await Promise.all([
      prisma.unit.count(),
      prisma.unit.count({ where: { status: 'OCCUPIED' } }),
      prisma.payment.aggregate({
        _sum: { amountPaid: true },
        where: { status: 'PAID' },
      }),
      prisma.payment.aggregate({
        _sum: { balance: true },
        where: { status: 'PENDING' },
      }),
    ]);

    return Response.json({
      totalUnits,
      occupiedUnits,
      vacantUnits: totalUnits - occupiedUnits,
      totalRentPaid: Number(paidAgg._sum.amountPaid ?? 0),
      totalPendingRent: Number(pendingAgg._sum.balance ?? 0),
    });
  } catch {
    return Response.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
