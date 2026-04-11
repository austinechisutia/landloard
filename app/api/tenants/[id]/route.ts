import { prisma } from '@/lib/prisma';

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
