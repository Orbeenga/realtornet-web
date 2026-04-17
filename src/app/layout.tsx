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
      <body>
        <Providers>{children}</Providers>
        <Toaster />
        <SentryDeferredInit />
      </body>
    </html>
  );
}
