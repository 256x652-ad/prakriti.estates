import { prisma } from "@/infrastructure/database/prisma";
import { AuditSyncStatus } from "@prisma/client";

export interface ChecklistItemSyncDTO {
  itemId: string;
  label: string;
  passed: boolean;
  notes?: string;
  timestamp: string;
}

export interface MeasurementSyncDTO {
  area: string;
  dimension: string;
  deflectionMm?: number;
  remarks?: string;
  timestamp: string;
}

export interface AuditSyncPayload {
  auditId: string;
  consultantId: string;
  clientVersion: number;
  clientUpdatedAt: string; // ISO 8601
  status: AuditSyncStatus;
  score?: number;
  findings?: string;
  checklist?: ChecklistItemSyncDTO[];
  measurements?: MeasurementSyncDTO[];
  mediaUrls?: string[];
}

export interface SyncResult {
  status: "SYNCHRONIZED" | "CONFLICT_DETECTED";
  currentServerVersion: number;
  data?: any;
  conflictDetails?: {
    reason: string;
    serverVersion: number;
    clientVersion: number;
    serverUpdatedAt: string;
    serverState: any;
  };
}

export class AuditSyncService {
  /**
   * Performs an atomic offline sync with optimistic concurrency conflict detection.
   */
  async syncAudit(payload: AuditSyncPayload): Promise<SyncResult> {
    const { auditId, consultantId, clientVersion, clientUpdatedAt } = payload;

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current audit state from database
      const currentAudit = await tx.propertyAudit.findUnique({
        where: { id: auditId },
      });

      if (!currentAudit) {
        throw new Error("AUDIT_NOT_FOUND");
      }

      // Ensure only the assigned consultant (or admin) can sync
      if (currentAudit.consultantId !== consultantId) {
        throw new Error("UNAUTHORIZED_AUDIT_SYNC");
      }

      // 2. CONFLICT RESOLUTION LOGIC
      // If client is attempting to sync a draft based on an older version
      if (clientVersion < currentAudit.version) {
        console.warn(
          `[AuditSync Conflict] Client version ${clientVersion} < Server version ${currentAudit.version} for audit ${auditId}`
        );
        return {
          status: "CONFLICT_DETECTED",
          currentServerVersion: currentAudit.version,
          conflictDetails: {
            reason: "Client version is stale. Server has already been updated.",
            serverVersion: currentAudit.version,
            clientVersion: clientVersion,
            serverUpdatedAt: currentAudit.updatedAt.toISOString(),
            serverState: {
              findings: currentAudit.findings,
              score: currentAudit.score,
              status: currentAudit.syncStatus,
              checklist: currentAudit.checklist,
              measurements: currentAudit.measurements,
              mediaUrls: currentAudit.mediaUrls,
            },
          },
        };
      }

      // 3. MERGE LOGIC FOR CHECKLIST & MEASUREMENTS
      // Merge incoming items by itemId to preserve offline updates without overwriting untouched fields
      const existingChecklist = (currentAudit.checklist as unknown as ChecklistItemSyncDTO[]) || [];
      const incomingChecklist = payload.checklist || [];
      
      const mergedChecklistMap = new Map<string, ChecklistItemSyncDTO>();
      existingChecklist.forEach((item) => mergedChecklistMap.set(item.itemId, item));
      incomingChecklist.forEach((item) => mergedChecklistMap.set(item.itemId, item));
      const mergedChecklist = Array.from(mergedChecklistMap.values());

      // Merge media URLs (deduplicated array)
      const existingMedia = currentAudit.mediaUrls || [];
      const incomingMedia = payload.mediaUrls || [];
      const mergedMediaUrls = Array.from(new Set([...existingMedia, ...incomingMedia]));

      // 4. APPLY UPDATE & INCREMENT VERSION
      const nextVersion = currentAudit.version + 1;
      const updatedAudit = await tx.propertyAudit.update({
        where: { id: auditId },
        data: {
          version: nextVersion,
          syncStatus: payload.status,
          score: payload.score ?? currentAudit.score,
          findings: payload.findings ?? currentAudit.findings,
          checklist: mergedChecklist as any,
          measurements: (payload.measurements || currentAudit.measurements) as any,
          mediaUrls: mergedMediaUrls,
          clientUpdatedAt: new Date(clientUpdatedAt),
        },
      });

      return {
        status: "SYNCHRONIZED",
        currentServerVersion: nextVersion,
        data: {
          auditId: updatedAudit.id,
          version: updatedAudit.version,
          syncStatus: updatedAudit.syncStatus,
          updatedAt: updatedAudit.updatedAt.toISOString(),
          checklistCount: mergedChecklist.length,
          mediaCount: mergedMediaUrls.length,
        },
      };
    });
  }
}
