"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { buildViewerKey } from "@/lib/viewer-key";
import { firstError } from "@/lib/form";

function readCourseSlugs(formData: FormData): string[] {
  const values = formData
    .getAll("course_slugs")
    .flatMap((value) => (typeof value === "string" ? [value] : []))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const legacySingle = String(formData.get("course_slug") ?? "").trim();
  if (legacySingle) values.push(legacySingle);

  return Array.from(new Set(values));
}

async function syncPostCourses(
  postId: string,
  courseSlugs: string[],
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_post_courses", {
    p_post_id: postId,
    p_course_slugs: courseSlugs,
  });
  if (error) throw new Error(mapSupabaseError(error));
}

export async function createPostAction(formData: FormData) {
  const profile = await requireProfile();

  const parsed = createPostSchema.safeParse({
    board_slug: formData.get("board_slug"),
    title: formData.get("title"),
    content: formData.get("content"),
    course_slugs: readCourseSlugs(formData),
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

  await syncPostCourses(data.id, parsed.data.course_slugs);

  revalidatePath(`/board/${parsed.data.board_slug}`);
  for (const courseSlug of parsed.data.course_slugs) {
    revalidatePath(`/courses/${courseSlug}`);
  }
  redirect(`/board/${parsed.data.board_slug}/${data.id}`);
}

export async function updatePostAction(formData: FormData) {
  await requireProfile();

  const postIdResult = postIdSchema.safeParse(formData.get("postId"));
  const boardSlugRaw = String(formData.get("boardSlug") ?? "");
  if (!postIdResult.success || !isBoardSlug(boardSlugRaw)) {
    throw new Error("잘못된 요청입니다.");
  }
  const postId = postIdResult.data;

  const parsed = updatePostSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    course_slugs: readCourseSlugs(formData),
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

  await syncPostCourses(postId, parsed.data.course_slugs);

  revalidatePath(`/board/${boardSlugRaw}`);
  revalidatePath(`/board/${boardSlugRaw}/${postId}`);
  for (const courseSlug of parsed.data.course_slugs) {
    revalidatePath(`/courses/${courseSlug}`);
  }
  redirect(`/board/${boardSlugRaw}/${postId}`);
}

export async function deletePostAction(formData: FormData) {
  await requireProfile();

  const postIdResult = postIdSchema.safeParse(formData.get("postId"));
  const boardSlugRaw = String(formData.get("boardSlug") ?? "");
  if (!postIdResult.success || !isBoardSlug(boardSlugRaw)) {
    throw new Error("잘못된 요청입니다.");
  }
  const postId = postIdResult.data;

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

export async function incrementPostViewAction(postId: string) {
  const parsed = postIdSchema.safeParse(postId);
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerKey = await buildViewerKey(user);
  if (!viewerKey) return;

  // TODO(2nd-pass-audit-2026-05-21): rpc result is discarded; failures are
  // silently best-effort like the client-side .catch(()=>{}). Confirm this is
  // intentional (view counts non-critical) or wire to mapSupabaseError.
  await supabase.rpc("increment_post_view", {
    p_post_id: parsed.data,
    p_viewer_key: viewerKey,
  });
}

export async function markQuestionSolvedAction(formData: FormData) {
  await requireProfile();

  const postIdResult = postIdSchema.safeParse(formData.get("postId"));
  const commentIdResult = postIdSchema.safeParse(formData.get("commentId"));
  const boardSlugRaw = String(formData.get("boardSlug") ?? "");
  if (
    !postIdResult.success ||
    !commentIdResult.success ||
    !isBoardSlug(boardSlugRaw)
  ) {
    throw new Error("잘못된 요청입니다.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({
      accepted_comment_id: commentIdResult.data,
      question_status: "solved",
    })
    .eq("id", postIdResult.data)
    .eq("board_slug", "qna");
  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath(`/board/${boardSlugRaw}/${postIdResult.data}`);
}

export async function reopenQuestionAction(formData: FormData) {
  await requireProfile();

  const postIdResult = postIdSchema.safeParse(formData.get("postId"));
  const boardSlugRaw = String(formData.get("boardSlug") ?? "");
  if (!postIdResult.success || !isBoardSlug(boardSlugRaw)) {
    throw new Error("잘못된 요청입니다.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({
      accepted_comment_id: null,
      question_status: "open",
    })
    .eq("id", postIdResult.data)
    .eq("board_slug", "qna");
  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath(`/board/${boardSlugRaw}/${postIdResult.data}`);
}
