// Inject the override-endpoint auth token onto proxied requests.
//
// The Next.js rewrite in next.config.ts proxies /api/* → ${VALUATE_API}/*.
// For the backend's auth-gated /company/{ticker}/override endpoint we need
// to attach `Authorization: Bearer <token>`. The token lives in a non-public
// Vercel env var (VALUATE_OVERRIDE_TOKEN) so it never reaches the browser.
//
// Other /api/* paths don't need the header — the backend only requires auth
// on /override — so this proxy is narrowly matched.
//
// Note: Next.js 16 renamed `middleware.ts` to `proxy.ts`. Same semantics.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Only inject the header on PUT requests to /api/company/{ticker}/override.
  // (The matcher narrows to this path; the method check guards GETs.)
  if (request.method !== "PUT") {
    return NextResponse.next();
  }

  const token = process.env.VALUATE_OVERRIDE_TOKEN;
  if (!token) {
    // Local dev with no token set: backend's auth dep is a no-op too.
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: "/api/company/:ticker/override",
};
