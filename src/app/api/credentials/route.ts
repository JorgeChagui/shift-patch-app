import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { credentialStatus } from "@/lib/credentials";
import { db } from "@/lib/db";
import { credentialTypeFromApi, credentialTypeToApi } from "@/lib/enums";
import { jsonError, parseWith } from "@/lib/http";
import {
  ALLOWED_CREDENTIAL_TYPES,
  MAX_CREDENTIAL_BYTES,
  signedCredentialUrl,
  uploadCredentialFile,
} from "@/lib/storage";
import { credentialUploadSchema } from "@/lib/validation";
import type { Credential } from "@/generated/prisma/client";

function toCredentialDto(credential: Credential) {
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

/** Nurses see their own credentials; admins see everyone's, with short-lived download URLs. */
export async function GET(request: Request) {
  const session = await requireRole(request, "nurse", "admin");
  if (session instanceof Response) return session;

  if (session.role === "nurse") {
    const credentials = await db.credential.findMany({
      where: { nurseId: session.userId },
      orderBy: { uploadedAt: "desc" },
    });
    return Response.json({ credentials: credentials.map(toCredentialDto) });
  }

  const credentials = await db.credential.findMany({
    include: { nurse: { select: { name: true } } },
    orderBy: [{ nurseId: "asc" }, { uploadedAt: "desc" }],
  });
  return Response.json({
    credentials: await Promise.all(
      credentials.map(async (credential) => ({
        ...toCredentialDto(credential),
        nurseName: credential.nurse.name,
        url: credential.fileKey ? await signedCredentialUrl(credential.fileKey) : null,
      })),
    ),
  });
}

/** Multipart upload: `file` (PDF/JPEG/PNG, max 5 MB), `expiresAt`, optional `type`. */
export async function POST(request: Request) {
  const session = await requireRole(request, "nurse");
  if (session instanceof Response) return session;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "Expected multipart/form-data");
  }

  const fields = parseWith(credentialUploadSchema, {
    expiresAt: form.get("expiresAt") ?? undefined,
    type: form.get("type") || undefined,
  });
  if (fields.error) return fields.error;

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return jsonError(400, "file: is required");
  if (!ALLOWED_CREDENTIAL_TYPES.includes(file.type)) {
    return jsonError(400, "file: must be a PDF, JPEG or PNG");
  }
  if (file.size > MAX_CREDENTIAL_BYTES) return jsonError(400, "file: must be 5 MB or smaller");

  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-100) || "credential";
  const fileKey = `${session.userId}/${randomUUID()}-${safeName}`;
  await uploadCredentialFile(fileKey, file);

  const credential = await db.$transaction(async (tx) => {
    const created = await tx.credential.create({
      data: {
        nurseId: session.userId,
        type: credentialTypeFromApi[fields.data.type],
        expiresAt: fields.data.expiresAt,
        fileKey,
        fileName: file.name,
      },
    });
    await writeAudit(tx, {
      actorId: session.userId,
      action: "credential.uploaded",
      entityType: "credential",
      entityId: created.id,
      metadata: { type: fields.data.type, expiresAt: fields.data.expiresAt },
    });
    return created;
  });

  return Response.json(toCredentialDto(credential), { status: 201 });
}
