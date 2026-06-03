import { prisma } from '@/lib/prisma';

const AUDIT_RETENTION_DAYS = 90;

export async function logAudit(params: {
  userId: string | null | undefined;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId: string;
  detail?: string;
}) {
  if (!params.userId) return;

  try {
    await prisma.auditLog.create({
      data: {
        userId:   params.userId,
        action:   params.action,
        entity:   params.entity,
        entityId: params.entityId,
        detail:   params.detail,
      },
    });
  } catch (error) {
    console.error('[audit]', error);
  }

  // Fire-and-forget: prune entries older than AUDIT_RETENTION_DAYS.
  // Runs ~1% of the time to avoid a DB write on every mutation.
  if (Math.random() < 0.01) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - AUDIT_RETENTION_DAYS);
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {});
  }
}
