import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const backendOrigin = (process.env.API_URL ?? "http://localhost:8000")
  .replace(/^http:\/\//, "https://")
  .replace(/\/$/, "");
const backendHost = new URL(backendOrigin).host;

function buildBackendUrl(request: NextRequest, path: string[]) {
  const url = new URL(`/api/v1/${path.join("/")}/`, backendOrigin);
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

  const sendRequest = (url: URL) =>
    fetch(url, {
      method: request.method,
      headers: buildHeaders(request),
      body: requestBody,
      redirect: "manual",
      cache: "no-store",
    });

  let response = await sendRequest(targetUrl);

  for (let i = 0; i < 5; i++) {
    if (response.status !== 0) {
      break;
    }

    const nextUrl = new URL(response.url);

    if (nextUrl.host === backendHost) {
      nextUrl.protocol = "https:";
    }

    response = await sendRequest(nextUrl);
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(response.body, {
    status: response.status === 0 ? 502 : response.status,
    statusText: response.status === 0 ? "Bad Gateway" : response.statusText,
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
