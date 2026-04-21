import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";

// `u:<uid>` for authed users, `a:<sha256(ip|ua)[:32]>` for anon. Returns null
// when anon without any stable identifier — callers should skip the bump in
// that case so the log isn't polluted with identical empty keys.
export async function buildViewerKey(user: User | null): Promise<string | null> {
  if (user) return `u:${user.id}`;

  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ua = h.get("user-agent") ?? "";
  if (!forwardedFor && !ua) return null;
  const hash = createHash("sha256").update(`${forwardedFor}|${ua}`).digest("hex");
  return `a:${hash.slice(0, 32)}`;
}
