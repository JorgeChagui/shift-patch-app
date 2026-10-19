import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@/generated/prisma/client";
import { ROLE_HOME, getSession } from "@/lib/auth";

// Gates UI routes by role before rendering. API routes are not matched: handlers return
// JSON 401/403 themselves (and never trust this layer).

const PROTECTED: { prefix: string; role: Role }[] = [
  { prefix: "/shifts", role: "nurse" },
  { prefix: "/credentials", role: "nurse" },
  { prefix: "/agency", role: "agency" },
  { prefix: "/admin", role: "admin" },
];

export function requiredRole(pathname: string): Role | null {
  const match = PROTECTED.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match?.role ?? null;
}

export async function proxy(request: NextRequest) {
  const role = requiredRole(request.nextUrl.pathname);
  if (!role) return NextResponse.next();

  const session = await getSession(request);
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  if (session.role !== role) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/shifts/:path*", "/credentials/:path*", "/agency/:path*", "/admin/:path*"],
};
