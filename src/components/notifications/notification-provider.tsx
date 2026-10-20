"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";

export type Notice = { kind: "success" | "error"; message: string; id: number };

type NotificationContextValue = {
  notice: Notice | null;
  notify: (kind: Notice["kind"], message: string) => void;
  dismiss: () => void;
};

export const NotificationContext = createContext<NotificationContextValue | null>(null);

/** Holds the one current banner message. A new message replaces the old; navigating clears it. */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<{ notice: Notice | null; pathname: string }>({
    notice: null,
    pathname,
  });

  const notify = useCallback(
    (kind: Notice["kind"], message: string) =>
      setState({ notice: { kind, message, id: Date.now() }, pathname }),
    [pathname],
  );
  const dismiss = useCallback(() => setState((s) => ({ ...s, notice: null })), []);

  // A notice belongs to the page it was raised on.
  const notice = state.pathname === pathname ? state.notice : null;
  const value = useMemo(() => ({ notice, notify, dismiss }), [notice, notify, dismiss]);

  return <NotificationContext value={value}>{children}</NotificationContext>;
}
