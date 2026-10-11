import { prisma } from "@/infrastructure/database/prisma";
import { AuditActionType } from "@prisma/client";

export interface LogActionParams {
  actorId: string;
  actorRole?: string;
  actionType: AuditActionType;
  targetEntity: string;
  targetId?: string;
  oldState?: any;
  newState?: any;
  reasonCode?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export class AuditLogService {
  /**
   * Appends an immutable audit log record for critical administrative,
   * financial, and compliance operations.
   */
  static async logSystemAction(params: LogActionParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          actorRole: params.actorRole || "ADMIN",
          actionType: params.actionType,
          targetEntity: params.targetEntity,
          targetId: params.targetId,
          oldState: params.oldState ? JSON.parse(JSON.stringify(params.oldState)) : undefined,
          newState: params.newState ? JSON.parse(JSON.stringify(params.newState)) : undefined,
          reasonCode: params.reasonCode,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        },
      });
    } catch (error) {
      // In critical systems, audit logging should never crash the primary process,
      // but should be logged to the emergency error log.
      console.error("[CRITICAL: AuditLog Failed to Record]", error, params);
    }
  }

  /**
   * Fetches paginated audit logs for the Super Admin audit viewer
   */
  static async queryLogs({
    actionType,
    targetEntity,
    actorId,
    limit = 50,
  }: {
    actionType?: AuditActionType;
    targetEntity?: string;
    actorId?: string;
    limit?: number;
  }) {
    return await prisma.auditLog.findMany({
      where: {
        ...(actionType && { actionType }),
        ...(targetEntity && { targetEntity: { startsWith: targetEntity } }),
        ...(actorId && { actorId }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
