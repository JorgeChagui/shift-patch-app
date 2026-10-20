import "server-only";
import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import type { Session } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCredentialDto, type CredentialDto } from "@/lib/dto";
import { credentialTypeFromApi } from "@/lib/enums";
import { fail, ok, type ServiceResult } from "@/lib/result";
import { deleteCredentialFile, uploadCredentialFile } from "@/lib/storage";
import { ALLOWED_CREDENTIAL_TYPES, MAX_CREDENTIAL_BYTES, sniffCredentialType } from "@/lib/storage-config";
import type { CredentialUploadInput } from "@/lib/validation";

const MAX_FILE_NAME_LENGTH = 200;
const FILE_TYPE_ERROR = "file: must be a PDF, JPEG or PNG";

/**
 * Checks the uploaded file: present, at most 4 MB, and a PDF/JPEG/PNG by both its declared type
 * and its first bytes, so a renamed or relabelled file is rejected. Returns the sniffed type.
 */
async function validateFile(file: FormDataEntryValue | null): Promise<ServiceResult<{ file: File; contentType: string }>> {
  if (!(file instanceof File) || file.size === 0) return fail(400, "file: is required");
  if (!ALLOWED_CREDENTIAL_TYPES.includes(file.type)) return fail(400, FILE_TYPE_ERROR);
  if (file.size > MAX_CREDENTIAL_BYTES) return fail(400, "file: must be 4 MB or smaller");
  const contentType = sniffCredentialType(new Uint8Array(await file.slice(0, 8).arrayBuffer()));
  if (!contentType) return fail(400, FILE_TYPE_ERROR);
  return ok({ file, contentType });
}

/** A nurse uploads a credential file with its expiry date; the file goes to private storage. */
export async function uploadCredential(
  actor: Session,
  fields: CredentialUploadInput,
  upload: FormDataEntryValue | null,
): Promise<ServiceResult<CredentialDto>> {
  const checked = await validateFile(upload);
  if (!checked.ok) return checked;
  const { file, contentType } = checked.data;

  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-100) || "credential";
  const fileKey = `${actor.userId}/${randomUUID()}-${safeName}`;
  await uploadCredentialFile(fileKey, file, contentType);

  const credential = await db.$transaction(async (tx) => {
    const created = await tx.credential.create({
      data: {
        nurseId: actor.userId,
        type: credentialTypeFromApi[fields.type],
        expiresAt: fields.expiresAt,
        fileKey,
        fileName: file.name.slice(0, MAX_FILE_NAME_LENGTH),
      },
    });
    await writeAudit(tx, {
      actorId: actor.userId,
      action: "credential.uploaded",
      entityType: "credential",
      entityId: created.id,
      metadata: { type: fields.type, expiresAt: fields.expiresAt },
    });
    return created;
  }).catch(async (error: unknown) => {
    // Don't leave an orphaned file behind; the original error is the one worth reporting.
    await deleteCredentialFile(fileKey).catch(() => {});
    throw error;
  });

  return ok(toCredentialDto(credential));
}
