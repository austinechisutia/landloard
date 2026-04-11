import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { rentAmount, amountDue, amountPaid, dueDate, paymentDate, status: statusOverride, serviceCharges } = await request.json();

    // Recalculate totals server-side so all sections stay consistent
    const charges: { serviceId: number; units?: number; amount: number }[] = serviceCharges ?? [];
    const servicesTotal = charges.reduce((sum, c) => sum + Number(c.amount), 0);

    const rent    = rentAmount != null ? Number(rentAmount) : null;
    const due     = amountDue  != null ? Number(amountDue)  : (rent != null ? rent + servicesTotal : null);
    const paid    = parseFloat(amountPaid) || 0;
    const balance = (due ?? 0) - paid;
    const status: PaymentStatus = statusOverride ?? (paid >= (due ?? 0) ? 'PAID' : 'PENDING');

    // If serviceCharges were provided, replace existing charges
    const servicesUpdate = serviceCharges != null ? {
      services: {
        deleteMany: {},
        create: charges.map(c => ({
          serviceId: c.serviceId,
          units:     c.units ?? null,
          amount:    c.amount,
        })),
      },
    } : {};

    const payment = await prisma.payment.update({
      where: { id: parseInt(id) },
      data: {
        ...(rent  != null && { rentAmount: rent }),
        ...(due   != null && { amountDue: due }),
        amountPaid: paid,
        balance,
        status,
        dueDate:     new Date(dueDate),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        ...servicesUpdate,
      },
      include: {
        tenant: true,
        unit: { include: { houseType: true } },
        services: { include: { service: true } },
      },
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
