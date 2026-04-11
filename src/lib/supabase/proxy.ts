import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { tryGetPublicSupabaseEnv } from "@/lib/supabase/env";

/**
 * Refresh the Supabase session on every request.
 *
 * Critical to:
 *  1. Build a single NextResponse and pass it to createServerClient via setAll
 *  2. Call `auth.getUser()` so the SDK rotates expiring tokens
 *  3. Return the SAME response object so its Set-Cookie headers ship to the client
 *
 * Do NOT add route guards here — proxy runs on the edge and has no DB access
 * for role checks. Use `(authed)/layout.tsx` server component guards instead.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Defensive: a fresh checkout without .env.local should still serve pages.
  // The page-level createClient() will surface a clearer error if needed.
  const env = tryGetPublicSupabaseEnv();
  if (!env) return supabaseResponse;

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
