"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-user";
import { commentIdSchema, createCommentSchema } from "@/lib/validation/comment";
import { isBoardSlug } from "@/lib/constants";
import { mapSupabaseError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { firstError } from "@/lib/form";

export async function createCommentAction(formData: FormData) {
  const profile = await requireProfile();

  const boardSlugRaw = String(formData.get("boardSlug") ?? "");
  if (!isBoardSlug(boardSlugRaw)) {
    throw new Error("잘못된 게시판입니다.");
  }

  const rawParent = formData.get("parent_id");
  const parentId =
    typeof rawParent === "string" && rawParent.length > 0 ? rawParent : null;

  const parsed = createCommentSchema.safeParse({
    post_id: formData.get("post_id"),
    parent_id: parentId,
    content: formData.get("content"),
  });

  if (!parsed.success) {
    throw new Error(firstError(parsed.error));
  }

  await enforceRateLimit(profile.id, "comment_create");

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    post_id: parsed.data.post_id,
    parent_id: parsed.data.parent_id ?? null,
    content: parsed.data.content,
    author_id: profile.id,
  });

  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath(`/board/${boardSlugRaw}/${parsed.data.post_id}`);
}

export async function deleteCommentAction(formData: FormData) {
  await requireProfile();

  const commentIdResult = commentIdSchema.safeParse(formData.get("commentId"));
  const postId = String(formData.get("postId") ?? "");
  const boardSlugRaw = String(formData.get("boardSlug") ?? "");
  if (!commentIdResult.success || !postId || !isBoardSlug(boardSlugRaw)) {
    throw new Error("잘못된 요청입니다.");
  }
  const commentId = commentIdResult.data;

  const supabase = await createClient();
  // Soft delete preserves the tree structure for nested replies.
  const { error } = await supabase
    .from("comments")
    .update({ is_deleted: true, content: "[삭제된 댓글]" })
    .eq("id", commentId);

  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath(`/board/${boardSlugRaw}/${postId}`);
}
