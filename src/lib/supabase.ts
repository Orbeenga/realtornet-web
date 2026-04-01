import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasValidSupabaseEnv =
  typeof configuredSupabaseUrl === "string" &&
  /^https?:\/\//.test(configuredSupabaseUrl) &&
  typeof configuredSupabaseAnonKey === "string" &&
  configuredSupabaseAnonKey.length > 0 &&
  configuredSupabaseAnonKey !== "your-supabase-anon-key-here";

const supabaseUrl = hasValidSupabaseEnv
  ? configuredSupabaseUrl
  : "https://example.supabase.co";
const supabaseAnonKey = hasValidSupabaseEnv
  ? configuredSupabaseAnonKey
  : "placeholder-anon-key";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured = hasValidSupabaseEnv;
