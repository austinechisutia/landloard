import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, phone, houseTypeId, unitId, moveInDate } = await request.json();

    const existing = await prisma.tenant.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const unitChanged = parseInt(unitId) !== existing.unitId;

    const tenant = await prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.update({
        where: { id: parseInt(id) },
        data: {
          name,
          phone,
          houseTypeId: parseInt(houseTypeId),
          unitId:      parseInt(unitId),
          moveInDate:  new Date(moveInDate),
        },
        include: { houseType: true, unit: true },
      });
      if (unitChanged) {
        await tx.unit.update({ where: { id: existing.unitId   }, data: { status: 'VACANT'   } });
        await tx.unit.update({ where: { id: parseInt(unitId) }, data: { status: 'OCCUPIED' } });
      }
      return updated;
    });

    return Response.json(tenant);
  } catch {
    return Response.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({ where: { id: parseInt(id) } });
    if (!tenant) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.tenant.delete({ where: { id: parseInt(id) } });
      await tx.unit.update({ where: { id: tenant.unitId }, data: { status: 'VACANT' } });
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}
