import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://realtornet-web.vercel.app";

  const urls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/properties/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/agencies/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/agencies/apply/`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/agents/`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/login/`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/register/`, changeFrequency: "yearly", priority: 0.2 },
  ];

  return urls;
}
