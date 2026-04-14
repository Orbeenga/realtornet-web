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

let unauthorizedHandler: (() => void | Promise<void>) | null = null;

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

export function buildApiUrl(path: string) {
  return `${getApiBasePath()}${path}`;
}

export function setUnauthorizedHandler(
  handler: (() => void | Promise<void>) | null,
) {
  unauthorizedHandler = handler;
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
): Promise<T> {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("rn_token") : null;
  const isFormData = options?.body instanceof FormData;

  const res = await fetch(buildApiUrl(path), {
    ...options,
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401 && unauthorizedHandler) {
      await unauthorizedHandler();
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
