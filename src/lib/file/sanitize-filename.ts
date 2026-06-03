// Sanitize a user-supplied filename for use as a Supabase Storage object key.
//
// Defense layers (file-upload-input → here → Storage RLS):
//   1. NFC-normalize            → macOS/APFS hands filenames back as NFD;
//                                 fold combining marks onto their base letter
//                                 before filtering so "café" doesn't lose its
//                                 accent to a dash.
//   2. Replace any character outside [Unicode letter, digit, ., -, _] with "-"
//      → drops path separators (/, \), control chars, quotes, NUL, etc.
//   3. Hard-cap length          → bounds Storage key + UI render.
//   4. Trim leading/trailing "-" → no "look-like-flag" object names. MUST run
//      AFTER the cap: slicing a capped string can re-expose a trailing dash
//      that a pre-slice trim would have missed.
//   5. Fall back to FALLBACK if empty → predictable object key, never "" or a
//      bare "{userId}/{ts}-" suffix.
//
// Even with this stripped, callers MUST prepend "{userId}/" so the bucket's
// RLS policy can match the auth.uid() prefix. This function does NOT add that
// prefix — keep the responsibility split explicit.

// The "\-" escape is SECURITY-CRITICAL, not stylistic: unescaped, ".-_" parses
// as the character range U+002E..U+005F, which includes "/" (U+002F). That
// would let path separators survive and collapse the prefix defense. Do not
// "simplify" this escape away.
const ALLOWED = /[^\p{L}\p{N}.\-_]+/gu;
const TRIM_DASH = /^-+|-+$/g;

export const FILENAME_MAX_LENGTH = 120;
export const FILENAME_FALLBACK = "file";

export function sanitizeFilename(raw: string): string {
  const stripped = raw
    .normalize("NFC")
    .replace(ALLOWED, "-")
    .slice(0, FILENAME_MAX_LENGTH)
    .replace(TRIM_DASH, "");
  return stripped.length > 0 ? stripped : FILENAME_FALLBACK;
}
