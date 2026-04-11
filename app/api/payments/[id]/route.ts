import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { amountDue, amountPaid, dueDate, paymentDate, status: statusOverride } = await request.json();

    const due  = parseFloat(amountDue);
    const paid = parseFloat(amountPaid) || 0;
    const balance = due - paid;
    const status: PaymentStatus = statusOverride ?? (paid >= due ? 'PAID' : 'PENDING');

    const payment = await prisma.payment.update({
      where: { id: parseInt(id) },
      data: {
        amountDue: due,
        amountPaid: paid,
        balance,
        status,
        dueDate: new Date(dueDate),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
      },
      include: { tenant: true, unit: { include: { houseType: true } } },
    });

    return Response.json(payment);
  } catch {
    return Response.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.payment.delete({ where: { id: parseInt(id) } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
