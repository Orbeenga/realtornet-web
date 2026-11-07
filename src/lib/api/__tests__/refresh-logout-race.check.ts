/**
 * Logout-refresh race regression check: a silent refresh that resolves AFTER
 * logout (or after a newer login) must discard its result instead of
 * persisting, so it can neither resurrect a cleared session nor overwrite a
 * newer login's tokens. See DEF-U-LOGOUT-REFRESH-RACE-001.
 *
 * Run: pnpm exec tsx src/lib/api/__tests__/refresh-logout-race.check.ts
 */
import {
  AuthError,
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  invalidatePendingTokenPersists,
  persistAuthTokens,
  refreshAccessToken,
} from "../client";

const store = new Map<string, string>();

function resetStore() {
  store.clear();
}

function installMemoryStorage() {
  const memoryStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: memoryStorage,
  };
}

interface MockResponse {
  ok: boolean;
  status: number;
  body: unknown;
}

function installGatedFetch() {
  let release: ((response: MockResponse) => void) | null = null;
  const gate = new Promise<MockResponse>((resolve) => {
    release = resolve;
  });
  const mockedFetch = async (input: string) => {
    if (!String(input).endsWith("/api/v1/auth/refresh")) {
      throw new Error(`unexpected fetch: ${input}`);
    }

    const response = await gate;

    return {
      ok: response.ok,
      status: response.status,
      json: async () => response.body,
    };
  };
  globalThis.fetch = mockedFetch as unknown as typeof globalThis.fetch;

  return {
    release: (response: MockResponse) => {
      (release as NonNullable<typeof release>)(response);
    },
  };
}

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

async function main() {
  process.env.NEXT_PUBLIC_API_URL = "";
  installMemoryStorage();

  // 1. The race: refresh starts, logout clears, refresh resolves 200 late.
  resetStore();
  persistAuthTokens("old-access", "old-refresh");
  const raceGate = installGatedFetch();
  const racePending = refreshAccessToken();
  invalidatePendingTokenPersists();
  clearStoredAuthTokens();
  raceGate.release({
    ok: true,
    status: 200,
    body: { access_token: "late-" + "access", refresh_token: "late-" + "refresh" },
  });
  let threw: unknown = null;
  try {
    await racePending;
  } catch (error) {
    threw = error;
  }
  assert(
    threw instanceof AuthError,
    "stale refresh throws AuthError instead of returning a token",
  );
  assert(
    getStoredAccessToken() === null,
    "stale refresh does not re-persist the access token after logout",
  );
  assert(
    getStoredRefreshToken() === null,
    "stale refresh does not re-persist the refresh token after logout",
  );

  // 2. Normal path: refresh with no intervening login/logout persists.
  resetStore();
  persistAuthTokens("old-access", "old-refresh");
  const freshGate = installGatedFetch();
  const freshPending = refreshAccessToken();
  freshGate.release({
    ok: true,
    status: 200,
    body: { access_token: "new-" + "access", refresh_token: "new-" + "refresh" },
  });
  const token = await freshPending;
  assert(token === "new-access", "fresh refresh returns the new access token");
  assert(
    getStoredAccessToken() === "new-access",
    "fresh refresh persists the new access token",
  );
  assert(
    getStoredRefreshToken() === "new-refresh",
    "fresh refresh persists the new refresh token",
  );

  // 3. Failed refresh clears the current generation's tokens.
  resetStore();
  persistAuthTokens("old-access", "old-refresh");
  const failedGate = installGatedFetch();
  const failedPending = refreshAccessToken();
  failedGate.release({ ok: false, status: 401, body: { detail: "invalid" } });
  threw = null;
  try {
    await failedPending;
  } catch (error) {
    threw = error;
  }
  assert(threw instanceof AuthError, "failed refresh throws AuthError");
  assert(
    getStoredAccessToken() === null,
    "failed refresh clears the access token",
  );
  assert(
    getStoredRefreshToken() === null,
    "failed refresh clears the refresh token",
  );

  // 4. Stale failure after a newer login must not wipe the new tokens.
  resetStore();
  persistAuthTokens("old-access", "old-refresh");
  const staleGate = installGatedFetch();
  const stalePending = refreshAccessToken();
  invalidatePendingTokenPersists();
  persistAuthTokens("login-access", "login-refresh");
  staleGate.release({ ok: false, status: 401, body: { detail: "invalid" } });
  threw = null;
  try {
    await stalePending;
  } catch (error) {
    threw = error;
  }
  assert(threw instanceof AuthError, "stale failed refresh still throws");
  assert(
    getStoredAccessToken() === "login-access",
    "stale failed refresh keeps the newer login access token",
  );
  assert(
    getStoredRefreshToken() === "login-refresh",
    "stale failed refresh keeps the newer login refresh token",
  );

  if (failures > 0) {
    console.log(`${failures} assertion(s) failed`);
    process.exitCode = 1;
  } else {
    console.log("all refresh-logout-race assertions passed");
  }
}

void main();
