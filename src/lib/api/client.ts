import { supabase } from "@/lib/supabase";

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
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
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
