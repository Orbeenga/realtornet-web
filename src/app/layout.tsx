import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import SentryDeferredInit from "./SentryDeferredInit";

export const metadata: Metadata = {
  metadataBase: new URL("https://realtornet-web.vercel.app"),
  title: {
    default: "RealtorNet",
    template: "%s | RealtorNet",
  },
  description: "Nigeria's trusted property marketplace.",
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
        <SentryDeferredInit />
      </body>
    </html>
  );
}
