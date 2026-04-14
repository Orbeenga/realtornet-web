"use client";

import { useEffect } from "react";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export default function SentryDeferredInit() {
  useEffect(() => {
    if (!SENTRY_DSN || process.env.NODE_ENV !== "production") {
      return;
    }

    let cancelled = false;

    const initializeSentry = async () => {
      const Sentry = await import("@sentry/nextjs");

      if (cancelled || Sentry.getClient()) {
        return;
      }

      Sentry.init({
        dsn: SENTRY_DSN,
        tracesSampleRate: 1,
        sendDefaultPii: true,
      });
    };

    void initializeSentry();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
