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
    const { name, rentAmount } = await request.json();
    if (!name || rentAmount == null) {
      return Response.json({ error: 'name and rentAmount are required' }, { status: 400 });
    }

    const existing = await prisma.houseType.findFirst({ where: ownedOrLegacy(parseInt(id), userId) });
    if (!existing) return Response.json({ error: 'House type not found' }, { status: 404 });

    const houseType = await prisma.houseType.update({
      where: { id: parseInt(id) },
      data: { name, rentAmount },
    });
    await logAudit({ userId, action: 'UPDATE', entity: 'HouseType', entityId: String(houseType.id), detail: houseType.name });
    return Response.json(houseType);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to update house type' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.houseType.findFirst({ where: ownedOrLegacy(parseInt(id), userId) });
    if (!existing) return Response.json({ error: 'House type not found' }, { status: 404 });

    await prisma.houseType.delete({ where: { id: parseInt(id) } });
    await logAudit({ userId, action: 'DELETE', entity: 'HouseType', entityId: id, detail: existing.name });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Cannot delete: house type may have units or tenants assigned to it' }, { status: 400 });
  }
}
