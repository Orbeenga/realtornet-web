import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const backendOrigin = (process.env.API_URL ?? "http://localhost:8000")
  .replace(/^http:\/\//, "https://")
  .replace(/\/$/, "");
const backendBaseUrl = new URL(backendOrigin);

function buildBackendUrl(request: NextRequest, path: string[]) {
  const url = new URL(`/api/v1/${path.join("/")}`, backendOrigin);
  url.search = request.nextUrl.search;
  return url;
}

function buildHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("content-length");

  return headers;
}

function normalizeRedirectLocation(location: string) {
  try {
    const target = new URL(location, backendOrigin);

    if (target.host !== backendBaseUrl.host) {
      return null;
    }

    target.protocol = backendBaseUrl.protocol;
    return target;
  } catch {
    return null;
  }
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const targetUrl = buildBackendUrl(request, path);
  const requestBody =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const sendRequest = (url: URL) =>
    fetch(url, {
      method: request.method,
      headers: buildHeaders(request),
      body: requestBody,
      redirect: "manual",
      cache: "no-store",
    });

  let response = await sendRequest(targetUrl);

  for (let redirectCount = 0; redirectCount < 3; redirectCount += 1) {
    if (response.status < 300 || response.status >= 400) {
      break;
    }

    const location = response.headers.get("location");

    if (!location) {
      break;
    }

    const normalizedLocation = normalizeRedirectLocation(location);

    if (!normalizedLocation) {
      break;
    }

    response = await sendRequest(normalizedLocation);
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("location");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context);
}
