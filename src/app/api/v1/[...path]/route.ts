import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const resolvedOrigin = process.env.NEXT_PUBLIC_API_URL;

if (!resolvedOrigin) {
  if (process.env.VERCEL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not configured for this Vercel environment. " +
      "The proxy cannot construct a valid backend URL. Set it in " +
      "Vercel project settings for this environment (Production/Preview/Development).",
    );
  }
}

const backendOrigin = (resolvedOrigin ?? "http://localhost:8000")
  .replace(/\/$/, "");

// Upper bound on how long the proxy will wait for upstream response headers.
// Without this, a stalled backend holds the socket open until Node's undici
// default headersTimeout (300s) fires, which accumulates sockets in the dev
// server and can trigger a memory-pressure restart. Keep this well below the
// client-side timeout in AuthContext so the client observes this clean 504
// rather than racing its own deadline against it.
const UPSTREAM_TIMEOUT_MS = 20_000;

// Distinguishes "the backend never answered in time" from "the backend answered
// with an error". Downstream debugging needs to tell these apart without
// re-deriving it from headers (see INCIDENT_LOG.md 2026-09-16 / this session's
// six-minute /auth/me hangs).
const UPSTREAM_TIMEOUT_CODE = "upstream_timeout";

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function upstreamTimeoutResponse(method: string, url: URL) {
  return Response.json(
    {
      detail:
        "Upstream API did not respond before the proxy deadline.",
      code: UPSTREAM_TIMEOUT_CODE,
      timeout_ms: UPSTREAM_TIMEOUT_MS,
    },
    {
      status: 504,
      statusText: "Gateway Timeout",
      headers: {
        "X-Proxy-Error": UPSTREAM_TIMEOUT_CODE,
        "X-Upstream-Method": method,
        "X-Upstream-Path": url.pathname,
      },
    },
  );
}

function buildBackendUrl(request: NextRequest, path: string[]) {
  const url = new URL(`/api/v1/${path.join("/")}`, backendOrigin);
  url.search = request.nextUrl.search;
  return url;
}

function buildHeaders(request: NextRequest) {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    headers.set(key, value);
  });

  headers.delete("host");
  headers.delete("content-length");

  return headers;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const backendUrl = buildBackendUrl(request, path);
  const requestBody =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : new Uint8Array(await request.arrayBuffer());

  const requestHeaders = buildHeaders(request);

  let response: Response;

  try {
    response = await fetch(backendUrl, {
      method: request.method,
      headers: requestHeaders,
      body: requestBody,
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    if (isAbortError(error)) {
      return upstreamTimeoutResponse(request.method, backendUrl);
    }

    throw error;
  }

  let finalResponse = response;
  if (response.status === 307 || response.status === 308) {
    const location = response.headers.get("location");
    if (location) {
      // Resolve relative redirects against the backend origin, and PRESERVE the
      // backend's scheme. Rewriting http->https unconditionally is a no-op in
      // https deployments (production/staging), but on a local http backend
      // it forces TLS against 127.0.0.1:8000 and throws in proxyRequest.
      const redirectUrl = new URL(location, backendOrigin);

      try {
        finalResponse = await fetch(redirectUrl, {
          method: request.method,
          headers: requestHeaders,
          body: requestBody,
          redirect: "manual",
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
      } catch (error) {
        if (isAbortError(error)) {
          return upstreamTimeoutResponse(request.method, redirectUrl);
        }

        throw error;
      }
    }
  }

  const responseHeaders = new Headers(finalResponse.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("location");

  return new Response(finalResponse.body, {
    status: finalResponse.status,
    statusText: finalResponse.statusText,
    headers: responseHeaders,
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
