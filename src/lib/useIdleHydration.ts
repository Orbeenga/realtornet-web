"use client";

import { useEffect, useState } from "react";

interface IdleHydrationOptions {
  delay?: number;
  timeout?: number;
}

export function useIdleHydration({
  delay = 0,
  timeout = 3_000,
}: IdleHydrationOptions = {}) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) {
      return;
    }

    let idleId: number | undefined;
    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(hydrate, { timeout });
      } else {
        hydrate();
      }
    }, delay);

    const hydrate = () => {
      if (cancelled) {
        return;
      }

      setHydrated(true);
    };

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);

      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [delay, hydrated, timeout]);

  return hydrated;
}
