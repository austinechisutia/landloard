import { prisma } from '@/lib/prisma';
import { UnitStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeId = searchParams.get('typeId');
    const status = searchParams.get('status') as UnitStatus | null;

    const units = await prisma.unit.findMany({
      where: {
        ...(typeId ? { houseTypeId: parseInt(typeId) } : {}),
        ...(status ? { status } : {}),
      },
      include: { houseType: true },
      orderBy: { name: 'asc' },
    });
    return Response.json(units);
  } catch {
    return Response.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, houseTypeId, depositMonths } = await request.json();
    if (!name || !houseTypeId) {
      return Response.json({ error: 'name and houseTypeId are required' }, { status: 400 });
    }
    const unit = await prisma.unit.create({
      data: {
        name,
        houseTypeId:  parseInt(houseTypeId),
        depositMonths: depositMonths ? parseInt(depositMonths) : 1,
      },
      include: { houseType: true },
    });
    return Response.json(unit, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /units]', msg);
    return Response.json({ error: 'Failed to create unit', detail: msg }, { status: 500 });
  }
}
