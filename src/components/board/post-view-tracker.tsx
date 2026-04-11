"use client";

import { useEffect, useRef } from "react";
import { incrementPostViewAction } from "@/actions/posts";

// Fires once per mount on the client to bump the view count.
// Server-side rendering wouldn't dedupe per visitor (would also count
// prefetches), so we delegate to a tiny client effect instead.
export function PostViewTracker({ postId }: { postId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    incrementPostViewAction(postId).catch(() => {
      // best-effort — view counts are non-critical
    });
  }, [postId]);

  return null;
}
