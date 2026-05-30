"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-user";
import { mapSupabaseError } from "@/lib/errors";

type BanDuration = "permanent" | "1d" | "7d" | "30d";

function endTimeFor(duration: BanDuration): string | null {
  if (duration === "permanent") return null;
  const now = Date.now();
  const days =
    duration === "1d" ? 1 : duration === "7d" ? 7 : duration === "30d" ? 30 : 0;
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function banUserAction(formData: FormData) {
  const admin = await requireAdmin();

  // TODO(2nd-pass-audit-2026-05-21): targetUserId is currently validated as
  // "non-empty string". Malformed values fall through to a PostgREST type
  // error → generic mapSupabaseError fallback. Defense-in-depth would add
  // z.string().uuid() — RLS still enforces the real boundary.
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const durationRaw = String(formData.get("duration") ?? "permanent") as BanDuration;
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500) || null;

  if (!targetUserId) throw new Error("대상 사용자를 지정해주세요.");
  if (targetUserId === admin.id) throw new Error("본인 계정은 ban 할 수 없습니다.");

  const duration: BanDuration = (
    ["permanent", "1d", "7d", "30d"] as BanDuration[]
  ).includes(durationRaw)
    ? durationRaw
    : "permanent";

  const bannedUntil = endTimeFor(duration);
  const supabase = await createClient();

  // profiles update
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      is_banned: duration === "permanent",
      banned_until: bannedUntil,
      ban_reason: reason,
    })
    .eq("id", targetUserId);
  if (updateError) throw new Error(mapSupabaseError(updateError));

  // audit_logs append
  const { error: auditError } = await supabase.from("audit_logs").insert({
    admin_id: admin.id,
    target_user_id: targetUserId,
    action: "user_ban",
    reason,
    metadata: { duration, banned_until: bannedUntil },
  });
  if (auditError) throw new Error(mapSupabaseError(auditError));

  revalidatePath("/admin/users");
}

export async function unbanUserAction(formData: FormData) {
  const admin = await requireAdmin();

  const targetUserId = String(formData.get("targetUserId") ?? "");
  if (!targetUserId) throw new Error("대상 사용자를 지정해주세요.");

  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      is_banned: false,
      banned_until: null,
      ban_reason: null,
    })
    .eq("id", targetUserId);
  if (updateError) throw new Error(mapSupabaseError(updateError));

  const { error: auditError } = await supabase.from("audit_logs").insert({
    admin_id: admin.id,
    target_user_id: targetUserId,
    action: "user_unban",
    reason: null,
    metadata: {},
  });
  if (auditError) throw new Error(mapSupabaseError(auditError));

  revalidatePath("/admin/users");
}
