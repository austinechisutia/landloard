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
          select: {
            id: true, status: true, dueDate: true,
            rentAmount: true, amountDue: true, amountPaid: true, paymentDate: true,
            services: { select: { amount: true, service: { select: { name: true } } } },
          },
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
    const {
      name, phone, houseTypeId, unitId, moveInDate,
      idNumber, country, emergencyContact, emergencyPhone,
      householdCount, householdMembers,
    } = await request.json();
    if (!name || !phone || !houseTypeId || !unitId || !moveInDate) {
      return Response.json({ error: 'All fields are required' }, { status: 400 });
    }

    const houseType = await prisma.houseType.findUnique({ where: { id: parseInt(houseTypeId) } });
    if (!houseType) return Response.json({ error: 'House type not found' }, { status: 400 });

    const unit = await prisma.unit.findUnique({ where: { id: parseInt(unitId) } });
    if (!unit) return Response.json({ error: 'Unit not found' }, { status: 400 });

    const rentAmount    = Number(houseType.rentAmount);
    const depositAmount = rentAmount * unit.depositMonths;
    const moveIn        = new Date(moveInDate);

    const tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          name,
          phone,
          houseTypeId:      parseInt(houseTypeId),
          unitId:           parseInt(unitId),
          moveInDate:       moveIn,
          idNumber:         idNumber        || null,
          country:          country         || null,
          emergencyContact: emergencyContact || null,
          emergencyPhone:   emergencyPhone  || null,
          householdCount:   householdCount  ? parseInt(householdCount) : 1,
          householdMembers: householdMembers || null,
        },
        include: { houseType: true, unit: true },
      });

      await tx.unit.update({
        where: { id: parseInt(unitId) },
        data:  { status: 'OCCUPIED' },
      });

      // Auto-create deposit record using the unit's depositMonths setting
      await tx.payment.create({
        data: {
          tenantId:    created.id,
          unitId:      parseInt(unitId),
          paymentType: 'DEPOSIT',
          rentAmount:  0,
          amountDue:   depositAmount,
          amountPaid:  0,
          balance:     depositAmount,
          status:      'PENDING',
          dueDate:     moveIn,
        },
      });

      return created;
    });

    return Response.json(tenant, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: 'Failed to create tenant', detail: msg }, { status: 500 });
  }
}
