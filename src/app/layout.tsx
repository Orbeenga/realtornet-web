import type { Metadata, Viewport } from "next";
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
  other: {
    "color-scheme": "light dark",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="font-sans">
      <head>
        <link rel="preconnect" href="https://realtornet-production.up.railway.app" crossOrigin="" />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only fixed top-2 left-2 z-[1000] rounded bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
        >
          Skip to content
        </a>
        <Providers>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </Providers>
        <SentryDeferredInit />
      </body>
    </html>
  );
}
