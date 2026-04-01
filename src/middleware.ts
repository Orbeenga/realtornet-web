import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasValidSupabaseEnv =
    typeof supabaseUrl === "string" &&
    /^https?:\/\//.test(supabaseUrl) &&
    typeof supabaseAnonKey === "string" &&
    supabaseAnonKey.length > 0 &&
    supabaseAnonKey !== "your-supabase-anon-key-here";

  if (!hasValidSupabaseEnv) {
    return res;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register");

  if (!session && !isAuthPage) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (session && isAuthPage) {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = "/properties";
    return NextResponse.redirect(homeUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/properties/:path*",
    "/agents/:path*",
    "/agencies/:path*",
    "/account/:path*",
    "/login",
    "/register",
  ],
};
