import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const backendOrigin = (process.env.API_URL ?? "http://localhost:8000")
  .replace(/^http:\/\//, "https://")
  .replace(/\/$/, "");

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

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const targetUrl = buildBackendUrl(request, path);
  const requestBody =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : new Uint8Array(await request.arrayBuffer());

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: buildHeaders(request),
    body: requestBody,
    cache: "no-store",
  });

  const headers = new Headers(response.headers);
  headers.delete("content-length");

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
