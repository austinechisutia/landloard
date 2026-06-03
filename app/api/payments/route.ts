import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { logAudit } from '@/lib/audit';
import { requireOrgId, requireOrgMutation } from '@/lib/current-user';

export async function GET(request: Request) {
  try {
    const { orgId } = await requireOrgId();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PaymentStatus | null;

    const payments = await prisma.payment.findMany({
      where: { organizationId: orgId, ...(status ? { status } : {}) },
      include: {
        tenant: true,
        unit: { include: { houseType: true } },
        services: { include: { service: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return Response.json(payments);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await requireOrgMutation(request);
    const { tenantId, unitId, period, rentAmount, dueDate, paymentDate, amountPaid, serviceCharges, customAmount } = await request.json();
    if (!tenantId || !unitId || !rentAmount || !dueDate) {
      return Response.json({ error: 'tenantId, unitId, rentAmount and dueDate are required' }, { status: 400 });
    }

    const charges: { serviceId: number; units?: number; amount: number }[] = serviceCharges ?? [];
    const servicesTotal = charges.reduce((sum: number, c: { amount: number }) => sum + Number(c.amount), 0);

    const rent    = Number(rentAmount);
    const custom  = Number(customAmount) || 0;
    const due     = rent + servicesTotal + custom;
    const paid    = Number(amountPaid) || 0;
    const balance = due - paid;
    const status: PaymentStatus = paid >= due ? 'PAID' : 'PENDING';

    let periodDate: Date | null = null;
    if (period) {
      const [yr, mo] = (period as string).split('-').map(Number);
      periodDate = new Date(Date.UTC(yr, mo - 1, 1));
    }

    const payment = await prisma.payment.create({
      data: {
        organizationId: orgId,
        userId,
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

    await logAudit({ userId, action: 'CREATE', entity: 'Payment', entityId: String(payment.id), detail: `Tenant ${payment.tenant.name}` });
    revalidateTag(`schedule:${orgId}`, {});
    return Response.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
