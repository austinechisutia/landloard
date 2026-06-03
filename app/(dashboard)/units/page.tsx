import { prisma } from '@/lib/prisma';
import { requireOrgIdForPage } from '@/lib/current-user';
import UnitsClient from './UnitsClient';

export default async function UnitsPage() {
  const { orgId } = await requireOrgIdForPage();
  const [rawUnits, rawTypes] = await Promise.all([
    prisma.unit.findMany({
      where:   { organizationId: orgId },
      include: { houseType: true },
      orderBy: { name: 'asc' },
    }),
    prisma.houseType.findMany({
      where:   { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  const units = rawUnits.map(u => ({ ...u, houseType: { ...u.houseType, rentAmount: Number(u.houseType.rentAmount) } }));
  const types = rawTypes.map(t => ({ ...t, rentAmount: Number(t.rentAmount) }));
  return <UnitsClient initialUnits={units} initialTypes={types} />;
}
