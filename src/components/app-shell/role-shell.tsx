import { Suspense, type ReactNode } from "react";
import type { Role } from "@/generated/prisma/enums";
import { NotificationBanner } from "@/components/notification-banner";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { NAV } from "@/lib/nav";
import { BrandMark } from "./brand-mark";
import { MainNav } from "./main-nav";
import { UserMenu } from "./user-menu";

/**
 * The frame for every signed-in page: header (brand, role nav, user), the notification banner,
 * and the page. Static apart from UserMenu, so it's part of the prerendered shell.
 */
export function RoleShell({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <NotificationProvider>
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <BrandMark href={NAV[role][0].href} />
          <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
            <MainNav items={NAV[role]} />
          </div>
          <div className="ml-auto sm:ml-0">
            <Suspense fallback={<Skeleton className="h-10 w-40" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-6 sm:py-8">
        <NotificationBanner />
        {children}
      </main>
    </NotificationProvider>
  );
}
