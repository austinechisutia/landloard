import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { requireOrgId, requireOrgMutation } from '@/lib/current-user';

export async function GET() {
  try {
    const { orgId } = await requireOrgId();
    const services = await prisma.service.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    });
    return Response.json(services);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await requireOrgMutation(request);
    const { name, type, unitPrice, unitLabel } = await request.json();
    if (!name || !type || unitPrice == null) {
      return Response.json({ error: 'name, type and unitPrice are required' }, { status: 400 });
    }
    const service = await prisma.service.create({
      data: { organizationId: orgId, userId, name, type, unitPrice, unitLabel: unitLabel || null },
    });
    await logAudit({ userId, action: 'CREATE', entity: 'Service', entityId: String(service.id), detail: service.name });
    return Response.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
