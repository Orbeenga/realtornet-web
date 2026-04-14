import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/Toast";
import SentryDeferredInit from "./SentryDeferredInit";

export const metadata: Metadata = {
  title: "RealtorNet",
  description: "Property listings platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="font-sans">
      <head>
        <link
          rel="preconnect"
          href="https://o4511180528091136.ingest.us.sentry.io"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Toaster />
        <SentryDeferredInit />
      </body>
    </html>
  );
}
