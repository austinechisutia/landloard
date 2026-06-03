import { prisma } from '@/lib/prisma';
import { requireOrgId } from '@/lib/current-user';

export async function GET() {
  try {
    const { orgId } = await requireOrgId();
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
      prisma.unit.count({ where: { organizationId: orgId } }),
      prisma.unit.count({ where: { organizationId: orgId, status: 'OCCUPIED' } }),
      prisma.tenant.count({ where: { organizationId: orgId } }),

      prisma.payment.aggregate({
        _sum: { amountPaid: true },
        where: { organizationId: orgId },
      }),

      prisma.payment.aggregate({
        _sum: { amountPaid: true },
        where: {
          organizationId: orgId,
          OR: [
            { paymentDate: { gte: monthStart, lt: monthEnd } },
            { paymentDate: null, createdAt: { gte: monthStart, lt: monthEnd } },
          ],
        },
      }),

      prisma.payment.aggregate({
        _sum: { balance: true },
        where: { organizationId: orgId, status: 'PENDING' },
      }),

      prisma.payment.count({ where: { organizationId: orgId } }),
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
