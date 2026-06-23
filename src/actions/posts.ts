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

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

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
  supabase: SupabaseServerClient,
  postId: string,
  courseSlugs: string[],
): Promise<void> {
  const { error } = await supabase.rpc("set_post_courses", {
    p_post_id: postId,
    p_course_slugs: courseSlugs,
  });
  if (error) throw new Error(mapSupabaseError(error));
}

async function assertCourseSlugsExist(
  supabase: SupabaseServerClient,
  courseSlugs: string[],
): Promise<void> {
  if (courseSlugs.length === 0) return;

  const { data, error } = await supabase
    .from("courses")
    .select("slug")
    .in("slug", courseSlugs);
  if (error) throw new Error(mapSupabaseError(error));

  const found = new Set((data ?? []).map((course) => course.slug));
  const missing = courseSlugs.filter((courseSlug) => !found.has(courseSlug));
  if (missing.length > 0) {
    throw new Error("존재하지 않는 과목이 포함되어 있습니다.");
  }
}

async function listPostCourseSlugs(
  supabase: SupabaseServerClient,
  postId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("post_courses")
    .select("course_slug")
    .eq("post_id", postId);
  if (error) throw new Error(mapSupabaseError(error));
  return Array.from(new Set((data ?? []).map((link) => link.course_slug)));
}

function revalidateCourseHubs(courseSlugs: string[]): void {
  for (const courseSlug of new Set(courseSlugs)) {
    revalidatePath(`/courses/${courseSlug}`);
  }
}

function revalidateQuestionLists(postId: string): void {
  revalidatePath("/");
  revalidatePath("/board/qna");
  revalidatePath(`/board/qna/${postId}`);
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
  await assertCourseSlugsExist(supabase, parsed.data.course_slugs);

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

  await syncPostCourses(supabase, data.id, parsed.data.course_slugs);

  revalidatePath(`/board/${parsed.data.board_slug}`);
  revalidateCourseHubs(parsed.data.course_slugs);
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
  const { course_slugs: courseSlugs, ...postPatch } = parsed.data;
  await assertCourseSlugsExist(supabase, courseSlugs);
  const previousCourseSlugs = await listPostCourseSlugs(supabase, postId);

  const { data: updated, error } = await supabase
    .from("posts")
    .update(postPatch)
    .eq("id", postId)
    .eq("board_slug", boardSlugRaw)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(mapSupabaseError(error));
  if (!updated) throw new Error("수정할 수 없는 글입니다.");

  await syncPostCourses(supabase, postId, courseSlugs);

  revalidatePath(`/board/${boardSlugRaw}`);
  revalidatePath(`/board/${boardSlugRaw}/${postId}`);
  revalidateCourseHubs([...previousCourseSlugs, ...courseSlugs]);
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
  const previousCourseSlugs = await listPostCourseSlugs(supabase, postId);
  const { data: deleted, error } = await supabase
    .from("posts")
    .update({ is_deleted: true })
    .eq("id", postId)
    .eq("board_slug", boardSlugRaw)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(mapSupabaseError(error));
  if (!deleted) throw new Error("삭제할 수 없는 글입니다.");

  revalidatePath(`/board/${boardSlugRaw}`);
  revalidateCourseHubs(previousCourseSlugs);
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
    !isBoardSlug(boardSlugRaw) ||
    boardSlugRaw !== "qna"
  ) {
    throw new Error("잘못된 요청입니다.");
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("posts")
    .update({
      accepted_comment_id: commentIdResult.data,
      question_status: "solved",
    })
    .eq("id", postIdResult.data)
    .eq("board_slug", "qna")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(mapSupabaseError(error));
  if (!updated) throw new Error("질문 상태를 변경할 수 없습니다.");

  revalidateQuestionLists(postIdResult.data);
}

export async function reopenQuestionAction(formData: FormData) {
  await requireProfile();

  const postIdResult = postIdSchema.safeParse(formData.get("postId"));
  const boardSlugRaw = String(formData.get("boardSlug") ?? "");
  if (
    !postIdResult.success ||
    !isBoardSlug(boardSlugRaw) ||
    boardSlugRaw !== "qna"
  ) {
    throw new Error("잘못된 요청입니다.");
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("posts")
    .update({
      accepted_comment_id: null,
      question_status: "open",
    })
    .eq("id", postIdResult.data)
    .eq("board_slug", "qna")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(mapSupabaseError(error));
  if (!updated) throw new Error("질문 상태를 변경할 수 없습니다.");

  revalidateQuestionLists(postIdResult.data);
}
