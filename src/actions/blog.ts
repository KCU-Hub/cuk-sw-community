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
  };
}

type ParsedBlogInput = CreateBlogPostInput;

// profile.id + slug 는 자주 쓰므로 한 번에 묶어 받음.
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function upsertMissingTags(
  supabase: SupabaseServerClient,
  tags: string[],
): Promise<void> {
  if (tags.length === 0) return;
  const rows = tags.map((slug) => ({ slug, name: slug }));
  const { error } = await supabase
    .from("tags")
    .upsert(rows, { onConflict: "slug", ignoreDuplicates: true });
  if (error) throw new Error(mapSupabaseError(error));
}

async function syncPostTags(
  supabase: SupabaseServerClient,
  postId: string,
  tags: string[],
): Promise<void> {
  // N 이 10 이하로 cap 되어 있어 delete-all → insert-all 이 최소 로직.
  const { error: delError } = await supabase
    .from("blog_post_tags")
    .delete()
    .eq("post_id", postId);
  if (delError) throw new Error(mapSupabaseError(delError));

  if (tags.length === 0) return;
  const rows = tags.map((tag_slug) => ({ post_id: postId, tag_slug }));
  const { error: insError } = await supabase
    .from("blog_post_tags")
    .insert(rows);
  if (insError) throw new Error(mapSupabaseError(insError));
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
  await upsertMissingTags(supabase, parsed.data.tags);

  const { data, error } = await supabase
    .from("blog_posts")
    .insert(toUpsertRow(parsed.data, profile.id))
    .select("id, slug")
    .single();
  if (error) mapSlugError(error);

  await syncPostTags(supabase, data.id, parsed.data.tags);

  revalidatePath("/blog");
  revalidatePath(`/blog/${profile.username}`);
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
  await upsertMissingTags(supabase, parsed.data.tags);

  const { error } = await supabase
    .from("blog_posts")
    .update(toUpsertRow(parsed.data, null))
    .eq("id", postIdResult.data);
  if (error) mapSlugError(error);

  await syncPostTags(supabase, postIdResult.data, parsed.data.tags);

  revalidatePath("/blog");
  revalidatePath(`/blog/${profile.username}`);
  revalidatePath(`/blog/${profile.username}/${parsed.data.slug}`);
  redirect(`/blog/${profile.username}/${parsed.data.slug}`);
}

export async function deleteBlogPostAction(formData: FormData) {
  await requireProfile();

  const postIdRaw = String(formData.get("postId") ?? "");
  const postIdResult = blogPostIdSchema.safeParse(postIdRaw);
  if (!postIdResult.success) throw new Error(firstError(postIdResult.error));

  const supabase = await createClient();
  const { error } = await supabase
    .from("blog_posts")
    .update({ is_deleted: true })
    .eq("id", postIdResult.data);
  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath("/blog");
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
