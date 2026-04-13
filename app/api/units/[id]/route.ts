import { prisma } from '@/lib/prisma';
import { UnitStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, name, depositMonths } = body;

    const unit = await prisma.unit.update({
      where: { id: parseInt(id) },
      data: {
        ...(status       ? { status: status as UnitStatus } : {}),
        ...(name         ? { name }                         : {}),
        ...(depositMonths !== undefined ? { depositMonths: parseInt(depositMonths) } : {}),
      },
      include: { houseType: true },
    });
    return Response.json(unit);
  } catch {
    return Response.json({ error: 'Failed to update unit' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.unit.delete({ where: { id: parseInt(id) } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to delete unit' }, { status: 500 });
  }
}
