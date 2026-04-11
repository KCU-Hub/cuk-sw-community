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
