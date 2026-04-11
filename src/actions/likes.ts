"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-user";
import { isBoardSlug } from "@/lib/constants";

// Postgres unique violation — emitted when (post_id, user_id) already exists.
// PostgREST surfaces this as code "23505".
const PG_UNIQUE_VIOLATION = "23505";

export async function toggleLikeAction(formData: FormData) {
  const profile = await requireProfile();

  const postId = String(formData.get("postId") ?? "");
  const boardSlugRaw = String(formData.get("boardSlug") ?? "");
  if (!postId || !isBoardSlug(boardSlugRaw)) {
    throw new Error("잘못된 요청입니다.");
  }

  const supabase = await createClient();

  // Try insert-first. If the row already exists (race or double click), the
  // unique constraint on (post_id, user_id) raises 23505 and we treat that as
  // "user wants to unlike". This collapses the previous select → insert/delete
  // round trip into one query and removes the race window where two parallel
  // calls could both observe "no row" and then both insert.
  const { error: insertError } = await supabase
    .from("post_likes")
    .insert({ post_id: postId, user_id: profile.id });

  if (insertError) {
    if (insertError.code !== PG_UNIQUE_VIOLATION) {
      throw new Error(insertError.message);
    }
    // Already liked → toggle off.
    const { error: deleteError } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", profile.id);
    if (deleteError) throw new Error(deleteError.message);
  }

  revalidatePath(`/board/${boardSlugRaw}/${postId}`);
}
