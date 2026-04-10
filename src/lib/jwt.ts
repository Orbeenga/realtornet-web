export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");

    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);

    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("rn_token");
}

export function getStoredJwtRole() {
  const token = getStoredToken();

  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);

  const role = payload?.user_role ?? payload?.role;
  return typeof role === "string" ? role : null;
}

export function getStoredJwtPayload() {
  const token = getStoredToken();

  if (!token) {
    return null;
  }

  return decodeJwtPayload(token);
}
