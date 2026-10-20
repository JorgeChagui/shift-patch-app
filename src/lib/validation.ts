import { z } from "zod";
import { CANCELLATION_REASONS, CREDENTIAL_TYPES } from "@/lib/enums";

/** The first zod issue as "<field>: <message>", the API's 400 error text. */
export function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

/** A real calendar date in "YYYY-MM-DD" form (rejects 2026-02-30). */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
  .refine((value) => {
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }, "must be a valid date");

/** 24-hour "HH:mm", facility-local. */
export const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be HH:mm");

export const idParam = z.string().trim().min(1).max(100);

export const idParamsSchema = z.object({ id: idParam });
export const agencyParamsSchema = z.object({ agencyId: idParam });

export const loginSchema = z.object({
  // RFC 5321 caps an address at 254; bcrypt only reads 72 bytes, so longer passwords are noise.
  email: z.string().trim().toLowerCase().min(1, "is required").max(254),
  password: z.string().min(1, "is required").max(128),
});

export const shiftCreateSchema = z
  .object({
    role: z.string().trim().min(1, "is required").max(50),
    date: dateString,
    startTime: timeString,
    endTime: timeString,
  })
  .refine((shift) => shift.startTime !== shift.endTime, {
    message: "must differ from startTime",
    path: ["endTime"],
  });

export const cancelSchema = z.object({
  reason: z.enum(CANCELLATION_REASONS, { error: 'must be "no-show" or "advance"' }),
});

export const credentialUploadSchema = z.object({
  expiresAt: dateString,
  type: z.enum(CREDENTIAL_TYPES).default("license"),
});

export const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: idParam.optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ShiftCreateInput = z.infer<typeof shiftCreateSchema>;
export type CancelInput = z.infer<typeof cancelSchema>;
export type CredentialUploadInput = z.infer<typeof credentialUploadSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
