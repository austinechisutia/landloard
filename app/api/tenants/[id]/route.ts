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

    const ops: Parameters<typeof prisma.$transaction>[0] = [
      prisma.tenant.update({
        where: { id: parseInt(id) },
        data: {
          name,
          phone,
          houseTypeId: parseInt(houseTypeId),
          unitId: parseInt(unitId),
          moveInDate: new Date(moveInDate),
        },
        include: { houseType: true, unit: true },
      }),
    ];

    if (unitChanged) {
      ops.push(
        prisma.unit.update({ where: { id: existing.unitId },     data: { status: 'VACANT'   } }),
        prisma.unit.update({ where: { id: parseInt(unitId) },    data: { status: 'OCCUPIED' } }),
      );
    }

    const [tenant] = await prisma.$transaction(ops);
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

    await prisma.$transaction([
      prisma.tenant.delete({ where: { id: parseInt(id) } }),
      prisma.unit.update({
        where: { id: tenant.unitId },
        data: { status: 'VACANT' },
      }),
    ]);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}
