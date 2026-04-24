import { spawnSync } from "node:child_process";

const baseUrl = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "http://localhost:8000"
).replace(/\/$/, "");

const target = `${baseUrl}/api/v1/openapi.json`;
const runner = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  runner,
  ["exec", "openapi-typescript", target, "-o", "src/types/api.generated.ts"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
