import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { SESSION_COOKIE, signToken, type Session } from "@/lib/auth";
import { proxy } from "@/proxy";

const sessions: Record<Session["role"], Session> = {
  nurse: { userId: "nurse-1", role: "nurse", name: "Maria Lopez", agencyId: null },
  agency: { userId: "agency-a-admin", role: "agency", name: "Sunrise Health Staffing", agencyId: "agency-a" },
  admin: { userId: "admin-1", role: "admin", name: "Alex Kim", agencyId: null },
};

async function visit(path: string, role?: Session["role"]) {
  const headers = new Headers();
  if (role) headers.set("cookie", `${SESSION_COOKIE}=${await signToken(sessions[role])}`);
  const res = await proxy(new NextRequest(`http://localhost${path}`, { headers }));
  return { status: res.status, location: res.headers.get("location") };
}

describe("proxy", () => {
  it("redirects to /login without a session", async () => {
    expect(await visit("/admin/audit-log")).toEqual({
      status: 307,
      location: "http://localhost/login?next=%2Fadmin%2Faudit-log",
    });
  });

  it.each([
    ["/shifts", "nurse"],
    ["/credentials", "nurse"],
    ["/agency/shifts", "agency"],
    ["/admin", "admin"],
    ["/admin/timesheets", "admin"],
  ] as const)("lets %s through for a %s", async (path, role) => {
    const res = await visit(path, role);
    expect(res.location).toBeNull();
    expect(res.status).toBe(200);
  });

  it.each([
    ["/admin", "nurse", "/shifts"],
    ["/shifts", "agency", "/agency/shifts"],
    ["/agency/shifts", "admin", "/admin"],
    ["/credentials", "admin", "/admin"],
  ] as const)("sends %s for a %s to their home", async (path, role, home) => {
    expect(await visit(path, role)).toEqual({ status: 307, location: `http://localhost${home}` });
  });

  it("leaves unprotected paths alone", async () => {
    expect((await visit("/login")).location).toBeNull();
    expect((await visit("/shiftsabc")).location).toBeNull();
  });
});
