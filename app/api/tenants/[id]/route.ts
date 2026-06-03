import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { requireOrgMutation } from '@/lib/current-user';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await requireOrgMutation(request);
    const { id } = await params;
    const {
      name, phone, houseTypeId, unitId, moveInDate,
      idNumber, country, emergencyContact, emergencyPhone,
      householdCount, householdMembers,
    } = await request.json();

    const existing = await prisma.tenant.findFirst({ where: { id: parseInt(id), organizationId: orgId } });
    if (!existing) return Response.json({ error: 'Tenant not found' }, { status: 404 });

    const unitChanged   = parseInt(unitId) !== existing.unitId;
    const newMoveIn     = new Date(moveInDate);
    const moveInChanged = newMoveIn.getTime() !== new Date(existing.moveInDate).getTime();

    const tenant = await prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.update({
        where: { id: parseInt(id) },
        data: {
          name,
          phone,
          houseType:        { connect: { id: parseInt(houseTypeId) } },
          unit:             { connect: { id: parseInt(unitId) } },
          moveInDate:       newMoveIn,
          idNumber:         idNumber         !== undefined ? (idNumber         || null) : undefined,
          country:          country          !== undefined ? (country          || null) : undefined,
          emergencyContact: emergencyContact !== undefined ? (emergencyContact || null) : undefined,
          emergencyPhone:   emergencyPhone   !== undefined ? (emergencyPhone   || null) : undefined,
          householdCount:   householdCount   !== undefined ? Number(householdCount)     : undefined,
          householdMembers: householdMembers !== undefined ? (householdMembers || null) : undefined,
        },
        include: { houseType: true, unit: true },
      });
      if (unitChanged) {
        await tx.unit.update({ where: { id: existing.unitId   }, data: { status: 'VACANT'   } });
        await tx.unit.update({ where: { id: parseInt(unitId) }, data: { status: 'OCCUPIED' } });
      }
      if (moveInChanged) {
        const newDepositDue = new Date(Date.UTC(newMoveIn.getUTCFullYear(), newMoveIn.getUTCMonth(), 10));
        await tx.payment.updateMany({
          where: { tenantId: parseInt(id), paymentType: 'DEPOSIT' },
          data:  { dueDate: newDepositDue },
        });
        const newMoveInPeriodStart = new Date(Date.UTC(newMoveIn.getUTCFullYear(), newMoveIn.getUTCMonth(), 1));
        await tx.payment.deleteMany({
          where: { tenantId: parseInt(id), paymentType: 'RENT', period: { lt: newMoveInPeriodStart } },
        });
      }
      return updated;
    });

    await logAudit({ userId, action: 'UPDATE', entity: 'Tenant', entityId: String(tenant.id), detail: tenant.name });
    return Response.json(tenant);
  } catch (err) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PATCH /tenants/:id]', err);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await requireOrgMutation(request);
    const { id } = await params;
    const tenant = await prisma.tenant.findFirst({ where: { id: parseInt(id), organizationId: orgId } });
    if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.tenant.delete({ where: { id: parseInt(id) } });
      await tx.unit.update({ where: { id: tenant.unitId }, data: { status: 'VACANT' } });
    });

    await logAudit({ userId, action: 'DELETE', entity: 'Tenant', entityId: id, detail: tenant.name });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}
