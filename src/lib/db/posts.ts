import { createClient } from "@/lib/supabase/server";
import type { Board, BoardSlug, PostWithAuthor } from "@/lib/types";

const POST_AUTHOR_SELECT = `
  *,
  author:profiles!author_id(id, username, display_name, avatar_url)
`;

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
  return {
    posts: (data ?? []) as unknown as PostWithAuthor[],
    total: count ?? 0,
  };
}

// Visibility is enforced by RLS (`is_deleted = false OR author OR admin`).
// Callers must handle `post.is_deleted` themselves.
export async function getPostById(id: string): Promise<PostWithAuthor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_AUTHOR_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PostWithAuthor | null) ?? null;
}

export async function hasUserLikedPost(
  postId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}
