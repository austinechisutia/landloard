import { prisma } from '@/lib/prisma';
import { requireOrgIdForPage } from '@/lib/current-user';
import ServicesClient from './ServicesClient';

export default async function ServicesPage() {
  const { orgId } = await requireOrgIdForPage();
  const raw = await prisma.service.findMany({
    where:   { organizationId: orgId },
    orderBy: { createdAt: 'asc' },
  });
  const services = raw.map(s => ({ ...s, unitPrice: Number(s.unitPrice) }));
  return <ServicesClient initialServices={services} />;
}
