export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(`API error ${status}`);
    this.name = "ApiError";
  }
}

export class AuthError extends Error {
  constructor(message = "Session expired") {
    super(message);
    this.name = "AuthError";
  }
}

const ACCESS_TOKEN_STORAGE_KEY = "rn_token";
const REFRESH_TOKEN_STORAGE_KEY = "rn_refresh_token";

let unauthorizedHandler: (() => void | Promise<void>) | null = null;
let refreshPromise: Promise<string> | null = null;

function getApiBasePath() {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(
    /^http:\/\//,
    "https://",
  );

  if (!apiUrl) {
    return "";
  }

  try {
    const normalizedUrl = new URL(apiUrl);
    const pathname = normalizedUrl.pathname.replace(/\/$/, "");

    return pathname === "/" ? "" : pathname;
  } catch {
    return apiUrl.replace(/\/$/, "");
  }
}

function normalizeApiPath(path: string) {
  const match = path.match(/^([^?#]*)(.*)$/);

  if (!match) {
    return path;
  }

  const [, pathname, suffix] = match;

  if (!pathname || pathname.endsWith("/")) {
    return path;
  }

  return `${pathname}/${suffix}`;
}

export function buildApiUrl(path: string) {
  return `${getApiBasePath()}${normalizeApiPath(path)}`;
}

export function setUnauthorizedHandler(
  handler: (() => void | Promise<void>) | null,
) {
  unauthorizedHandler = handler;
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function getStoredRefreshToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function persistAuthTokens(accessToken: string, refreshToken?: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);

  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  }
}

export function clearStoredAuthTokens() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    throw new AuthError("Missing refresh token");
  }

  const res = await fetch(buildApiUrl("/api/v1/auth/refresh/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok || !payload?.access_token) {
    clearStoredAuthTokens();
    throw new AuthError("Refresh failed");
  }

  persistAuthTokens(payload.access_token, payload.refresh_token ?? refreshToken);
  return payload.access_token as string;
}

async function handleUnauthorized() {
  clearStoredAuthTokens();

  if (unauthorizedHandler) {
    await unauthorizedHandler();
  }
}

function extractFieldErrors(
  detail: unknown,
): Record<string, string[]> | undefined {
  if (!Array.isArray(detail)) {
    return undefined;
  }

  const fields: Record<string, string[]> = {};

  for (const item of detail) {
    if (
      typeof item === "object" &&
      item !== null &&
      "loc" in item &&
      "msg" in item &&
      Array.isArray(item.loc) &&
      typeof item.msg === "string"
    ) {
      const field = item.loc[item.loc.length - 1];

      if (typeof field === "string") {
        if (!fields[field]) {
          fields[field] = [];
        }

        fields[field].push(item.msg);
      }
    }
  }

  return Object.keys(fields).length > 0 ? fields : undefined;
}

export async function apiClient<T>(
  path: string,
  options?: RequestInit,
  isRetry = false,
): Promise<T> {
  const normalizedPath = normalizeApiPath(path);
  const token = getStoredAccessToken();
  const isFormData = options?.body instanceof FormData;

  const res = await fetch(buildApiUrl(normalizedPath), {
    ...options,
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    if (
      res.status === 401 &&
      !isRetry &&
      normalizedPath !== "/api/v1/auth/refresh/" &&
      normalizedPath !== "/api/v1/auth/login/" &&
      getStoredRefreshToken()
    ) {
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }

        await refreshPromise;
        return apiClient<T>(normalizedPath, options, true);
      } catch {
        await handleUnauthorized();
        throw new AuthError();
      }
    }

    if (res.status === 401) {
      await handleUnauthorized();
    }

    const body = await res.json().catch(() => ({ detail: "Unknown error" }));

    throw new ApiError(
      res.status,
      typeof body === "object" && body !== null && "detail" in body
        ? body.detail
        : body,
      extractFieldErrors(
        typeof body === "object" && body !== null && "detail" in body
          ? body.detail
          : undefined,
      ),
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
