"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-user";
import {
  createPostSchema,
  postIdSchema,
  updatePostSchema,
} from "@/lib/validation/post";
import { isBoardSlug } from "@/lib/constants";
import { mapSupabaseError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";

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

  await enforceRateLimit(profile.id, "post_create");

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

  if (error) throw new Error(mapSupabaseError(error));

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

  if (error) throw new Error(mapSupabaseError(error));

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

  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath(`/board/${boardSlugRaw}`);
  redirect(`/board/${boardSlugRaw}`);
}

// `u:<uid>` when authed, `a:<sha256(ip|ua)[:32]>` when anon. Returns null
// when anon without any stable identifier — in that case we silently skip
// the bump so we don't pollute the log with identical empty keys.
async function buildViewerKey(user: User | null): Promise<string | null> {
  if (user) return `u:${user.id}`;

  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ua = h.get("user-agent") ?? "";
  if (!forwardedFor && !ua) return null;
  const hash = createHash("sha256").update(`${forwardedFor}|${ua}`).digest("hex");
  return `a:${hash.slice(0, 32)}`;
}

export async function incrementPostViewAction(postId: string) {
  const parsed = postIdSchema.safeParse(postId);
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerKey = await buildViewerKey(user);
  if (!viewerKey) return;

  await supabase.rpc("increment_post_view", {
    p_post_id: parsed.data,
    p_viewer_key: viewerKey,
  });
}
