function normalizeApiPath(path: string) {
  const match = path.match(/^([^?#]*)(.*)$/);

  if (!match) {
    return path;
  }

  const [, pathname, suffix] = match;

  return `${pathname}${suffix}`;
}

function buildServerApiUrl(path: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (!apiUrl) {
    return null;
  }

  return `${apiUrl}${normalizeApiPath(path)}`;
}

type RevalidateSeconds = 60 | 120;

export async function serverPublicApi<T>(
  path: string,
  revalidate: RevalidateSeconds = 60,
): Promise<T | null> {
  const url = buildServerApiUrl(path);

  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      next: { revalidate },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}