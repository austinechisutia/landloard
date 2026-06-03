import { prisma } from '@/lib/prisma';
import { requireOrgIdForPage } from '@/lib/current-user';
import StatsCard from '@/components/StatsCard';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n: number) {
  return `KSh ${n.toLocaleString()}`;
}

export default async function DashboardPage() {
  const { orgId } = await requireOrgIdForPage();

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
    prisma.payment.aggregate({ _sum: { amountPaid: true }, where: { organizationId: orgId } }),
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
    prisma.payment.aggregate({ _sum: { balance: true }, where: { organizationId: orgId, status: 'PENDING' } }),
    prisma.payment.count({ where: { organizationId: orgId } }),
  ]);

  const monthLabel = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#11430F]">Dashboard</h1>
        <p className="mt-0.5 text-sm text-[#11430F]/60">Overview of your rental properties</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatsCard title="Total Units"    value={totalUnits}    color="blue"   />
        <StatsCard title="Occupied"       value={occupiedUnits} color="green"  />
        <StatsCard title="Vacant"         value={totalUnits - occupiedUnits} color="yellow" />
        <StatsCard title="Total Tenants"  value={totalTenants}  color="blue"   />
        <StatsCard title="Total Payments" value={totalPayments} color="blue"   />

        <StatsCard
          title="Rent Collected"
          value={fmt(Number(allTimeAgg._sum.amountPaid ?? 0))}
          sub={`${monthLabel}: ${fmt(Number(thisMonthAgg._sum.amountPaid ?? 0))}`}
          color="green"
        />

        <StatsCard
          title="Pending Rent"
          value={fmt(Number(pendingAgg._sum.balance ?? 0))}
          sub="Outstanding balance across all pending payments"
          color="red"
        />
      </div>
    </div>
  );
}
