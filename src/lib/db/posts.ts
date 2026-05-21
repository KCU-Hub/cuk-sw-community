import { createClient } from "@/lib/supabase/server";
import { AUTHOR_EMBED } from "@/lib/db/selects";
import type { Board, BoardSlug, PostWithAuthor } from "@/lib/types";

// TODO(2nd-pass-audit-2026-05-21): files in src/lib/db/ use `as unknown as X`
// to bridge PostgREST embed result shapes (Supabase's generated row types
// don't model embedded joins). Document once here — same pattern applies in
// blog.ts / comments.ts / courses.ts. Replacement would be a per-query
// runtime parser (zod) which costs verbosity for marginal type-safety gain.

const POST_AUTHOR_SELECT = `*, ${AUTHOR_EMBED}`;

// With the viewer's post_likes row filtered at the query level via
// .eq('post_likes.user_id', viewerId). When liked, post_likes comes back
// as [{user_id}]; otherwise []. We collapse to a boolean and drop the
// array so callers get a stable PostWithAuthor shape.
const POST_AUTHOR_LIKED_SELECT = `*, ${AUTHOR_EMBED}, post_likes!left(user_id)`;

export async function listBoards(): Promise<Board[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Board[];
}

export async function getBoardBySlug(slug: BoardSlug): Promise<Board | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Board | null) ?? null;
}

export async function getPostsByBoard(
  slug: BoardSlug,
  { page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {},
): Promise<{ posts: PostWithAuthor[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("posts")
    .select(POST_AUTHOR_SELECT, { count: "exact" })
    .eq("board_slug", slug)
    .eq("is_deleted", false)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  // PostgREST embed (`author:profiles!author_id(...)`) 는 supabase-js
  // 의 `.select(literal-string)` 타입 추론 범위 밖이라 `data` 가
  // `any[]` 로 좁혀진다. generated 타입 도입 후에도 embed relation 은
  // 수동 타입이 필요해 캐스트 자체는 남음.
  return {
    posts: (data ?? []) as unknown as PostWithAuthor[],
    total: count ?? 0,
  };
}

// Visibility is enforced by RLS (`is_deleted = false OR author OR admin`).
// Callers must handle `post.is_deleted` themselves.
//
// `viewerId`: when provided, collapses the viewer's post_likes row into
// `liked_by_me` so callers don't need a separate round-trip. Logged-out
// viewers pass `null` and `liked_by_me` stays `false`.
export async function getPostById(
  id: string,
  viewerId?: string | null,
): Promise<PostWithAuthor | null> {
  const supabase = await createClient();

  if (!viewerId) {
    const { data, error } = await supabase
      .from("posts")
      .select(POST_AUTHOR_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { ...(data as unknown as PostWithAuthor), liked_by_me: false };
  }

  const { data, error } = await supabase
    .from("posts")
    .select(POST_AUTHOR_LIKED_SELECT)
    .eq("id", id)
    .eq("post_likes.user_id", viewerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // post_likes 는 filter 때문에 [] 또는 [{user_id: viewerId}] 중 하나.
  const row = data as unknown as PostWithAuthor & {
    post_likes?: Array<{ user_id: string }>;
  };
  const liked = (row.post_likes?.length ?? 0) > 0;
  const { post_likes: _drop, ...rest } = row;
  void _drop;
  return { ...rest, liked_by_me: liked };
}
