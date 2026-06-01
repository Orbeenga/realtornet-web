import { NextResponse } from "next/server";

export function GET() {
  const body = [
    "Contact: mailto:security@orbeenga.com",
    "Policy: https://realtornet-web.vercel.app/security/",
    "Preferred-Languages: en",
  ].join("\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
