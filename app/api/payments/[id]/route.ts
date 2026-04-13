import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';
import { logAudit } from '@/lib/audit';
import { requireUserId } from '@/lib/current-user';

const ownedOrLegacy = (id: number, userId: string) => ({
  id,
  OR: [{ userId }, { userId: null }],
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { rentAmount, amountDue, amountPaid, dueDate, paymentDate, status: statusOverride, serviceCharges } = await request.json();

    const existing = await prisma.payment.findFirst({ where: ownedOrLegacy(parseInt(id), userId) });
    if (!existing) return Response.json({ error: 'Payment not found' }, { status: 404 });

    const charges: { serviceId: number; units?: number; amount: number }[] = serviceCharges ?? [];
    const servicesTotal = charges.reduce((sum, c) => sum + Number(c.amount), 0);

    const rent    = rentAmount != null ? Number(rentAmount) : null;
    const due     = amountDue  != null ? Number(amountDue)  : (rent != null ? rent + servicesTotal : null);
    const paid    = parseFloat(amountPaid) || 0;
    const balance = (due ?? 0) - paid;
    const status: PaymentStatus = statusOverride ?? (paid >= (due ?? 0) ? 'PAID' : 'PENDING');

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
    await logAudit({ userId, action: 'UPDATE', entity: 'Payment', entityId: String(payment.id), detail: `Tenant ${payment.tenant.name}` });
    return Response.json(payment);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await prisma.payment.findFirst({
      where: ownedOrLegacy(parseInt(id), userId),
      include: { tenant: true },
    });
    if (!existing) return Response.json({ error: 'Payment not found' }, { status: 404 });

    await prisma.payment.delete({ where: { id: parseInt(id) } });
    await logAudit({ userId, action: 'DELETE', entity: 'Payment', entityId: id, detail: `Tenant ${existing.tenant.name}` });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
