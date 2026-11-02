/* Shared login-redirect safety lives HERE ONLY (canonical safeRedirect module).
   Covers credential-param stripping and open-redirect validation for /login. */

const LOGIN_PATH = "/login";

/** Query keys that survive credential stripping. Never add password/email here. */
const PRESERVED_QUERY_KEYS = ["next", "registered"] as const;

export interface StrippedLoginQuery {
  /** True when a credential-bearing key was present and stripped. */
  stripped: boolean;
  /** Constructed internal target. Only meaningful when stripped is true. */
  target: string;
}

/**
 * Detect a credential-bearing /login URL and build a safe replacement target.
 *
 * Detection is by key presence only: `password` is never read, logged, stored,
 * or sent. `email` is dropped alongside it without being read. Only the
 * allowlisted `next` and `registered` values are carried over, and the target
 * is always a constructed internal path, never the raw query string.
 */
export function stripCredentialParams(
  searchParams: URLSearchParams,
): StrippedLoginQuery {
  if (!searchParams.has("password")) {
    return { stripped: false, target: "" };
  }
  const kept = new URLSearchParams();
  for (const key of PRESERVED_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value !== null) {
      kept.set(key, value);
    }
  }
  const query = kept.toString();
  return {
    stripped: true,
    target: query === "" ? LOGIN_PATH : `${LOGIN_PATH}?${query}`,
  };
}
