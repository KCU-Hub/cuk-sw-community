"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-user";
import { isBoardSlug } from "@/lib/constants";
import { postIdSchema } from "@/lib/validation/post";
import { mapSupabaseError, PG_ERROR_CODES } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function toggleLikeAction(formData: FormData) {
  const profile = await requireProfile();

  const postIdResult = postIdSchema.safeParse(formData.get("postId"));
  const boardSlugRaw = String(formData.get("boardSlug") ?? "");
  if (!postIdResult.success || !isBoardSlug(boardSlugRaw)) {
    throw new Error("잘못된 요청입니다.");
  }
  const postId = postIdResult.data;

  await enforceRateLimit(profile.id, "like_toggle");

  const supabase = await createClient();

  // Insert-first: unique (post_id, user_id) means the DB resolves races for
  // us — parallel calls can't both insert, and a 23505 on retry means the
  // user is toggling off. Collapses the old select → branch into one query.
  const { error: insertError } = await supabase
    .from("post_likes")
    .insert({ post_id: postId, user_id: profile.id });

  if (insertError) {
    if (insertError.code !== PG_ERROR_CODES.UNIQUE_VIOLATION) {
      throw new Error(mapSupabaseError(insertError));
    }
    // Already liked → toggle off.
    const { error: deleteError } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", profile.id);
    if (deleteError) throw new Error(mapSupabaseError(deleteError));
  }

  revalidatePath(`/board/${boardSlugRaw}/${postId}`);
}
