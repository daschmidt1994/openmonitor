import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditLogEntry {
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Records sensitive actions (login, password change, token creation/revocation,
 * role changes, user deactivation, ...) for compliance/troubleshooting.
 * Never pass raw secrets (passwords, tokens) into `metadata`.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata as any,
        ipAddress: entry.ipAddress,
      },
    });
  }
}
