import type { Role } from "@/generated/prisma/enums";

export type NavItem = { href: string; label: string };

/** Header navigation per role. The first item is the role's home (ROLE_HOME in auth.ts). */
export const NAV: Record<Role, NavItem[]> = {
  nurse: [
    { href: "/shifts", label: "Shifts" },
    { href: "/credentials", label: "Credentials" },
  ],
  agency: [
    { href: "/agency/shifts", label: "Shifts" },
    { href: "/agency/timesheets", label: "Timesheets" },
  ],
  admin: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/timesheets", label: "Timesheets" },
    { href: "/admin/audit-log", label: "Audit log" },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  nurse: "Nurse",
  agency: "Agency",
  admin: "Admin",
};
