import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.redirect(new URL("/account/profile/", "https://realtornet-web.vercel.app"), 302);
}
