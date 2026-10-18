import Link from "next/link";

const links = [
  { href: "/login", label: "Login" },
  { href: "/shifts", label: "Nurse: open shifts" },
  { href: "/credentials", label: "Nurse: credentials" },
  { href: "/agency/shifts", label: "Agency: shifts" },
  { href: "/admin", label: "Admin: dashboard" },
  { href: "/admin/audit-log", label: "Admin: audit log" },
  { href: "/admin/timesheets", label: "Admin: timesheets" },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">ShiftPatch</h1>
      <p className="mt-2 text-zinc-600">Nursing shift marketplace.</p>
      <ul className="mt-6 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link className="text-blue-600 underline" href={l.href}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
