import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { toCredentialDto, type CredentialDto } from "@/lib/dto";
import { signedCredentialUrl } from "@/lib/storage";

/** A nurse's own credentials, newest upload first. */
export async function listNurseCredentials(nurseId: string): Promise<CredentialDto[]> {
  "use cache";
  cacheLife("marketplace");
  cacheTag(TAGS.credentials(nurseId));

  const credentials = await db.credential.findMany({
    where: { nurseId },
    orderBy: { uploadedAt: "desc" },
  });
  return credentials.map(toCredentialDto);
}

export type AdminCredentialDto = CredentialDto & { nurseName: string; url: string | null };

/** Every nurse's credentials with short-lived download URLs. Not cached: the URLs expire. */
export async function listAllCredentials(): Promise<AdminCredentialDto[]> {
  const credentials = await db.credential.findMany({
    include: { nurse: { select: { name: true } } },
    orderBy: [{ nurseId: "asc" }, { uploadedAt: "desc" }],
  });
  return Promise.all(
    credentials.map(async (credential) => ({
      ...toCredentialDto(credential),
      nurseName: credential.nurse.name,
      url: credential.fileKey ? await signedCredentialUrl(credential.fileKey) : null,
    })),
  );
}
