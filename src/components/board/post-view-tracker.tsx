"use client";

import { useEffect, useRef } from "react";
import { incrementPostViewAction } from "@/actions/posts";

// Client-side 24h throttle — saves a round trip on same-browser revisits.
// The server-side `post_view_log` is the authoritative dedupe.
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
