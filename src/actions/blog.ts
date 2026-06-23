"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-user";
import {
  createBlogPostSchema,
  updateBlogPostSchema,
  blogPostIdSchema,
  slugifyFallback,
  type CreateBlogPostInput,
} from "@/lib/validation/blog";
import { mapSupabaseError, PG_ERROR_CODES } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildViewerKey } from "@/lib/viewer-key";
import { firstError, formBool } from "@/lib/form";

const NEW_SERIES_TITLE_MAX_LENGTH = 120;

function parseTagList(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0),
    ),
  );
}

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

// 폼 → zod 입력 변환. create / update 가 공유.
function readFormPayload(
  formData: FormData,
): Pick<
  CreateBlogPostInput,
  | "title"
  | "slug"
  | "content"
  | "excerpt"
  | "cover_image"
  | "is_published"
  | "series_id"
  | "tags"
  | "course_slugs"
> {
  const rawTitle = String(formData.get("title") ?? "");
  const rawSlug = String(formData.get("slug") ?? "").trim();
  return {
    title: rawTitle,
    slug: rawSlug || slugifyFallback(rawTitle),
    content: String(formData.get("content") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    cover_image: String(formData.get("cover_image") ?? ""),
    // Default MUST be false: an HTML checkbox omits its field entirely when
    // unchecked, so defaulting to true would silently re-publish a post the
    // user just unchecked to keep private. The form's defaultChecked={true}
    // still submits "on" for the common publish case.
    is_published: formBool(formData, "is_published", false),
    series_id: String(formData.get("series_id") ?? ""),
    tags: parseTagList(formData.get("tags")),
    course_slugs: readCourseSlugs(formData),
  };
}

type ParsedBlogInput = CreateBlogPostInput;

// profile.id + slug 는 자주 쓰므로 한 번에 묶어 받음.
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type BlogPostEditTarget = {
  slug: string;
  author_id: string | null;
  author: { username: string } | null;
};

async function syncPostTags(
  supabase: SupabaseServerClient,
  postId: string,
  tags: string[],
): Promise<void> {
  const { error } = await supabase.rpc("set_blog_post_tags", {
    p_post_id: postId,
    p_tags: tags,
  });
  if (error) throw new Error(mapSupabaseError(error));
}

async function syncPostCourses(
  supabase: SupabaseServerClient,
  postId: string,
  courseSlugs: string[],
): Promise<void> {
  const { error } = await supabase.rpc("set_blog_post_courses", {
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

async function listBlogPostCourseSlugs(
  supabase: SupabaseServerClient,
  postId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("blog_post_courses")
    .select("course_slug")
    .eq("post_id", postId);
  if (error) throw new Error(mapSupabaseError(error));
  return Array.from(new Set((data ?? []).map((link) => link.course_slug)));
}

async function getBlogPostEditTarget(
  supabase: SupabaseServerClient,
  postId: string,
): Promise<BlogPostEditTarget> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, author_id, author:profiles!author_id(username)")
    .eq("id", postId)
    .maybeSingle();
  if (error) throw new Error(mapSupabaseError(error));
  if (!data) throw new Error("수정할 수 없는 글입니다.");
  return data as unknown as BlogPostEditTarget;
}

function readNewSeriesTitle(formData: FormData): string {
  return String(formData.get("new_series_title") ?? "").trim();
}

async function resolveSeriesId({
  supabase,
  selectedSeriesId,
  newSeriesTitle,
  ownerId,
  requesterId,
}: {
  supabase: SupabaseServerClient;
  selectedSeriesId?: string;
  newSeriesTitle: string;
  ownerId: string | null;
  requesterId: string;
}): Promise<string> {
  if (selectedSeriesId || !newSeriesTitle) return selectedSeriesId ?? "";
  if (newSeriesTitle.length > NEW_SERIES_TITLE_MAX_LENGTH) {
    throw new Error("시리즈 제목은 최대 120자입니다.");
  }
  if (!ownerId) throw new Error("시리즈를 만들 작성자를 찾을 수 없습니다.");
  if (ownerId !== requesterId) {
    throw new Error("다른 사용자의 글에는 새 시리즈를 대신 만들 수 없습니다.");
  }

  const { data, error } = await supabase
    .from("blog_series")
    .insert({
      author_id: ownerId,
      title: newSeriesTitle,
    })
    .select("id")
    .single();
  if (error) throw new Error(mapSupabaseError(error));
  return data.id;
}

function revalidateCourseHubs(courseSlugs: string[]): void {
  for (const courseSlug of new Set(courseSlugs)) {
    revalidatePath(`/courses/${courseSlug}`);
  }
}

function toUpsertRow(input: ParsedBlogInput, authorId: string | null) {
  // author_id 는 create 시에만 세팅 (null 이면 update 경로).
  return {
    ...(authorId !== null ? { author_id: authorId } : {}),
    series_id: input.series_id || null,
    slug: input.slug,
    title: input.title,
    content: input.content,
    excerpt: input.excerpt || null,
    cover_image: input.cover_image || null,
    is_published: input.is_published,
  };
}

function mapSlugError(error: { code?: string | number | null }): never {
  if (error.code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
    throw new Error("같은 slug 의 다른 글이 있습니다. slug 를 바꿔주세요.");
  }
  throw new Error(mapSupabaseError(error));
}

export async function createBlogPostAction(formData: FormData) {
  const profile = await requireProfile();

  const parsed = createBlogPostSchema.safeParse(readFormPayload(formData));
  if (!parsed.success) throw new Error(firstError(parsed.error));

  await enforceRateLimit(profile.id, "post_create");

  const supabase = await createClient();
  await assertCourseSlugsExist(supabase, parsed.data.course_slugs);
  const seriesId = await resolveSeriesId({
    supabase,
    selectedSeriesId: parsed.data.series_id,
    newSeriesTitle: readNewSeriesTitle(formData),
    ownerId: profile.id,
    requesterId: profile.id,
  });
  const input = { ...parsed.data, series_id: seriesId };

  const { data, error } = await supabase
    .from("blog_posts")
    .insert(toUpsertRow(input, profile.id))
    .select("id, slug")
    .single();
  if (error) mapSlugError(error);

  await syncPostTags(supabase, data.id, input.tags);
  await syncPostCourses(supabase, data.id, input.course_slugs);

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${profile.username}`);
  revalidateCourseHubs(input.course_slugs);
  redirect(`/blog/${profile.username}/${data.slug}`);
}

export async function updateBlogPostAction(formData: FormData) {
  const profile = await requireProfile();

  const postIdRaw = String(formData.get("postId") ?? "");
  const postIdResult = blogPostIdSchema.safeParse(postIdRaw);
  if (!postIdResult.success) throw new Error(firstError(postIdResult.error));

  const parsed = updateBlogPostSchema.safeParse(readFormPayload(formData));
  if (!parsed.success) throw new Error(firstError(parsed.error));

  const supabase = await createClient();
  await assertCourseSlugsExist(supabase, parsed.data.course_slugs);
  const [targetPost, previousCourseSlugs] = await Promise.all([
    getBlogPostEditTarget(supabase, postIdResult.data),
    listBlogPostCourseSlugs(supabase, postIdResult.data),
  ]);
  const ownerUsername = targetPost.author?.username;
  if (!ownerUsername) throw new Error("글 작성자 정보를 찾을 수 없습니다.");
  const seriesId = await resolveSeriesId({
    supabase,
    selectedSeriesId: parsed.data.series_id,
    newSeriesTitle: readNewSeriesTitle(formData),
    ownerId: targetPost.author_id,
    requesterId: profile.id,
  });
  const input = { ...parsed.data, series_id: seriesId };

  const { data: updated, error } = await supabase
    .from("blog_posts")
    .update(toUpsertRow(input, null))
    .eq("id", postIdResult.data)
    .select("id")
    .maybeSingle();
  if (error) mapSlugError(error);
  if (!updated) throw new Error("수정할 수 없는 글입니다.");

  await syncPostTags(supabase, postIdResult.data, input.tags);
  await syncPostCourses(supabase, postIdResult.data, input.course_slugs);

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${ownerUsername}`);
  revalidatePath(`/blog/${ownerUsername}/${targetPost.slug}`);
  revalidatePath(`/blog/${ownerUsername}/${input.slug}`);
  revalidateCourseHubs([...previousCourseSlugs, ...input.course_slugs]);
  redirect(`/blog/${ownerUsername}/${input.slug}`);
}

export async function deleteBlogPostAction(formData: FormData) {
  await requireProfile();

  const postIdRaw = String(formData.get("postId") ?? "");
  const postIdResult = blogPostIdSchema.safeParse(postIdRaw);
  if (!postIdResult.success) throw new Error(firstError(postIdResult.error));

  const supabase = await createClient();
  const previousCourseSlugs = await listBlogPostCourseSlugs(
    supabase,
    postIdResult.data,
  );
  const { data: deleted, error } = await supabase
    .from("blog_posts")
    .update({ is_deleted: true })
    .eq("id", postIdResult.data)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(mapSupabaseError(error));
  if (!deleted) throw new Error("삭제할 수 없는 글입니다.");

  revalidatePath("/");
  revalidatePath("/blog");
  revalidateCourseHubs(previousCourseSlugs);
  redirect("/blog");
}

export async function incrementBlogPostViewAction(postId: string) {
  const parsed = blogPostIdSchema.safeParse(postId);
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerKey = await buildViewerKey(user);
  if (!viewerKey) return;

  await supabase.rpc("increment_blog_post_view", {
    p_post_id: parsed.data,
    p_viewer_key: viewerKey,
  });
}
