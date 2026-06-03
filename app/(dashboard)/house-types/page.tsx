import { prisma } from '@/lib/prisma';
import { requireOrgIdForPage } from '@/lib/current-user';
import HouseTypesClient from './HouseTypesClient';

export default async function HouseTypesPage() {
  const { orgId } = await requireOrgIdForPage();
  const raw = await prisma.houseType.findMany({
    where:     { organizationId: orgId },
    orderBy:   { createdAt: 'asc' },
    include:   { _count: { select: { units: true } } },
  });
  const houseTypes = raw.map(t => ({ ...t, rentAmount: Number(t.rentAmount) }));
  return <HouseTypesClient initialTypes={houseTypes} />;
}
