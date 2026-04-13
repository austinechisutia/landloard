import { prisma } from '@/lib/prisma';
import { UnitStatus } from '@prisma/client';
import { logAudit } from '@/lib/audit';
import { requireUserId } from '@/lib/current-user';

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const typeId = searchParams.get('typeId');
    const status = searchParams.get('status') as UnitStatus | null;

    const units = await prisma.unit.findMany({
      where: {
        userId,
        ...(typeId ? { houseTypeId: parseInt(typeId) } : {}),
        ...(status ? { status } : {}),
      },
      include: { houseType: true },
      orderBy: { name: 'asc' },
    });
    return Response.json(units);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const { name, houseTypeId, depositMonths } = await request.json();
    if (!name || !houseTypeId) {
      return Response.json({ error: 'name and houseTypeId are required' }, { status: 400 });
    }

    const houseType = await prisma.houseType.findFirst({
      where: { id: parseInt(houseTypeId), OR: [{ userId }, { userId: null }] },
    });
    if (!houseType) {
      return Response.json({ error: 'House type not found' }, { status: 404 });
    }

    const unit = await prisma.unit.create({
      data: {
        userId,
        name,
        houseTypeId:  parseInt(houseTypeId),
        depositMonths: depositMonths ? parseInt(depositMonths) : 1,
      },
      include: { houseType: true },
    });
    await logAudit({ userId, action: 'CREATE', entity: 'Unit', entityId: String(unit.id), detail: unit.name });
    return Response.json(unit, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /units]', msg);
    return Response.json({ error: 'Failed to create unit', detail: msg }, { status: 500 });
  }
}
