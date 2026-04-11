"use client";

import { useEffect, useRef } from "react";
import { incrementPostViewAction } from "@/actions/posts";

// 24 hours — same browser revisits within this window do not re-bump the
// counter. The RPC is also a defense-in-depth target (anyone with the post id
// can call it), so this only protects against accidental inflation; a
// determined caller can clear localStorage. Server-side dedupe by IP/session
// is the proper fix and is tracked in review.md (P0).
const VIEW_TTL_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = "cuksw:view:";

function shouldFire(postId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = `${STORAGE_PREFIX}${postId}`;
    const raw = window.localStorage.getItem(key);
    const now = Date.now();
    if (raw) {
      const last = Number(raw);
      if (Number.isFinite(last) && now - last < VIEW_TTL_MS) return false;
    }
    window.localStorage.setItem(key, String(now));
    return true;
  } catch {
    // Private mode / quota / disabled — fall back to per-mount counting.
    return true;
  }
}

// Fires once per mount on the client to bump the view count, throttled to
// once per browser per post per 24h. Server-side rendering wouldn't dedupe
// per visitor (would also count prefetches), so we delegate to a tiny client
// effect instead.
export function PostViewTracker({ postId }: { postId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (!shouldFire(postId)) return;
    incrementPostViewAction(postId).catch(() => {
      // best-effort — view counts are non-critical
    });
  }, [postId]);

  return null;
}
