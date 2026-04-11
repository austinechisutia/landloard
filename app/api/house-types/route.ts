import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const houseTypes = await prisma.houseType.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { units: true } } },
    });
    return Response.json(houseTypes);
  } catch {
    return Response.json({ error: 'Failed to fetch house types' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, rentAmount } = await request.json();
    if (!name || rentAmount == null) {
      return Response.json({ error: 'name and rentAmount are required' }, { status: 400 });
    }
    const houseType = await prisma.houseType.create({
      data: { name, rentAmount },
    });
    return Response.json(houseType, { status: 201 });
  } catch {
    return Response.json({ error: 'Failed to create house type' }, { status: 500 });
  }
}
