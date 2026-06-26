import { prisma } from '@omnimise/db';

interface AuditLogEntry {
  userId?: string | null;
  action: string;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        targetId: entry.targetId ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: entry.metadata ?? {},
      },
    });
  } catch (err) {
    // Never let audit logging break the main flow
    console.error('Audit log write failed:', err);
  }
}
