// CSRF defense: reject state-changing API requests whose browser Origin doesn't
// match our own host. A malicious site's fetch carries ITS origin, so it's blocked,
// while same-origin requests (Origin === host) pass.
//
// We only enforce when an Origin header is present. Browsers always send Origin on
// cross-origin AND same-origin non-GET requests, so legit browser traffic is covered.
// Non-browser callers (curl, our own server-to-server jobs, signed carrier webhooks)
// don't send Origin and are allowed here — webhooks are authenticated by signature,
// not by Origin. SameSite=Lax cookies already block most CSRF; this is defense-in-depth.
import { NextRequest, NextResponse } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Webhooks are verified by cryptographic signature, not Origin — skip them here.
const SIGNATURE_VERIFIED = ["/api/webhooks/"];

export function middleware(req: NextRequest) {
  if (!MUTATING.has(req.method)) return NextResponse.next();

  const path = req.nextUrl.pathname;
  if (SIGNATURE_VERIFIED.some((p) => path.startsWith(p))) return NextResponse.next();

  const origin = req.headers.get("origin");
  if (origin) {
    let originHost = "";
    try { originHost = new URL(origin).host; } catch { originHost = "invalid"; }
    const host = req.headers.get("host") || "";
    if (originHost !== host) {
      return NextResponse.json(
        { error: "Cross-site request blocked." },
        { status: 403 },
      );
    }
  }
  return NextResponse.next();
}

// Only run on API routes.
export const config = {
  matcher: ["/api/:path*"],
};
