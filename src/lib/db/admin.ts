import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export interface AdminUserListItem extends Profile {
  post_count: number;
  comment_count: number;
}

// Admin dashboard: list all profiles + rough activity counts.
//
// RLS: select on profiles is public (0002), so we don't need admin bypass —
// the /admin layout gatekeeps the caller instead. Counts use head+count to
// avoid pulling full payloads.
export async function listUsersForAdmin({
  page = 1,
  pageSize = 30,
  search = "",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}): Promise<{ users: AdminUserListItem[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search.trim()) {
    const pattern = `%${search.trim()}%`;
    query = query.or(`username.ilike.${pattern},display_name.ilike.${pattern}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  // Counts are cheap on 학부 규모 (2026: 수백~수천 user). If this ever
  // grows we'll materialize the counts via trigger.
  const profiles = (data ?? []) as Profile[];
  const withCounts: AdminUserListItem[] = await Promise.all(
    profiles.map(async (p) => {
      const [{ count: postCount }, { count: commentCount }] = await Promise.all([
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", p.id),
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("author_id", p.id),
      ]);
      return {
        ...p,
        post_count: postCount ?? 0,
        comment_count: commentCount ?? 0,
      };
    }),
  );

  return { users: withCounts, total: count ?? 0 };
}

export interface AuditLogEntry {
  id: string;
  admin_id: string | null;
  target_user_id: string | null;
  action: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function listAuditLogsForUser(
  targetUserId: string,
  { limit = 20 }: { limit?: number } = {},
): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("target_user_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AuditLogEntry[];
}
