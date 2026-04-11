import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, rentAmount } = await request.json();
    if (!name || rentAmount == null) {
      return Response.json({ error: 'name and rentAmount are required' }, { status: 400 });
    }
    const houseType = await prisma.houseType.update({
      where: { id: parseInt(id) },
      data: { name, rentAmount },
    });
    return Response.json(houseType);
  } catch {
    return Response.json({ error: 'Failed to update house type' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.houseType.delete({ where: { id: parseInt(id) } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Cannot delete: house type may have units or tenants assigned to it' }, { status: 400 });
  }
}
