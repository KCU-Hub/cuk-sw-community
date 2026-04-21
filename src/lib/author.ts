import type { Profile } from "@/lib/types";

// Pick minimal author fields we embed via PostgREST.
type AuthorLike = Pick<Profile, "display_name" | "username"> | null | undefined;

// Centralized display name resolution.
//   null/undefined author ⇢ account was deleted (on delete set null).
//   populated author ⇢ display_name ?? username.
// Keep this in sync with the author payload embedded in lib/db/*.ts.
export const DELETED_AUTHOR_LABEL = "탈퇴한 사용자";

export function formatAuthorName(author: AuthorLike): string {
  if (!author) return DELETED_AUTHOR_LABEL;
  return author.display_name || author.username;
}
