import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const backendOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
  .replace(/\/$/, "");

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

  const response = await fetch(backendUrl, {
    method: request.method,
    headers: requestHeaders,
    body: requestBody,
    redirect: "manual",
  });

  let finalResponse = response;
  if (response.status === 307 || response.status === 308) {
    const location = response.headers.get("location");
    if (location) {
      const redirectUrl = location.replace(/^http:\/\//, "https://");
      finalResponse = await fetch(redirectUrl, {
        method: request.method,
        headers: requestHeaders,
        body: requestBody,
        redirect: "manual",
      });
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
