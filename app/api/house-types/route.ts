import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { requireUserId } from '@/lib/current-user';

export async function GET() {
  try {
    const userId = await requireUserId();
    const houseTypes = await prisma.houseType.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { units: true } } },
    });
    return Response.json(houseTypes);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to fetch house types' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const { name, rentAmount } = await request.json();
    if (!name || rentAmount == null) {
      return Response.json({ error: 'name and rentAmount are required' }, { status: 400 });
    }
    const houseType = await prisma.houseType.create({
      data: { name, rentAmount, userId },
    });
    await logAudit({ userId, action: 'CREATE', entity: 'HouseType', entityId: String(houseType.id), detail: houseType.name });
    return Response.json(houseType, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to create house type' }, { status: 500 });
  }
}
