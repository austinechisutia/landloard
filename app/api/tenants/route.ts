import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        houseType: true,
        unit: { include: { houseType: true } },
        payments: {
          orderBy: { dueDate: 'desc' },
          take: 1,
          select: { id: true, status: true, dueDate: true, amountDue: true, amountPaid: true, paymentDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return Response.json(tenants);
  } catch {
    return Response.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, phone, houseTypeId, unitId, moveInDate } = await request.json();
    if (!name || !phone || !houseTypeId || !unitId || !moveInDate) {
      return Response.json({ error: 'All fields are required' }, { status: 400 });
    }

    const [tenant] = await prisma.$transaction([
      prisma.tenant.create({
        data: {
          name,
          phone,
          houseTypeId: parseInt(houseTypeId),
          unitId: parseInt(unitId),
          moveInDate: new Date(moveInDate),
        },
        include: { houseType: true, unit: true },
      }),
      prisma.unit.update({
        where: { id: parseInt(unitId) },
        data: { status: 'OCCUPIED' },
      }),
    ]);

    return Response.json(tenant, { status: 201 });
  } catch {
    return Response.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}
