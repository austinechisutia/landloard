import { prisma } from '@/lib/prisma';
import { requireOrgId } from '@/lib/current-user';

export async function GET(request: Request) {
  try {
    const { orgId } = await requireOrgId();
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get('tenantId');
    const tenantIdFilter = tenantIdParam ? { id: parseInt(tenantIdParam) } : {};

    const tenants = await prisma.tenant.findMany({
      where: { organizationId: orgId, ...tenantIdFilter },
      include: {
        houseType: true,
        unit: true,
        payments: {
          include: { services: { include: { service: true } } },
          orderBy: [{ paymentType: 'asc' }, { period: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const currentPeriod = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const schedule = tenants.map(tenant => {
      const rentAmount    = Number(tenant.houseType.rentAmount);
      const depositAmount = rentAmount * tenant.unit.depositMonths;
      const moveIn        = new Date(tenant.moveInDate);

      const rows: {
        type:          'DEPOSIT' | 'RENT';
        period:        string | null;
        monthIndex:    number;
        dueDate:       string;
        rentAmount:    number;
        servicesTotal: number;
        services:      { name: string; units: number | null; amount: number }[];
        amountDue:     number;
        amountPaid:    number;
        balance:       number;
        status:        string;
        paymentId:     number | null;
        paymentDate:   string | null;
      }[] = [];

      const depositPayment = tenant.payments.find(p => p.paymentType === 'DEPOSIT');
      rows.push({
        type:          'DEPOSIT',
        period:        null,
        monthIndex:    0,
        dueDate:       new Date(Date.UTC(moveIn.getUTCFullYear(), moveIn.getUTCMonth(), 10)).toISOString(),
        rentAmount:    0,
        servicesTotal: 0,
        services:      [],
        amountDue:     depositPayment ? Number(depositPayment.amountDue)  : depositAmount,
        amountPaid:    depositPayment ? Number(depositPayment.amountPaid) : 0,
        balance:       depositPayment ? Number(depositPayment.balance)    : depositAmount,
        status:        depositPayment ? depositPayment.status             : 'PENDING',
        paymentId:     depositPayment?.id    ?? null,
        paymentDate:   depositPayment?.paymentDate?.toISOString() ?? null,
      });

      let cur        = new Date(Date.UTC(moveIn.getUTCFullYear(), moveIn.getUTCMonth(), 1));
      let monthIndex = 1;

      while (cur <= currentPeriod) {
        const yr  = cur.getUTCFullYear();
        const mo  = cur.getUTCMonth();
        const key = `${yr}-${String(mo + 1).padStart(2, '0')}`;

        const payment = tenant.payments.find(p => {
          if (p.paymentType !== 'RENT' || !p.period) return false;
          const pd = new Date(p.period);
          return pd.getUTCFullYear() === yr && pd.getUTCMonth() === mo;
        });

        const svcTotal = payment
          ? payment.services.reduce((s, c) => s + Number(c.amount), 0)
          : 0;

        rows.push({
          type:          'RENT',
          period:        key,
          monthIndex,
          dueDate:       new Date(Date.UTC(yr, mo, 10)).toISOString(),
          rentAmount:    payment ? Number(payment.rentAmount) : rentAmount,
          servicesTotal: svcTotal,
          services:      payment
            ? payment.services.map(s => ({
                name:   s.service.name,
                units:  s.units !== null ? Number(s.units) : null,
                amount: Number(s.amount),
              }))
            : [],
          amountDue:     payment ? Number(payment.amountDue)  : rentAmount,
          amountPaid:    payment ? Number(payment.amountPaid) : 0,
          balance:       payment ? Number(payment.balance)    : rentAmount,
          status:        payment ? payment.status             : 'PENDING',
          paymentId:     payment?.id ?? null,
          paymentDate:   payment?.paymentDate?.toISOString() ?? null,
        });

        cur = new Date(Date.UTC(yr, mo + 1, 1));
        monthIndex++;
      }

      const totalDue     = rows.reduce((s, r) => s + r.amountDue,  0);
      const totalPaid    = rows.reduce((s, r) => s + r.amountPaid, 0);
      const totalBalance = rows.reduce((s, r) => s + r.balance,    0);

      return {
        id:            tenant.id,
        name:          tenant.name,
        unitId:        tenant.unitId,
        unitName:      tenant.unit.name,
        moveInDate:    tenant.moveInDate.toISOString(),
        rentAmount,
        depositMonths: tenant.unit.depositMonths,
        depositAmount,
        rows,
        totalDue,
        totalPaid,
        totalBalance,
      };
    });

    return Response.json(schedule);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return Response.json({ error: 'Failed to load payment schedule' }, { status: 500 });
  }
}
