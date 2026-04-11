import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleEnv } from "@/lib/supabase/env";

/**
 * Service-role Supabase client. SERVER-ONLY — never import from a Client Component.
 * Bypasses RLS. Use sparingly, only for admin operations like promoting users.
 */
export function createAdminClient() {
  const { url, serviceRoleKey } = getServiceRoleEnv();
  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
