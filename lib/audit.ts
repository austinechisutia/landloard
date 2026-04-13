import { prisma } from '@/lib/prisma';

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
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        detail: params.detail,
      },
    });
  } catch (error) {
    console.error('[audit]', error);
  }
}
