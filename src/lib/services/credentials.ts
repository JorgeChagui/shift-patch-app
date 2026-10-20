import "server-only";
import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import type { Session } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCredentialDto, type CredentialDto } from "@/lib/dto";
import { credentialTypeFromApi } from "@/lib/enums";
import { fail, ok, type ServiceResult } from "@/lib/result";
import { ALLOWED_CREDENTIAL_TYPES, MAX_CREDENTIAL_BYTES, uploadCredentialFile } from "@/lib/storage";
import type { CredentialUploadInput } from "@/lib/validation";

/** Checks the uploaded file: present, PDF/JPEG/PNG, at most 5 MB. */
function validateFile(file: FormDataEntryValue | null): ServiceResult<File> {
  if (!(file instanceof File) || file.size === 0) return fail(400, "file: is required");
  if (!ALLOWED_CREDENTIAL_TYPES.includes(file.type)) return fail(400, "file: must be a PDF, JPEG or PNG");
  if (file.size > MAX_CREDENTIAL_BYTES) return fail(400, "file: must be 5 MB or smaller");
  return ok(file);
}

/** A nurse uploads a credential file with its expiry date; the file goes to private storage. */
export async function uploadCredential(
  actor: Session,
  fields: CredentialUploadInput,
  upload: FormDataEntryValue | null,
): Promise<ServiceResult<CredentialDto>> {
  const checked = validateFile(upload);
  if (!checked.ok) return checked;
  const file = checked.data;

  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-100) || "credential";
  const fileKey = `${actor.userId}/${randomUUID()}-${safeName}`;
  await uploadCredentialFile(fileKey, file);

  const credential = await db.$transaction(async (tx) => {
    const created = await tx.credential.create({
      data: {
        nurseId: actor.userId,
        type: credentialTypeFromApi[fields.type],
        expiresAt: fields.expiresAt,
        fileKey,
        fileName: file.name,
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
  });

  return ok(toCredentialDto(credential));
}
