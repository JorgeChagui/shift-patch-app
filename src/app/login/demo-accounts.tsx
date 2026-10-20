// The seeded accounts from the spec, so reviewers can sign in as each role.
const ACCOUNTS = [
  { role: "Nurse", name: "Maria Lopez", email: "maria.lopez@example.com", note: "current license" },
  { role: "Nurse", name: "James Cook", email: "james.cook@example.com", note: "license expired" },
  { role: "Agency", name: "Sunrise Health Staffing", email: "admin@sunrisehealth.example" },
  { role: "Agency", name: "Metro Care Partners", email: "admin@metrocare.example" },
  { role: "Admin", name: "Alex Kim", email: "alex.kim@example.com" },
];

export function DemoAccounts() {
  return (
    <details className="group rounded-lg border bg-surface px-4 py-3">
      <summary className="cursor-pointer font-bold text-brand-ink">Demo accounts</summary>
      <p className="mt-2 text-sm text-ink-muted">
        Every account uses the password <strong className="text-ink">Trial2026!</strong>
      </p>
      <dl className="mt-3 grid gap-2 text-sm">
        {ACCOUNTS.map((account) => (
          <div key={account.email}>
            <dt className="font-bold">
              {account.role}: {account.name}
              {account.note && <span className="font-normal text-ink-muted"> ({account.note})</span>}
            </dt>
            <dd className="break-all text-ink-muted select-all">{account.email}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
