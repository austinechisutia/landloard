import { prisma } from '@/lib/prisma';
import { requireOrgIdForPage } from '@/lib/current-user';
import TenantsClient from './TenantsClient';

export default async function TenantsPage() {
  const { orgId } = await requireOrgIdForPage();
  const [rawTenants, rawTypes] = await Promise.all([
    prisma.tenant.findMany({
      where:   { organizationId: orgId },
      include: {
        houseType: true,
        unit: { include: { houseType: true } },
        payments: {
          orderBy: { dueDate: 'desc' },
          take: 1,
          select: {
            id: true, status: true, dueDate: true,
            rentAmount: true, amountDue: true, amountPaid: true, paymentDate: true,
            services: { select: { amount: true, service: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.houseType.findMany({
      where:   { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  const tenants = rawTenants.map(t => ({
    ...t,
    moveInDate: t.moveInDate.toISOString(),
    houseType:  { ...t.houseType,  rentAmount: Number(t.houseType.rentAmount) },
    unit:       { ...t.unit, houseType: { ...t.unit.houseType, rentAmount: Number(t.unit.houseType.rentAmount) } },
  }));
  const types = rawTypes.map(t => ({ ...t, rentAmount: Number(t.rentAmount) }));
  return <TenantsClient initialTenants={tenants} initialTypes={types} />;
}
