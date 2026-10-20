"use client";

import { useEffect, useRef } from "react";

/** Calls `callback` every `intervalMs` while `enabled`. */
export function usePolling(callback: () => void, intervalMs: number, enabled: boolean) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => callbackRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
