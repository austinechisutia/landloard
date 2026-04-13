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
    const { tenantId, unitId, period, rentAmount, dueDate, paymentDate, amountPaid, serviceCharges, customAmount } = await request.json();
    if (!tenantId || !unitId || !rentAmount || !dueDate) {
      return Response.json({ error: 'tenantId, unitId, rentAmount and dueDate are required' }, { status: 400 });
    }

    // serviceCharges: [{ serviceId, units?, amount }]
    const charges: { serviceId: number; units?: number; amount: number }[] = serviceCharges ?? [];
    const servicesTotal = charges.reduce((sum: number, c: { amount: number }) => sum + Number(c.amount), 0);

    const rent    = Number(rentAmount);
    const custom  = Number(customAmount) || 0;
    const due     = rent + servicesTotal + custom;
    const paid    = Number(amountPaid) || 0;
    const balance = due - paid;
    const status: PaymentStatus = paid >= due ? 'PAID' : 'PENDING';

    // Parse period 'YYYY-MM' into a UTC date for the period column
    let periodDate: Date | null = null;
    if (period) {
      const [yr, mo] = (period as string).split('-').map(Number);
      periodDate = new Date(Date.UTC(yr, mo - 1, 1));
    }

    const payment = await prisma.payment.create({
      data: {
        tenantId:    parseInt(tenantId),
        unitId:      parseInt(unitId),
        paymentType: 'RENT',
        period:      periodDate,
        rentAmount:  rent,
        amountDue:   due,
        amountPaid:  paid,
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
