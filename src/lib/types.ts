// Shared application types.
//
// Base row types are currently handwritten. Run `npm run types:gen:local`
// (requires running Supabase) to generate `src/lib/types.generated.ts`,
// then migrate these to re-export from the generated file. Domain types
// (PostWithAuthor, CommentNode) will stay in this file.

export type UserRole = "user" | "admin";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  // 영구 ban. banned_until 과 독립 — is_banned=true 면 만료 없음.
  is_banned: boolean;
  // 만료 시각 (미래 timestamptz). null 또는 과거면 ban 해제 상태.
  banned_until: string | null;
  ban_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type BoardSlug = "free" | "qna" | "notice";

export type Board = {
  slug: BoardSlug;
  name: string;
  description: string | null;
  sort_order: number;
  is_admin_only: boolean;
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
  question_status: "open" | "solved" | null;
  accepted_comment_id: string | null;
  created_at: string;
  updated_at: string;
};

// Joined view of a post + minimal author profile + viewer's like state.
// `author` mirrors `author_id`: null ⇢ deleted account.
export type PostWithAuthor = Post & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> | null;
  courses: Course[];
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

// =====================================================================
// Phase 3 — 블로그
// =====================================================================

export type Tag = {
  slug: string;
  name: string;
};

export type BlogSeries = {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogPost = {
  id: string;
  // null ⇢ 탈퇴한 사용자 (on delete set null)
  author_id: string | null;
  series_id: string | null;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  cover_image: string | null;
  is_published: boolean;
  is_deleted: boolean;
  like_count: number;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogPostWithAuthor = BlogPost & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> | null;
  tags: Tag[];
  series: Pick<BlogSeries, "id" | "title"> | null;
  courses: Course[];
};

// =====================================================================
// Phase 4 — 과목 자료실
// =====================================================================

export type Course = {
  slug: string;
  name: string;
  code: string | null;
  description: string | null;
  semester_hint: string | null;
  sort_order: number;
};

export const MATERIAL_TYPES = [
  "lecture",
  "assignment",
  "exam",
  "link",
  "other",
] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  lecture: "강의",
  assignment: "과제",
  exam: "시험",
  link: "링크",
  other: "기타",
};

export function isMaterialType(value: string): value is MaterialType {
  return (MATERIAL_TYPES as readonly string[]).includes(value);
}

export type CourseMaterial = {
  id: string;
  course_slug: string;
  author_id: string | null;
  material_type: MaterialType;
  title: string;
  content: string;
  external_url: string | null;
  file_path: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type CourseMaterialWithAuthor = CourseMaterial & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> | null;
};

// =====================================================================
// 학점 관리 (0017)
// =====================================================================

// public.grade enum 과 동기화. P/NP 는 평점 계산에서 제외 (lib/gpa.ts).
export const GRADES = [
  "A+", "A",
  "B+", "B",
  "C+", "C",
  "D+", "D",
  "F",
  "P", "NP",
] as const;
export type Grade = (typeof GRADES)[number];

export type UserCourse = {
  id: string;
  user_id: string;
  semester: string;
  course_name: string;
  course_code: string | null;
  // numeric(3,1) → JS number 로 들어옴
  credits: number;
  grade: Grade;
  is_excluded: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string;
};
