/**
 * Proxy header regression check (DEF-U-PROXY-EXPECT-HEADER-001): buildHeaders
 * strips hop-by-hop and undici-unsupported request headers (notably
 * `Expect: 100-continue`, which .NET HttpClient and curl send on POSTs and
 * undici rejects with NotSupportedError -> proxy 500) while preserving
 * end-to-end headers like authorization and content-type.
 *
 * Run: pnpm exec tsx "src/app/api/v1/[...path]/__tests__/proxy-headers.check.ts"
 */
import type { NextRequest } from "next/server";
import { buildHeaders } from "../route";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

function fakeRequest(entries: Array<[string, string]>): NextRequest {
  return { headers: new Headers(entries) } as unknown as NextRequest;
}

const stripped = buildHeaders(
  fakeRequest([
    ["Expect", "100-continue"],
    ["CONNECTION", "keep-alive"],
    ["Keep-Alive", "timeout=5"],
    ["Transfer-Encoding", "chunked"],
    ["Upgrade", "websocket"],
    ["Host", "127.0.0.1:3100"],
    ["Content-Length", "42"],
  ]),
);

for (const header of [
  "expect",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]) {
  assert(stripped.get(header) === null, `${header} is stripped (case-insensitive)`);
}

const preserved = buildHeaders(
  fakeRequest([
    ["Authorization", "Bearer test-token"],
    ["Content-Type", "application/json"],
    ["Accept", "application/json"],
    ["X-Custom-Header", "keep-me"],
    ["Expect", "100-continue"],
  ]),
);

assert(preserved.get("authorization") === "Bearer test-token", "authorization is preserved");
assert(preserved.get("content-type") === "application/json", "content-type is preserved");
assert(preserved.get("accept") === "application/json", "accept is preserved");
assert(preserved.get("x-custom-header") === "keep-me", "custom headers are preserved");
assert(preserved.get("expect") === null, "expect is stripped alongside preserved headers");

const empty = buildHeaders(fakeRequest([]));
assert([...empty.keys()].length === 0, "empty input yields empty output");

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exit(1);
}

console.log("proxy-headers check passed");
