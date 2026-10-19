import type {
  CancellationReason,
  CredentialType,
} from "@/generated/prisma/client";

// Prisma enum members can't contain "-", so the schema maps them (e.g. noShow ↔ "no-show").
// The API always speaks the spec strings; convert at the boundary with these maps.

export const CANCELLATION_REASONS = ["no-show", "advance"] as const;
export type ApiCancellationReason = (typeof CANCELLATION_REASONS)[number];

export const cancellationReasonToApi: Record<CancellationReason, ApiCancellationReason> = {
  noShow: "no-show",
  advance: "advance",
};

export const cancellationReasonFromApi: Record<ApiCancellationReason, CancellationReason> = {
  "no-show": "noShow",
  advance: "advance",
};

export const CREDENTIAL_TYPES = ["license", "tb-test"] as const;
export type ApiCredentialType = (typeof CREDENTIAL_TYPES)[number];

export const credentialTypeToApi: Record<CredentialType, ApiCredentialType> = {
  license: "license",
  tbTest: "tb-test",
};

export const credentialTypeFromApi: Record<ApiCredentialType, CredentialType> = {
  license: "license",
  "tb-test": "tbTest",
};
