// Shared application types.
// Once `supabase gen types typescript` is wired up (Phase 2), these will be
// re-exported from the generated `database.types.ts` instead.

export type UserRole = "user" | "admin";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type BoardSlug = "free" | "qna" | "notice";

export type Board = {
  slug: BoardSlug;
  name: string;
  description: string | null;
  sort_order: number;
};

export type Post = {
  id: string;
  board_slug: BoardSlug;
  // null ⇢ author account was deleted (on delete set null). Render as
  // "탈퇴한 사용자" in the UI.
  author_id: string | null;
  title: string;
  content: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

// Joined view of a post + minimal author profile + viewer's like state.
// `author` mirrors `author_id`: null ⇢ deleted account.
export type PostWithAuthor = Post & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> | null;
  liked_by_me?: boolean;
};

export type Comment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  // null ⇢ author account was deleted (on delete set null).
  author_id: string | null;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type CommentWithAuthor = Comment & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> | null;
};

// Tree node for nested comment rendering
export type CommentNode = CommentWithAuthor & {
  children: CommentNode[];
};
