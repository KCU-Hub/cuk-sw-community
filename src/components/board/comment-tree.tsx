import type { BoardSlug, CommentNode } from "@/lib/types";
import { COMMENT_REPLY_DEPTH_CAP } from "@/lib/constants";
import { CommentItem } from "./comment-item";

export function CommentTree({
  nodes,
  postId,
  boardSlug,
  currentUserId,
  isAdmin,
  depth = 0,
}: {
  nodes: CommentNode[];
  postId: string;
  boardSlug: BoardSlug;
  currentUserId: string | null;
  isAdmin: boolean;
  depth?: number;
}) {
  if (nodes.length === 0) return null;

  return (
    <ul
      className={
        depth === 0
          ? "space-y-6"
          : "mt-3 space-y-3 border-l border-zinc-100 pl-4"
      }
    >
      {nodes.map((node) => (
        <li key={node.id}>
          <CommentItem
            comment={node}
            postId={postId}
            boardSlug={boardSlug}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            allowReply={depth < COMMENT_REPLY_DEPTH_CAP}
          />
          {node.children.length > 0 && (
            <CommentTree
              nodes={node.children}
              postId={postId}
              boardSlug={boardSlug}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
