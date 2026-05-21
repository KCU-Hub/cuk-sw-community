// Sanitize a user-supplied filename for use as a Supabase Storage object key.
//
// Defense layers (file-upload-input → here → Storage RLS):
//   1. Replace any character outside [Unicode letter, digit, ., -, _] with "-"
//      → drops path separators (/, \), control chars, quotes, NUL, etc.
//   2. Trim leading/trailing "-"        → no "look-like-flag" object names
//   3. Hard-cap length                  → bounds Storage key + UI render
//   4. Fall back to FALLBACK if empty   → predictable object key, never "" or
//                                         a bare "{userId}/{ts}-" suffix
//
// Even with this stripped, callers MUST prepend "{userId}/" so the bucket's
// RLS policy can match the auth.uid() prefix. This function does NOT add
// that prefix — keep the responsibility split explicit.

const ALLOWED = /[^\p{L}\p{N}.\-_]+/gu;
const TRIM_DASH = /^-+|-+$/g;

export const FILENAME_MAX_LENGTH = 120;
export const FILENAME_FALLBACK = "file";

export function sanitizeFilename(raw: string): string {
  const stripped = raw
    .replace(ALLOWED, "-")
    .replace(TRIM_DASH, "")
    .slice(0, FILENAME_MAX_LENGTH);
  return stripped.length > 0 ? stripped : FILENAME_FALLBACK;
}
