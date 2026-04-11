"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-user";
import { isBoardSlug } from "@/lib/constants";

export async function toggleLikeAction(formData: FormData) {
  const profile = await requireProfile();

  const postId = String(formData.get("postId") ?? "");
  const boardSlugRaw = String(formData.get("boardSlug") ?? "");
  if (!postId || !isBoardSlug(boardSlugRaw)) {
    throw new Error("잘못된 요청입니다.");
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", profile.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id: postId, user_id: profile.id });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/board/${boardSlugRaw}/${postId}`);
}
