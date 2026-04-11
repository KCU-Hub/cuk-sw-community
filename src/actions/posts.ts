"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-user";
import { createPostSchema, updatePostSchema } from "@/lib/validation/post";
import { isBoardSlug } from "@/lib/constants";

function firstError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "입력값을 확인해주세요.";
}

export async function createPostAction(formData: FormData) {
  const profile = await requireProfile();

  const parsed = createPostSchema.safeParse({
    board_slug: formData.get("board_slug"),
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    throw new Error(firstError(parsed.error));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      board_slug: parsed.data.board_slug,
      title: parsed.data.title,
      content: parsed.data.content,
      author_id: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/board/${parsed.data.board_slug}`);
  redirect(`/board/${parsed.data.board_slug}/${data.id}`);
}

export async function updatePostAction(formData: FormData) {
  await requireProfile();

  const postId = String(formData.get("postId") ?? "");
  const boardSlugRaw = String(formData.get("boardSlug") ?? "");
  if (!postId || !isBoardSlug(boardSlugRaw)) {
    throw new Error("잘못된 요청입니다.");
  }

  const parsed = updatePostSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    throw new Error(firstError(parsed.error));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update(parsed.data)
    .eq("id", postId);

  if (error) throw new Error(error.message);

  revalidatePath(`/board/${boardSlugRaw}`);
  revalidatePath(`/board/${boardSlugRaw}/${postId}`);
  redirect(`/board/${boardSlugRaw}/${postId}`);
}

export async function deletePostAction(formData: FormData) {
  await requireProfile();

  const postId = String(formData.get("postId") ?? "");
  const boardSlugRaw = String(formData.get("boardSlug") ?? "");
  if (!postId || !isBoardSlug(boardSlugRaw)) {
    throw new Error("잘못된 요청입니다.");
  }

  const supabase = await createClient();
  // Soft delete — RLS ensures only the author or an admin can perform this.
  const { error } = await supabase
    .from("posts")
    .update({ is_deleted: true })
    .eq("id", postId);

  if (error) throw new Error(error.message);

  revalidatePath(`/board/${boardSlugRaw}`);
  redirect(`/board/${boardSlugRaw}`);
}

export async function incrementPostViewAction(postId: string) {
  const supabase = await createClient();
  await supabase.rpc("increment_post_view", { p_post_id: postId });
}
