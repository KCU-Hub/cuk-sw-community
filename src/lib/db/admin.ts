import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

type PublicProfile = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

export interface AdminUserListItem extends Profile {
  post_count: number;
  comment_count: number;
}

type AdminUserRpcRow = Profile & {
  post_count: number;
  comment_count: number;
  total_count: number;
};

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
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_search: search.trim(),
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw error;

  const rows = (data ?? []) as AdminUserRpcRow[];
  const total = rows[0]?.total_count ?? 0;
  const withCounts = rows.map(
    ({ total_count: _totalCount, ...row }): AdminUserListItem => {
      void _totalCount;
      return row;
    },
  );

  return { users: withCounts, total };
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

export interface AuditLogListItem extends AuditLogEntry {
  admin: PublicProfile | null;
  target: PublicProfile | null;
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

export async function listRecentAuditLogs({
  limit = 12,
}: { limit?: number } = {}): Promise<AuditLogListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      `
      *,
      admin:profiles!audit_logs_admin_id_fkey(id, username, display_name, avatar_url),
      target:profiles!audit_logs_target_user_id_fkey(id, username, display_name, avatar_url)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AuditLogListItem[];
}
