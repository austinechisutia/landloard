import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { requireOrgId, requireOrgMutation } from '@/lib/current-user';

function periodStart(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireOrgId();
    const { id } = await params;
    const tenantId = parseInt(id);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { houseType: true, unit: true },
    });
    if (!tenant || tenant.organizationId !== orgId) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const rentAmount = Number(tenant.houseType.rentAmount);

    const payments = await prisma.payment.findMany({
      where: { tenantId, organizationId: orgId },
      include: { services: { include: { service: true } } },
      orderBy: [{ paymentType: 'asc' }, { period: 'asc' }, { dueDate: 'asc' }],
    });

    const entries = payments.map(p => {
      const servicesTotal = p.services.reduce((s, c) => s + Number(c.amount), 0);
      return {
        id:           p.id,
        paymentType:  p.paymentType,
        period:       p.period
          ? `${p.period.getUTCFullYear()}-${String(p.period.getUTCMonth() + 1).padStart(2, '0')}`
          : null,
        dueDate:      p.dueDate.toISOString(),
        paymentDate:  p.paymentDate?.toISOString() ?? null,
        rentAmount:   Number(p.rentAmount),
        servicesTotal,
        services:     p.services.map(s => ({
          name:   s.service.name,
          units:  s.units !== null ? Number(s.units) : null,
          amount: Number(s.amount),
        })),
        amountDue:  Number(p.amountDue),
        amountPaid: Number(p.amountPaid),
        balance:    Number(p.balance),
        status:     p.status,
      };
    });

    const totalDue     = entries.reduce((s, e) => s + e.amountDue, 0);
    const totalPaid    = entries.reduce((s, e) => s + e.amountPaid, 0);
    const totalBalance = entries.reduce((s, e) => s + e.balance, 0);

    return Response.json({
      tenant: {
        id:            tenant.id,
        name:          tenant.name,
        rentAmount,
        depositMonths: tenant.unit.depositMonths,
        depositAmount: rentAmount * tenant.unit.depositMonths,
        moveInDate:    tenant.moveInDate,
        unit:          tenant.unit.name,
      },
      entries,
      summary: { totalDue, totalPaid, totalBalance },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return Response.json({ error: 'Failed to load ledger' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await requireOrgMutation(request);
    const { id } = await params;
    const tenantId = parseInt(id);
    const { target, amount, paymentDate, customAmount } = await request.json();
    const custom = Number(customAmount) || 0;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { houseType: true },
    });
    if (!tenant || tenant.organizationId !== orgId) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const rentAmount = Number(tenant.houseType.rentAmount);
    const paid       = Number(amount);
    if (isNaN(paid) || paid <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const paidAt = paymentDate ? new Date(paymentDate) : new Date();

    if (target === 'DEPOSIT') {
      const existing = await prisma.payment.findFirst({
        where: { tenantId, paymentType: 'DEPOSIT', organizationId: orgId },
      });

      if (existing) {
        const prevPaid   = Number(existing.amountPaid);
        const due        = Number(existing.amountDue);
        const newPaid    = prevPaid + paid;
        const newBalance = due - newPaid;
        const newStatus: PaymentStatus = newBalance <= 0 ? 'PAID' : 'PENDING';
        const updated    = await prisma.payment.update({
          where: { id: existing.id },
          data: {
            amountPaid:  newPaid,
            balance:     newBalance,
            status:      newStatus,
            paymentDate: newStatus === 'PAID' ? paidAt : existing.paymentDate,
          },
        });
        revalidateTag(`schedule:${orgId}`, {});
        return Response.json(updated);
      } else {
        const newBalance = rentAmount - paid;
        const newStatus  = newBalance <= 0 ? 'PAID' : 'PENDING';
        const created    = await prisma.payment.create({
          data: {
            organizationId: orgId,
            userId,
            tenantId,
            unitId:      tenant.unitId ?? 0,
            paymentType: 'DEPOSIT',
            rentAmount:  0,
            amountDue:   rentAmount,
            amountPaid:  paid,
            balance:     newBalance,
            status:      newStatus,
            dueDate:     new Date(tenant.moveInDate),
            paymentDate: newStatus === 'PAID' ? paidAt : null,
          },
        });
        revalidateTag(`schedule:${orgId}`, {});
        return Response.json(created, { status: 201 });
      }
    }

    const [yearStr, monthStr] = (target as string).split('-');
    const year  = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;

    const targetPeriodDate = periodStart(year, month);

    const existingRentPayments = await prisma.payment.findMany({
      where: {
        tenantId,
        organizationId: orgId,
        paymentType: 'RENT',
        period: { lte: targetPeriodDate },
      },
      orderBy: { period: 'asc' },
    });

    const paymentByPeriod = new Map<string, typeof existingRentPayments[0]>();
    for (const p of existingRentPayments) {
      if (p.period) {
        const pd  = new Date(p.period);
        const key = `${pd.getUTCFullYear()}-${String(pd.getUTCMonth() + 1).padStart(2, '0')}`;
        paymentByPeriod.set(key, p);
      }
    }

    const moveIn = new Date(tenant.moveInDate);
    const periods: string[] = [];
    let cur = periodStart(moveIn.getUTCFullYear(), moveIn.getUTCMonth());
    while (cur <= targetPeriodDate) {
      const yr = cur.getUTCFullYear();
      const mo = cur.getUTCMonth();
      periods.push(`${yr}-${String(mo + 1).padStart(2, '0')}`);
      cur = periodStart(yr, mo + 1);
    }

    let remaining = paid;
    const targetKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    // Phase 1: compute distribution in JS (no DB calls needed)
    const updates: { id: number; data: { amountPaid: number; balance: number; status: PaymentStatus; paymentDate: Date } }[] = [];
    const creates: {
      organizationId: string; userId: string; tenantId: number; unitId: number;
      paymentType: 'RENT'; period: Date; rentAmount: number; amountDue: number;
      amountPaid: number; balance: number; status: PaymentStatus; dueDate: Date; paymentDate: Date;
    }[] = [];

    for (const periodKey of periods) {
      if (remaining <= 0) break;

      const [pYr, pMo] = periodKey.split('-').map(Number);
      const pPeriodDate = periodStart(pYr, pMo - 1);
      const pDueDate    = new Date(Date.UTC(pYr, pMo - 1, 10));
      const isTarget    = periodKey === targetKey;

      const pmt           = paymentByPeriod.get(periodKey);
      const currentPaid   = pmt ? Number(pmt.amountPaid) : 0;
      const baseAmountDue = pmt ? Number(pmt.amountDue) : rentAmount;
      const amountDue     = baseAmountDue + (isTarget ? custom : 0);
      const outstanding   = amountDue - currentPaid;

      if (outstanding <= 0 && !isTarget) continue;

      const toApply    = isTarget ? remaining : Math.min(remaining, outstanding);
      if (toApply <= 0) continue;

      const newPaid    = currentPaid + toApply;
      const newBalance = isTarget ? amountDue - newPaid : Math.max(0, amountDue - newPaid);
      const newStatus: PaymentStatus = newPaid >= amountDue ? 'PAID' : 'PENDING';

      if (pmt) {
        updates.push({ id: pmt.id, data: { amountPaid: newPaid, balance: newBalance, status: newStatus, paymentDate: paidAt } });
      } else {
        creates.push({
          organizationId: orgId,
          userId,
          tenantId,
          unitId:      tenant.unitId,
          paymentType: 'RENT',
          period:      pPeriodDate,
          rentAmount,
          amountDue,
          amountPaid:  toApply,
          balance:     newBalance,
          status:      newStatus,
          dueDate:     pDueDate,
          paymentDate: paidAt,
        });
      }

      remaining -= toApply;
    }

    // Phase 2: execute all in a single batched transaction
    await prisma.$transaction([
      ...updates.map(u => prisma.payment.update({ where: { id: u.id }, data: u.data })),
      ...(creates.length > 0 ? [prisma.payment.createMany({ data: creates })] : []),
    ]);

    revalidateTag(`schedule:${orgId}`, {});
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
