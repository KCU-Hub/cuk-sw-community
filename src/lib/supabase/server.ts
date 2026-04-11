import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

// Always create a new instance per request — do NOT cache at module scope.
//
// Order matters: `cookies()` must be awaited before any code that may throw
// (e.g. env validation). The `cookies()` call is what opts the surrounding
// route into dynamic rendering — if env validation throws first, Next.js
// can't see the dynamic API and may prerender the route statically.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. The proxy refreshes them
          // on the next request, so this is safe to ignore here.
        }
      },
    },
  });
}
