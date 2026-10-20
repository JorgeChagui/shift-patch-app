import type {
  AuditLog,
  Credential,
  Notification,
  Prisma,
  Timesheet,
} from "@/generated/prisma/client";
import { credentialStatus } from "@/lib/credential-status";
import { credentialTypeToApi, type ApiCredentialType } from "@/lib/enums";
import { shiftInclude, toShiftDto, type ShiftDto, type ShiftWithAgency } from "@/lib/shifts";

// Response shapes shared by route handlers, Server Actions and pages. Pure mappers only,
// so client components can import the types.

export type { ShiftDto };

export type AdminShiftDto = ShiftDto & { claimedByName: string | null };

export type AdminShiftsDto = {
  counts: { open: number; filled: number; cancelled: number; total: number };
  shifts: AdminShiftDto[];
};

export type CredentialDto = {
  id: string;
  nurseId: string;
  type: ApiCredentialType;
  fileName: string | null;
  expiresAt: string;
  uploadedAt: string;
  status: "valid" | "expired";
};

export function toCredentialDto(credential: Credential): CredentialDto {
  return {
    id: credential.id,
    nurseId: credential.nurseId,
    type: credentialTypeToApi[credential.type],
    fileName: credential.fileName,
    expiresAt: credential.expiresAt,
    uploadedAt: credential.uploadedAt.toISOString(),
    status: credentialStatus(credential.expiresAt),
  };
}

export const timesheetInclude = {
  shift: { include: shiftInclude },
  nurse: { select: { name: true } },
} satisfies Prisma.TimesheetInclude;

export type TimesheetDto = {
  id: string;
  shiftId: string;
  shift: ShiftDto;
  nurseId: string;
  nurseName: string;
  hours: number;
  status: Timesheet["status"];
  approvedAt: string | null;
};

export function toTimesheetDto(
  timesheet: Timesheet & { shift: ShiftWithAgency; nurse: { name: string } },
): TimesheetDto {
  return {
    id: timesheet.id,
    shiftId: timesheet.shiftId,
    shift: toShiftDto(timesheet.shift),
    nurseId: timesheet.nurseId,
    nurseName: timesheet.nurse.name,
    hours: timesheet.hours,
    status: timesheet.status,
    approvedAt: timesheet.approvedAt?.toISOString() ?? null,
  };
}

export type AuditEntryDto = {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  entityType: string;
  entityId: string;
  metadata: Prisma.JsonValue;
  createdAt: string;
};

export function toAuditEntryDto(row: AuditLog & { actor: { name: string } | null }): AuditEntryDto {
  return {
    id: row.id,
    action: row.action,
    actorId: row.actorId,
    actorName: row.actor?.name ?? null,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

export type AuditPageDto = { entries: AuditEntryDto[]; nextCursor: string | null };

export type NotificationDto = {
  id: string;
  message: string;
  kind: Notification["kind"];
  readAt: string | null;
  createdAt: string;
};

export function toNotificationDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    message: n.message,
    kind: n.kind,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}
