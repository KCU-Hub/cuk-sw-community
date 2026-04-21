import { createClient } from "@/lib/supabase/server";
import type {
  BlogPost,
  BlogPostWithAuthor,
  BlogSeries,
  Tag,
} from "@/lib/types";

// PostgREST 는 중첩 embed 까지 지원 — author, tags(M:N via blog_post_tags),
// series 를 한 번에 가져와 N+1 회피.
const BLOG_POST_SELECT = `
  *,
  author:profiles!author_id(id, username, display_name, avatar_url),
  blog_post_tags(tag_slug, tags(slug, name)),
  series:blog_series(id, title)
`;

type RawBlogPostRow = BlogPost & {
  author: BlogPostWithAuthor["author"];
  blog_post_tags?: Array<{ tag_slug: string; tags: Tag | null }>;
  series: BlogPostWithAuthor["series"];
};

function normalize(row: RawBlogPostRow): BlogPostWithAuthor {
  const tags: Tag[] = (row.blog_post_tags ?? [])
    .map((t) => t.tags)
    .filter((t): t is Tag => t !== null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { blog_post_tags: _drop, ...rest } = row;
  return { ...rest, tags };
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

  let query = supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT, { count: "exact" })
    .eq("is_deleted", false)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (!includeDrafts) query = query.eq("is_published", true);
  if (authorId) query = query.eq("author_id", authorId);
  if (seriesId) query = query.eq("series_id", seriesId);
  if (tag) {
    // inner join — 해당 태그가 있는 post 만
    query = query.filter("blog_post_tags.tag_slug", "eq", tag);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  let posts = ((data ?? []) as unknown as RawBlogPostRow[]).map(normalize);

  // `filter("blog_post_tags.tag_slug", "eq", tag)` 는 embed 에만 필터를 걸어
  // 태그가 없는 post 도 `blog_post_tags: []` 로 돌아옴. 클라이언트에서 한번
  // 더 걸러준다.
  if (tag) {
    posts = posts.filter((p) => p.tags.some((t) => t.slug === tag));
  }

  return { posts, total: count ?? 0 };
}

// velog 스타일 /@{username}/{slug} 대응.
export async function getBlogPostByAuthorSlug(
  username: string,
  slug: string,
): Promise<BlogPostWithAuthor | null> {
  const supabase = await createClient();

  // author_id 조회 → blog_posts
  const { data: author, error: authorError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (authorError) throw authorError;
  if (!author) return null;

  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT)
    .eq("author_id", (author as { id: string }).id)
    .eq("slug", slug)
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

export async function listTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("slug, name")
    .order("name");
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
