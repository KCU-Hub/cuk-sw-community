import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Route guarding (not-authed redirects, role checks) lives in `(authed)` and
// `(admin)` layouts, NOT here. The proxy runs on the edge and shouldn't reach
// into the database for role checks.

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map|woff2?|ttf|ico)$).*)",
  ],
};
