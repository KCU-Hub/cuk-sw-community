import { createClient } from "@/lib/supabase/server";
import { AUTHOR_EMBED } from "@/lib/db/selects";
import type {
  BlogPost,
  BlogPostWithAuthor,
  BlogSeries,
  Tag,
} from "@/lib/types";

// author + tags (M:N) + series 를 한 번에 embed. tag 필터는 아래서
// `blog_post_tags!inner` 로 bake 한 variant 를 따로 쓴다.
const BLOG_POST_SELECT = `
  *,
  ${AUTHOR_EMBED},
  blog_post_tags(tag_slug, tags(slug, name)),
  series:blog_series(id, title)
`;

// tag 로 필터할 땐 inner join 으로 해당 태그가 붙은 post 만 outer 에
// 남도록 하고, 표시용 tags 는 full outer embed 로 따로 붙여줌.
const BLOG_POST_SELECT_TAG_FILTERED = `
  *,
  ${AUTHOR_EMBED},
  tag_match:blog_post_tags!inner(tag_slug),
  blog_post_tags(tag_slug, tags(slug, name)),
  series:blog_series(id, title)
`;

type RawBlogPostRow = BlogPost & {
  author: BlogPostWithAuthor["author"];
  blog_post_tags?: Array<{ tag_slug: string; tags: Tag | null }>;
  series: BlogPostWithAuthor["series"];
  tag_match?: unknown;
};

function normalize(row: RawBlogPostRow): BlogPostWithAuthor {
  const tags: Tag[] = (row.blog_post_tags ?? [])
    .map((t) => t.tags)
    .filter((t): t is Tag => t !== null);
  return {
    ...row,
    tags,
    // embed-only 필드는 반환 타입에 없으므로 함께 덮어써 제거.
    blog_post_tags: undefined,
    tag_match: undefined,
  } as BlogPostWithAuthor;
}

export async function listBlogPosts({
  page = 1,
  pageSize = 12,
  tag,
  authorId,
  seriesId,
  includeDrafts = false,
}: {
  page?: number;
  pageSize?: number;
  tag?: string;
  authorId?: string;
  seriesId?: string;
  includeDrafts?: boolean;
} = {}): Promise<{ posts: BlogPostWithAuthor[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const select = tag ? BLOG_POST_SELECT_TAG_FILTERED : BLOG_POST_SELECT;
  let query = supabase
    .from("blog_posts")
    .select(select, { count: "exact" })
    .eq("is_deleted", false)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (!includeDrafts) query = query.eq("is_published", true);
  if (authorId) query = query.eq("author_id", authorId);
  if (seriesId) query = query.eq("series_id", seriesId);
  if (tag) {
    // `blog_post_tags!inner` 덕분에 이 eq 는 outer row 를 필터함 —
    // count 도 태그-필터된 값으로 올바르게 반환됨.
    query = query.eq("tag_match.tag_slug", tag);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const posts = ((data ?? []) as unknown as RawBlogPostRow[]).map(normalize);
  return { posts, total: count ?? 0 };
}

// `/blog/{username}/{slug}` 한 번의 쿼리로 resolve.
// `author:profiles!inner` 로 inner join 해서 username 까지 같이 필터.
const BLOG_POST_SELECT_AUTHOR_INNER = `
  *,
  author:profiles!inner(id, username, display_name, avatar_url),
  blog_post_tags(tag_slug, tags(slug, name)),
  series:blog_series(id, title)
`;

export async function getBlogPostByAuthorSlug(
  username: string,
  slug: string,
): Promise<BlogPostWithAuthor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT_AUTHOR_INNER)
    .eq("slug", slug)
    .eq("author.username", username)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalize(data as unknown as RawBlogPostRow);
}

export async function getBlogPostById(
  id: string,
): Promise<BlogPostWithAuthor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalize(data as unknown as RawBlogPostRow);
}

export async function listTags({ limit = 50 }: { limit?: number } = {}): Promise<
  Tag[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("slug, name")
    .order("name")
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Tag[];
}

export async function listSeriesByAuthor(
  authorId: string,
): Promise<BlogSeries[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_series")
    .select("*")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BlogSeries[];
}

export async function getProfileByUsername(username: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data as
    | {
        id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        bio: string | null;
      }
    | null;
}
