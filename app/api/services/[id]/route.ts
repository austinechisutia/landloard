import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, type, unitPrice, unitLabel, active } = await request.json();
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
    return Response.json(service);
  } catch {
    return Response.json({ error: 'Failed to update service' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.service.delete({ where: { id: parseInt(id) } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Cannot delete service — it may be linked to existing payments' }, { status: 400 });
  }
}
