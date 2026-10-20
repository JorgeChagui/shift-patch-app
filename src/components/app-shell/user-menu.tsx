import { ROLE_LABEL } from "@/lib/nav";
import { requireSession } from "@/lib/session";
import { LogoutButton } from "./logout-button";

/** Who's signed in, as which role, and the way out. Reads the session, so render it in Suspense. */
export async function UserMenu() {
  const session = await requireSession();
  return (
    <div className="flex items-center gap-3">
      <p className="text-right leading-tight">
        <span className="block font-bold text-ink">{session.name}</span>
        <span className="block text-sm text-ink-muted">{ROLE_LABEL[session.role]}</span>
      </p>
      <LogoutButton />
    </div>
  );
}
