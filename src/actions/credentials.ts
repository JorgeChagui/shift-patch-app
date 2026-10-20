"use server";

import { defineAction } from "@/lib/actions";
import { MUTATION_TAGS } from "@/lib/cache-tags";
import { uploadCredential } from "@/lib/services/credentials";
import { credentialUploadSchema } from "@/lib/validation";

export const uploadCredentialAction = defineAction({
  roles: ["nurse"],
  schema: credentialUploadSchema,
  run: (session, fields, formData) => uploadCredential(session, fields, formData.get("file")),
  tags: (session) => MUTATION_TAGS.uploadCredential(session.userId),
  success: "Credential uploaded",
});
