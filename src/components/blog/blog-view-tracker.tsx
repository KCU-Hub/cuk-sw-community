"use client";

import { useEffect, useRef } from "react";
import { incrementBlogPostViewAction } from "@/actions/blog";

const VIEW_LOG_KEY_PREFIX = "blog-viewed:";
const TTL_MS = 24 * 60 * 60 * 1000;

// Forum 의 PostViewTracker 와 동형 — 24h 안에 같은 브라우저의 재방문은
// 클라이언트 단에서 한번 걸러 서버 RPC 호출을 아낌. 서버 쪽도
// blog_post_view_log 의 (post_id, viewer_key, viewed_on) unique 로 이중
// dedupe.
export function BlogViewTracker({ postId }: { postId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    try {
      const raw = window.localStorage.getItem(VIEW_LOG_KEY_PREFIX + postId);
      const recentlySeen = raw && Date.now() - Number(raw) < TTL_MS;
      if (recentlySeen) return;
      window.localStorage.setItem(
        VIEW_LOG_KEY_PREFIX + postId,
        String(Date.now()),
      );
    } catch {
      // localStorage 차단된 환경은 그냥 서버로 갱신 요청
    }

    void incrementBlogPostViewAction(postId);
  }, [postId]);

  return null;
}
