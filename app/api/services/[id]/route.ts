import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { requireUserId } from '@/lib/current-user';

const ownedOrLegacy = (id: number, userId: string) => ({
  id,
  OR: [{ userId }, { userId: null }],
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { name, type, unitPrice, unitLabel, active } = await request.json();

    const existing = await prisma.service.findFirst({ where: ownedOrLegacy(parseInt(id), userId) });
    if (!existing) return Response.json({ error: 'Service not found' }, { status: 404 });

    const service = await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        ...(name       !== undefined && { name }),
        ...(type       !== undefined && { type }),
        ...(unitPrice  !== undefined && { unitPrice }),
        ...(unitLabel  !== undefined && { unitLabel: unitLabel || null }),
        ...(active     !== undefined && { active }),
      },
    });
    await logAudit({ userId, action: 'UPDATE', entity: 'Service', entityId: String(service.id), detail: service.name });
    return Response.json(service);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to update service' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.service.findFirst({ where: ownedOrLegacy(parseInt(id), userId) });
    if (!existing) return Response.json({ error: 'Service not found' }, { status: 404 });

    await prisma.service.delete({ where: { id: parseInt(id) } });
    await logAudit({ userId, action: 'DELETE', entity: 'Service', entityId: id, detail: existing.name });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Cannot delete service — it may be linked to existing payments' }, { status: 400 });
  }
}
