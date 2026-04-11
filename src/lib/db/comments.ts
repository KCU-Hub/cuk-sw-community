import { createClient } from "@/lib/supabase/server";
import type { CommentNode, CommentWithAuthor } from "@/lib/types";

const COMMENT_AUTHOR_SELECT = `
  *,
  author:profiles!author_id(id, username, display_name, avatar_url)
`;

export async function getCommentsByPost(
  postId: string,
): Promise<CommentWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_AUTHOR_SELECT)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CommentWithAuthor[];
}

// Builds a parent → children tree from a flat list.
//
// Soft delete is the normal path (`update is_deleted = true` in
// src/actions/comments.ts), so a deleted parent still has its row in the
// table and `byId.get(parent_id)` succeeds. The orphan branch below only
// fires when an admin issues a hard `delete` against the table directly —
// e.g. for moderation. In that case the children's `parent_id` points at
// nothing and we surface them as roots so the conversation isn't lost.
export function buildCommentTree(
  comments: CommentWithAuthor[],
): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of comments) {
    byId.set(c.id, { ...c, children: [] });
  }

  for (const c of comments) {
    const node = byId.get(c.id)!;
    if (c.parent_id) {
      const parent = byId.get(c.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        // Hard-deleted parent — promote orphan to root.
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}
