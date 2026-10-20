"use client";

import { useEffect, useRef, useState } from "react";

export type StreamStatus = "connecting" | "open" | "failed";

// EventSource reconnects on its own after an error (the server closes the stream every ~55s),
// so one error isn't a failure. Give up after this many errors in a row without a message.
const MAX_CONSECUTIVE_ERRORS = 3;

/**
 * Subscribes to a server-sent event stream. `handlers` maps event names to callbacks.
 * Returns "failed" once the stream is closed or keeps erroring; the caller can fall back.
 */
export function useEventSource(url: string, handlers: Record<string, () => void>): StreamStatus {
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      queueMicrotask(() => setStatus("failed"));
      return;
    }
    const source = new EventSource(url);
    let errors = 0;

    const listeners = Object.keys(handlersRef.current).map((event) => {
      const listener = () => {
        errors = 0;
        setStatus("open");
        handlersRef.current[event]?.();
      };
      source.addEventListener(event, listener);
      return [event, listener] as const;
    });

    source.onerror = () => {
      errors += 1;
      if (source.readyState === EventSource.CLOSED || errors >= MAX_CONSECUTIVE_ERRORS) {
        source.close();
        setStatus("failed");
      }
    };

    return () => {
      for (const [event, listener] of listeners) source.removeEventListener(event, listener);
      source.close();
    };
  }, [url]);

  return status;
}
