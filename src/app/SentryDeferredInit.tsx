"use client";

export default function SentryDeferredInit() {
  // The public listings route is performance-critical, and the browser Sentry
  // package was still shipping feedback widget code even when those features
  // were disabled in config. We keep Sentry on the server and in platform
  // error reporting, but skip client boot on this path for the MVP.
  return null;
}
