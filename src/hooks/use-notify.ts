"use client";

import { useContext } from "react";
import { NotificationContext } from "@/components/notifications/notification-provider";

/** Access to the page's notification banner. Must be used under NotificationProvider. */
export function useNotify() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotify must be used inside <NotificationProvider>");
  return context;
}
