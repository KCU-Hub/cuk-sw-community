"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-user";
import { mapSupabaseError } from "@/lib/errors";

type BanDuration = "permanent" | "1d" | "7d" | "30d";

const targetUserIdSchema = z
  .string()
  .uuid({ message: "대상 사용자를 확인할 수 없습니다." });

export async function banUserAction(formData: FormData) {
  const admin = await requireAdmin();

  const targetUserIdResult = targetUserIdSchema.safeParse(
    formData.get("targetUserId"),
  );
  const durationRaw = String(
    formData.get("duration") ?? "permanent",
  ) as BanDuration;
  const reason =
    String(formData.get("reason") ?? "").trim().slice(0, 500) || null;

  if (!targetUserIdResult.success) {
    throw new Error(
      targetUserIdResult.error.issues[0]?.message ?? "잘못된 요청입니다.",
    );
  }
  const targetUserId = targetUserIdResult.data;
  if (targetUserId === admin.id) {
    throw new Error("본인 계정은 ban 할 수 없습니다.");
  }

  const duration: BanDuration = (
    ["permanent", "1d", "7d", "30d"] as BanDuration[]
  ).includes(durationRaw)
    ? durationRaw
    : "permanent";

  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_set_user_ban", {
    p_target_user_id: targetUserId,
    p_duration: duration,
    p_reason: reason,
  });
  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath("/admin/users");
}

export async function unbanUserAction(formData: FormData) {
  await requireAdmin();

  const targetUserIdResult = targetUserIdSchema.safeParse(
    formData.get("targetUserId"),
  );
  if (!targetUserIdResult.success) {
    throw new Error(
      targetUserIdResult.error.issues[0]?.message ?? "잘못된 요청입니다.",
    );
  }
  const targetUserId = targetUserIdResult.data;

  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_clear_user_ban", {
    p_target_user_id: targetUserId,
  });
  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath("/admin/users");
}
