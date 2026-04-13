import { prisma } from '@/lib/prisma';
import { UnitStatus } from '@prisma/client';
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
    const { status, name, depositMonths } = await request.json();

    const existing = await prisma.unit.findFirst({ where: ownedOrLegacy(parseInt(id), userId) });
    if (!existing) return Response.json({ error: 'Unit not found' }, { status: 404 });

    const unit = await prisma.unit.update({
      where: { id: parseInt(id) },
      data: {
        ...(status       ? { status: status as UnitStatus } : {}),
        ...(name         ? { name }                         : {}),
        ...(depositMonths !== undefined ? { depositMonths: parseInt(depositMonths) } : {}),
      },
      include: { houseType: true },
    });
    await logAudit({ userId, action: 'UPDATE', entity: 'Unit', entityId: String(unit.id), detail: unit.name });
    return Response.json(unit);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to update unit' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.unit.findFirst({ where: ownedOrLegacy(parseInt(id), userId) });
    if (!existing) return Response.json({ error: 'Unit not found' }, { status: 404 });

    await prisma.unit.delete({ where: { id: parseInt(id) } });
    await logAudit({ userId, action: 'DELETE', entity: 'Unit', entityId: id, detail: existing.name });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to delete unit' }, { status: 500 });
  }
}
