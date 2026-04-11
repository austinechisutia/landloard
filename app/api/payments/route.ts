import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PaymentStatus | null;

    const payments = await prisma.payment.findMany({
      where: status ? { status } : {},
      include: { tenant: true, unit: { include: { houseType: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return Response.json(payments);
  } catch {
    return Response.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, unitId, amountDue, amountPaid, dueDate, paymentDate } = await request.json();
    if (!tenantId || !unitId || !amountDue || !dueDate) {
      return Response.json({ error: 'tenantId, unitId, amountDue and dueDate are required' }, { status: 400 });
    }

    const due  = parseFloat(amountDue);
    const paid = parseFloat(amountPaid) || 0;
    const balance = due - paid;
    const status: PaymentStatus = paid >= due ? 'PAID' : 'PENDING';

    const payment = await prisma.payment.create({
      data: {
        tenantId: parseInt(tenantId),
        unitId:   parseInt(unitId),
        amountDue: due,
        amountPaid: paid,
        balance,
        status,
        dueDate: new Date(dueDate),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
      },
      include: { tenant: true, unit: { include: { houseType: true } } },
    });

    return Response.json(payment, { status: 201 });
  } catch {
    return Response.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
