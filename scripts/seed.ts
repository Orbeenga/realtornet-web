import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const file = readFileSync(envPath, "utf8");

  for (const line of file.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const TEST_EMAIL = process.env.SEED_EMAIL!;
const TEST_PASSWORD = process.env.SEED_PASSWORD!;

async function seed() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error("Missing SEED_EMAIL or SEED_PASSWORD in the environment.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log("Logging in...");
  const {
    data: { session },
    error,
  } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error || !session) {
    console.error("Login failed:", error?.message);
    process.exit(1);
  }

  const token = session.access_token;
  console.log("Logged in as:", session.user.email);
  console.log("Token (first 20 chars):", token?.slice(0, 20));

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };

  console.log("\nFetching property types...");
  const typesRes = await fetch(`${API_URL}/api/v1/property-types/`, { headers });
  const types = await typesRes.json();
  console.log("Property types:", JSON.stringify(types, null, 2));

  console.log("\nFetching locations...");
  const locsRes = await fetch(`${API_URL}/api/v1/locations/`, { headers });
  const locations = await locsRes.json();
  console.log("Locations:", JSON.stringify(locations, null, 2));

  console.log("\nFetching current user profile...");
  const meRes = await fetch(`${API_URL}/api/v1/users/me`, { headers });
  const me = await meRes.json();
  console.log("Current user:", JSON.stringify(me, null, 2));

  console.log("\n--- SEED DATA DISCOVERY COMPLETE ---");
  console.log("Use the above IDs to construct property inserts.");
  console.log("Re-run with SEED_MODE=insert after reviewing the output.");

  if (process.env.SEED_MODE === "inspect") {
    console.log("\nFetching properties schema...");
    const propsRes = await fetch(`${API_URL}/api/v1/properties/`, { headers });
    const props = await propsRes.json();
    console.log("Properties response:", JSON.stringify(props, null, 2));

    const specRes = await fetch(`${API_URL}/api/v1/openapi.json`);
    const spec = await specRes.json();
    const postSchema = spec?.paths?.["/api/v1/properties/"]?.post?.requestBody;
    console.log("\nPOST /api/v1/properties/ request body schema:");
    console.log(JSON.stringify(postSchema, null, 2));
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
