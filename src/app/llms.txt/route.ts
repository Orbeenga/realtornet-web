import { NextResponse } from "next/server";

export function GET() {
  const lines = [
    "# RealtorNet agent access policy",
    "User-agent: *",
    "Allow: /",
    "Disallow: /account/",
    "Disallow: /api/v1/",
    "",
    "# Discovery",
    "OpenAPI: https://realtornet-production.up.railway.app/api/v1/openapi.json",
    "Docs: https://realtornet-web.vercel.app/",
    "",
    "# Guidance",
    "Respect robots.txt and rate limits. Identify your agent via UA + contact URL.",
  ];

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
