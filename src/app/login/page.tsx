import type { Metadata } from "next";
import { NotificationBanner } from "@/components/notification-banner";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { BrandPanel } from "./brand-panel";
import { DemoAccounts } from "./demo-accounts";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/** Fully static: no session or request data is read here; the form posts to loginAction. */
export default function LoginPage() {
  return (
    <NotificationProvider>
      <main className="grid flex-1 lg:grid-cols-[1.15fr_1fr]">
        <BrandPanel />
        <div className="flex items-center justify-center px-4 py-10 sm:px-10">
          <div className="w-full max-w-sm space-y-6">
            <div>
              <h2 className="text-2xl">Sign in</h2>
              <p className="mt-1 text-ink-muted">Nurses, agencies and admins all sign in here.</p>
            </div>
            <NotificationBanner />
            <LoginForm />
            <DemoAccounts />
          </div>
        </div>
      </main>
    </NotificationProvider>
  );
}
