import { prisma } from '@/lib/prisma';

function periodStart(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = parseInt(id);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { houseType: true, unit: true },
    });
    if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 });

    const rentAmount = Number(tenant.houseType.rentAmount);

    const payments = await prisma.payment.findMany({
      where: { tenantId },
      orderBy: [{ paymentType: 'asc' }, { period: 'asc' }, { dueDate: 'asc' }],
    });

    const deposit = payments.find(p => p.paymentType === 'DEPOSIT') ?? null;
    const rentPayments = payments.filter(p => p.paymentType === 'RENT');

    // Build monthly entries from move-in month to current month
    const moveIn = new Date(tenant.moveInDate);
    const now    = new Date();

    let cur = periodStart(moveIn.getFullYear(), moveIn.getMonth());
    const end = periodStart(now.getFullYear(), now.getMonth());

    const months: {
      period:          string;
      periodDate:      string;
      dueDate:         string;
      amountDue:       number;
      amountPaid:      number;
      status:          string;
      paymentId:       number | null;
      paymentDate:     string | null;
      effectiveDue:    number;
      effectiveBalance:number;
      effectiveStatus: string;
    }[] = [];

    while (cur <= end) {
      const yr = cur.getUTCFullYear();
      const mo = cur.getUTCMonth();

      const payment = rentPayments.find(p => {
        if (!p.period) return false;
        const pd = new Date(p.period);
        return pd.getUTCFullYear() === yr && pd.getUTCMonth() === mo;
      });

      months.push({
        period:           `${yr}-${String(mo + 1).padStart(2, '0')}`,
        periodDate:       cur.toISOString(),
        dueDate:          new Date(Date.UTC(yr, mo, 10)).toISOString(),
        amountDue:        rentAmount,
        amountPaid:       payment ? Number(payment.amountPaid) : 0,
        status:           payment ? payment.status : 'PENDING',
        paymentId:        payment?.id ?? null,
        paymentDate:      payment?.paymentDate?.toISOString() ?? null,
        effectiveDue:     rentAmount,
        effectiveBalance: rentAmount,
        effectiveStatus:  'PENDING',
      });

      cur = periodStart(yr, mo + 1);
    }

    // Compute carry-over chain
    let carryOver = 0;
    for (const m of months) {
      const totalAvailable = m.amountPaid + carryOver;
      if (totalAvailable >= m.amountDue) {
        m.effectiveDue     = Math.max(0, m.amountDue - carryOver);
        m.effectiveBalance = 0;
        m.effectiveStatus  = 'PAID';
        carryOver          = totalAvailable - m.amountDue;
      } else {
        m.effectiveDue     = Math.max(0, m.amountDue - carryOver);
        m.effectiveBalance = m.effectiveDue - m.amountPaid;
        m.effectiveStatus  = m.amountPaid > 0 ? 'PARTIAL' : 'PENDING';
        carryOver          = 0;
      }
    }

    const totalRentDue  = months.length * rentAmount;
    const totalRentPaid = months.reduce((s, m) => s + m.amountPaid, 0);
    const depositDue    = deposit ? Number(deposit.amountDue)  : rentAmount;
    const depositPaid   = deposit ? Number(deposit.amountPaid) : 0;

    return Response.json({
      tenant: {
        id:         tenant.id,
        name:       tenant.name,
        rentAmount,
        moveInDate: tenant.moveInDate,
        unit:       tenant.unit.name,
      },
      deposit: {
        id:          deposit?.id ?? null,
        amountDue:   depositDue,
        amountPaid:  depositPaid,
        balance:     depositDue - depositPaid,
        status:      deposit?.status ?? 'PENDING',
        paymentDate: deposit?.paymentDate?.toISOString() ?? null,
      },
      months,
      carryOver,
      summary: {
        totalDue:  depositDue + totalRentDue,
        totalPaid: depositPaid + totalRentPaid,
        totalBalance: (depositDue - depositPaid) + months.reduce((s, m) => s + m.effectiveBalance, 0),
      },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Failed to load ledger' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = parseInt(id);
    const { target, amount, paymentDate } = await request.json();
    // target: 'DEPOSIT' | 'YYYY-MM'

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { houseType: true },
    });
    if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 });

    const rentAmount = Number(tenant.houseType.rentAmount);
    const paid       = Number(amount);
    if (isNaN(paid) || paid <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const paidAt = paymentDate ? new Date(paymentDate) : new Date();

    if (target === 'DEPOSIT') {
      const existing = await prisma.payment.findFirst({
        where: { tenantId, paymentType: 'DEPOSIT' },
      });

      if (existing) {
        const prevPaid   = Number(existing.amountPaid);
        const due        = Number(existing.amountDue);
        const newPaid    = Math.min(due, prevPaid + paid);
        const newBalance = due - newPaid;
        const newStatus  = newBalance <= 0 ? 'PAID' : 'PENDING';
        const updated    = await prisma.payment.update({
          where: { id: existing.id },
          data: {
            amountPaid:  newPaid,
            balance:     newBalance,
            status:      newStatus,
            paymentDate: newStatus === 'PAID' ? paidAt : existing.paymentDate,
          },
        });
        return Response.json(updated);
      } else {
        // Create deposit record
        const newBalance = rentAmount - paid;
        const newStatus  = newBalance <= 0 ? 'PAID' : 'PENDING';
        const created    = await prisma.payment.create({
          data: {
            tenantId,
            unitId:      tenant.unitId ?? 0,
            paymentType: 'DEPOSIT',
            rentAmount:  0,
            amountDue:   rentAmount,
            amountPaid:  Math.min(rentAmount, paid),
            balance:     Math.max(0, newBalance),
            status:      newStatus,
            dueDate:     new Date(tenant.moveInDate),
            paymentDate: newStatus === 'PAID' ? paidAt : null,
          },
        });
        return Response.json(created, { status: 201 });
      }
    }

    // RENT for a specific period (YYYY-MM)
    const [yearStr, monthStr] = (target as string).split('-');
    const year  = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-based

    const periodDate = periodStart(year, month);
    const dueDateVal = new Date(Date.UTC(year, month, 10));

    const existing = await prisma.payment.findFirst({
      where: {
        tenantId,
        paymentType: 'RENT',
        period: periodDate,
      },
    });

    if (existing) {
      const prevPaid   = Number(existing.amountPaid);
      const due        = Number(existing.amountDue);
      const newPaid    = prevPaid + paid;   // can overpay — carry-over is computed in GET
      const newBalance = Math.max(0, due - newPaid);
      const newStatus  = newPaid >= due ? 'PAID' : 'PENDING';
      const updated    = await prisma.payment.update({
        where: { id: existing.id },
        data: {
          amountPaid:  newPaid,
          balance:     newBalance,
          status:      newStatus,
          paymentDate: paidAt,
        },
      });
      return Response.json(updated);
    } else {
      const newBalance = Math.max(0, rentAmount - paid);
      const newStatus  = paid >= rentAmount ? 'PAID' : 'PENDING';
      const created    = await prisma.payment.create({
        data: {
          tenantId,
          unitId:      tenant.unitId ?? 0,
          paymentType: 'RENT',
          period:      periodDate,
          rentAmount,
          amountDue:   rentAmount,
          amountPaid:  paid,
          balance:     newBalance,
          status:      newStatus,
          dueDate:     dueDateVal,
          paymentDate: paidAt,
        },
      });
      return Response.json(created, { status: 201 });
    }
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
