// Shared PostgREST embed selects. Keep in one place so drift between
// forum / blog / course / admin queries is impossible.

export const AUTHOR_EMBED =
  "author:profiles!author_id(id, username, display_name, avatar_url)";
