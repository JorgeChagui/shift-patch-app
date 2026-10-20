import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listCredentials, POST as uploadCredential } from "@/app/api/credentials/route";
import { POST as claim } from "@/app/api/shifts/[id]/claim/route";
import { db } from "@/lib/db";
import { ctx, latestAudit, login, req, resetDb } from "./helpers";

vi.mock("@/lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage")>()),
  uploadCredentialFile: vi.fn(async () => {}),
  signedCredentialUrl: vi.fn(async (key: string) => `https://storage.test/signed/${key}`),
}));
const storage = await import("@/lib/storage");

beforeEach(async () => {
  vi.mocked(storage.uploadCredentialFile).mockClear();
  await resetDb();
});
afterAll(() => db.$disconnect());

function form(fields: { file?: File; expiresAt?: string; type?: string }) {
  const data = new FormData();
  if (fields.file) data.set("file", fields.file);
  if (fields.expiresAt) data.set("expiresAt", fields.expiresAt);
  if (fields.type) data.set("type", fields.type);
  return data;
}

const pdf = () => new File(["%PDF-1.4 test"], "license.pdf", { type: "application/pdf" });
const upload = async (token: string | undefined, body: FormData) =>
  uploadCredential(req("/api/credentials", { method: "POST", token, body }));

describe("POST /api/credentials", () => {
  it("stores the file and creates a license credential", async () => {
    const res = await upload(await login("james"), form({ file: pdf(), expiresAt: "2027-06-30" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toStrictEqual({
      id: expect.any(String),
      nurseId: "nurse-2",
      type: "license",
      fileName: "license.pdf",
      expiresAt: "2027-06-30",
      uploadedAt: expect.any(String),
      status: "valid",
    });

    const [key, , contentType] = vi.mocked(storage.uploadCredentialFile).mock.calls[0];
    expect(key).toMatch(/^nurse-2\/[\w-]+-license\.pdf$/);
    expect(contentType).toBe("application/pdf");
    expect(await db.credential.findUnique({ where: { id: body.id } })).toMatchObject({ fileKey: key });
    expect(await latestAudit()).toMatchObject({ action: "credential.uploaded", actorId: "nurse-2", entityId: body.id });
  });

  it("accepts a TB test", async () => {
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "tb.png", { type: "image/png" });
    const res = await upload(await login("maria"), form({ file: png, expiresAt: "2027-01-01", type: "tb-test" }));
    expect(await res.json()).toMatchObject({ type: "tb-test" });
  });

  it("lets James claim after uploading a future-dated license", async () => {
    const token = await login("james");
    await upload(token, form({ file: pdf(), expiresAt: "2027-06-30" }));
    const res = await claim(req("/api/shifts/shift-1/claim", { method: "POST", token }), ctx({ id: "shift-1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "filled", claimedBy: "nurse-2" });
  });

  it.each([
    ["a disallowed file type", { file: new File(["x"], "a.txt", { type: "text/plain" }), expiresAt: "2027-01-01" }],
    ["a missing file", { expiresAt: "2027-01-01" }],
    ["a missing expiry", { file: pdf() }],
    ["an invalid expiry", { file: pdf(), expiresAt: "2027-13-01" }],
    ["an unknown type", { file: pdf(), expiresAt: "2027-01-01", type: "passport" }],
  ])("returns 400 for %s", async (_, fields) => {
    const res = await upload(await login("maria"), form(fields));
    expect(res.status).toBe(400);
    expect(await res.json()).toStrictEqual({ error: expect.any(String) });
    expect(storage.uploadCredentialFile).not.toHaveBeenCalled();
  });

  it("returns 400 for a file over 4 MB", async () => {
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.pdf", { type: "application/pdf" });
    expect((await upload(await login("maria"), form({ file: big, expiresAt: "2027-01-01" }))).status).toBe(400);
  });

  it("returns 403 for agencies and admins, 401 without a token", async () => {
    const body = () => form({ file: pdf(), expiresAt: "2027-01-01" });
    expect((await upload(await login("agencyA"), body())).status).toBe(403);
    expect((await upload(await login("admin"), body())).status).toBe(403);
    expect((await upload(undefined, body())).status).toBe(401);
  });
});

describe("GET /api/credentials", () => {
  it("shows a nurse their own credentials with computed status", async () => {
    const res = await listCredentials(req("/api/credentials", { token: await login("james") }));
    expect(await res.json()).toStrictEqual({
      credentials: [
        {
          id: "credential-nurse-2-license",
          nurseId: "nurse-2",
          type: "license",
          fileName: null,
          expiresAt: "2026-06-01",
          uploadedAt: expect.any(String),
          status: "expired",
        },
      ],
    });
  });

  it("shows an admin everyone's credentials with signed URLs", async () => {
    await upload(await login("maria"), form({ file: pdf(), expiresAt: "2027-06-30" }));
    const res = await listCredentials(req("/api/credentials", { token: await login("admin") }));
    const { credentials } = await res.json();
    expect(credentials).toHaveLength(3);
    expect(credentials.map((c: { nurseName: string }) => c.nurseName)).toEqual(["Maria Lopez", "Maria Lopez", "James Cook"]);
    expect(credentials[0].url).toMatch(/^https:\/\/storage\.test\/signed\/nurse-1\//);
    expect(credentials[2]).toMatchObject({ status: "expired", url: null });
  });

  it("returns 403 for agencies, 401 without a token", async () => {
    expect((await listCredentials(req("/api/credentials", { token: await login("agencyA") }))).status).toBe(403);
    expect((await listCredentials(req("/api/credentials"))).status).toBe(401);
  });
});
