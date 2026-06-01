import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account",
          "/account/*",
          "/account/admin",
          "/account/admin/*",
        ],
      },
    ],
    sitemap: "https://realtornet-web.vercel.app/sitemap.xml",
  };
}
