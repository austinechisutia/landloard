import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PaymentStatus | null;

    const payments = await prisma.payment.findMany({
      where: status ? { status } : {},
      include: {
        tenant: true,
        unit: { include: { houseType: true } },
        services: { include: { service: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return Response.json(payments);
  } catch {
    return Response.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, unitId, rentAmount, dueDate, paymentDate, amountPaid, serviceCharges } = await request.json();
    if (!tenantId || !unitId || !rentAmount || !dueDate) {
      return Response.json({ error: 'tenantId, unitId, rentAmount and dueDate are required' }, { status: 400 });
    }

    // serviceCharges: [{ serviceId, units?, amount }]
    const charges: { serviceId: number; units?: number; amount: number }[] = serviceCharges ?? [];
    const servicesTotal = charges.reduce((sum: number, c: { amount: number }) => sum + Number(c.amount), 0);

    const rent    = Number(rentAmount);
    const due     = rent + servicesTotal;
    const paid    = Number(amountPaid) || 0;
    const balance = due - paid;
    const status: PaymentStatus = paid >= due ? 'PAID' : 'PENDING';

    const payment = await prisma.payment.create({
      data: {
        tenantId:   parseInt(tenantId),
        unitId:     parseInt(unitId),
        rentAmount: rent,
        amountDue:  due,
        amountPaid: paid,
        balance,
        status,
        dueDate:     new Date(dueDate),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        services: {
          create: charges.map(c => ({
            serviceId: c.serviceId,
            units:     c.units ?? null,
            amount:    c.amount,
          })),
        },
      },
      include: {
        tenant: true,
        unit: { include: { houseType: true } },
        services: { include: { service: true } },
      },
    });

    return Response.json(payment, { status: 201 });
  } catch {
    return Response.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
