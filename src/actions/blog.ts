"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-user";
import {
  createBlogPostSchema,
  updateBlogPostSchema,
  blogPostIdSchema,
  slugifyFallback,
} from "@/lib/validation/blog";
import { mapSupabaseError, PG_ERROR_CODES } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";

function firstError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "입력값을 확인해주세요.";
}

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

async function upsertMissingTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tags: string[],
) {
  if (tags.length === 0) return;
  // tags.insert(..., on conflict do nothing) 동등 — 이미 seed 된 것은 무시.
  const rows = tags.map((slug) => ({ slug, name: slug }));
  const { error } = await supabase
    .from("tags")
    .upsert(rows, { onConflict: "slug", ignoreDuplicates: true });
  if (error) throw new Error(mapSupabaseError(error));
}

async function syncPostTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
  tags: string[],
) {
  // naive: 기존 연결 전부 지우고 새로 삽입. 태그 10 개 이내라 비용 무시.
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

export async function createBlogPostAction(formData: FormData) {
  const profile = await requireProfile();

  const rawTitle = String(formData.get("title") ?? "");
  const rawSlug = String(formData.get("slug") ?? "").trim();

  const parsed = createBlogPostSchema.safeParse({
    title: rawTitle,
    slug: rawSlug || slugifyFallback(rawTitle),
    content: formData.get("content"),
    excerpt: formData.get("excerpt") ?? "",
    cover_image: formData.get("cover_image") ?? "",
    is_published: formData.get("is_published") === "on" || formData.get("is_published") === "true",
    series_id: formData.get("series_id") ?? "",
    tags: parseTagList(formData.get("tags")),
  });

  if (!parsed.success) throw new Error(firstError(parsed.error));

  // post_create rate limit 를 공유 — 블로그 글도 같은 한도
  await enforceRateLimit(profile.id, "post_create");

  const supabase = await createClient();
  await upsertMissingTags(supabase, parsed.data.tags);

  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      author_id: profile.id,
      series_id: parsed.data.series_id || null,
      slug: parsed.data.slug,
      title: parsed.data.title,
      content: parsed.data.content,
      excerpt: parsed.data.excerpt || null,
      cover_image: parsed.data.cover_image || null,
      is_published: parsed.data.is_published,
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
      throw new Error("이미 같은 slug 의 글이 있습니다. 다른 slug 를 사용해주세요.");
    }
    throw new Error(mapSupabaseError(error));
  }

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

  const rawTitle = String(formData.get("title") ?? "");
  const rawSlug = String(formData.get("slug") ?? "").trim();

  const parsed = updateBlogPostSchema.safeParse({
    title: rawTitle,
    slug: rawSlug || slugifyFallback(rawTitle),
    content: formData.get("content"),
    excerpt: formData.get("excerpt") ?? "",
    cover_image: formData.get("cover_image") ?? "",
    is_published: formData.get("is_published") === "on" || formData.get("is_published") === "true",
    series_id: formData.get("series_id") ?? "",
    tags: parseTagList(formData.get("tags")),
  });

  if (!parsed.success) throw new Error(firstError(parsed.error));

  const supabase = await createClient();
  await upsertMissingTags(supabase, parsed.data.tags);

  const { error } = await supabase
    .from("blog_posts")
    .update({
      series_id: parsed.data.series_id || null,
      slug: parsed.data.slug,
      title: parsed.data.title,
      content: parsed.data.content,
      excerpt: parsed.data.excerpt || null,
      cover_image: parsed.data.cover_image || null,
      is_published: parsed.data.is_published,
    })
    .eq("id", postIdResult.data);

  if (error) {
    if (error.code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
      throw new Error("같은 slug 의 다른 글이 있습니다. slug 를 바꿔주세요.");
    }
    throw new Error(mapSupabaseError(error));
  }

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

// ---------------------------------------------------------------------
// View count increment — forum 과 동일한 viewer-key 패턴 (0014 의 RPC)
// ---------------------------------------------------------------------
async function buildViewerKey(user: User | null): Promise<string | null> {
  if (user) return `u:${user.id}`;
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ua = h.get("user-agent") ?? "";
  if (!forwardedFor && !ua) return null;
  const hash = createHash("sha256").update(`${forwardedFor}|${ua}`).digest("hex");
  return `a:${hash.slice(0, 32)}`;
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
