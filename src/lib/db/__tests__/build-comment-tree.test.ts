import { describe, expect, it } from "vitest";
import { buildCommentTree } from "../comments";
import type { CommentWithAuthor } from "@/lib/types";

// Minimal factory — buildCommentTree only cares about id / parent_id / is_deleted,
// but we need the full CommentWithAuthor shape for the type to line up.
let seq = 0;
function mk(
  opts: Partial<Pick<CommentWithAuthor, "id" | "parent_id" | "is_deleted">> & {
    id: string;
  },
): CommentWithAuthor {
  seq += 1;
  return {
    id: opts.id,
    post_id: "p1",
    parent_id: opts.parent_id ?? null,
    author_id: "u1",
    content: `content-${opts.id}`,
    is_deleted: opts.is_deleted ?? false,
    created_at: new Date(2026, 0, 1, 0, 0, seq).toISOString(),
    updated_at: new Date(2026, 0, 1, 0, 0, seq).toISOString(),
    author: {
      id: "u1",
      username: "alice",
      display_name: "Alice",
      avatar_url: null,
    },
  };
}

describe("buildCommentTree", () => {
  it("returns [] for empty input", () => {
    expect(buildCommentTree([])).toEqual([]);
  });

  it("builds a flat list of roots (no parent_id)", () => {
    const tree = buildCommentTree([mk({ id: "a" }), mk({ id: "b" })]);
    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe("a");
    expect(tree[1].id).toBe("b");
    expect(tree[0].children).toEqual([]);
  });

  it("nests child under parent via parent_id", () => {
    const tree = buildCommentTree([
      mk({ id: "root" }),
      mk({ id: "child", parent_id: "root" }),
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("root");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe("child");
  });

  it("supports multi-level nesting up to depth cap (3)", () => {
    const tree = buildCommentTree([
      mk({ id: "l0" }),
      mk({ id: "l1", parent_id: "l0" }),
      mk({ id: "l2", parent_id: "l1" }),
      mk({ id: "l3", parent_id: "l2" }),
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].children[0].children[0].children[0].id).toBe("l3");
  });

  it("preserves soft-deleted parent node (parent stays in tree)", () => {
    const tree = buildCommentTree([
      mk({ id: "root", is_deleted: true }),
      mk({ id: "child", parent_id: "root" }),
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("root");
    expect(tree[0].is_deleted).toBe(true);
    expect(tree[0].children[0].id).toBe("child");
  });

  it("promotes orphan to root when parent row is missing (hard delete path)", () => {
    // Per comments.ts: soft-deleted parent still has a row, so orphaning only
    // happens when an admin issued a raw `delete`. Surface such children as
    // roots rather than losing them.
    const tree = buildCommentTree([
      mk({ id: "orphan", parent_id: "ghost" }),
      mk({ id: "normal" }),
    ]);
    // orphan -> root; normal -> root; order = input order
    expect(tree).toHaveLength(2);
    const ids = tree.map((n) => n.id);
    expect(ids).toContain("orphan");
    expect(ids).toContain("normal");
    const orphan = tree.find((n) => n.id === "orphan")!;
    expect(orphan.children).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const input = [mk({ id: "a" }), mk({ id: "b", parent_id: "a" })];
    const snapshot = JSON.parse(JSON.stringify(input));
    buildCommentTree(input);
    expect(input).toEqual(snapshot);
  });

  it("each node carries a fresh children array (no cross-tree aliasing)", () => {
    const tree = buildCommentTree([
      mk({ id: "a" }),
      mk({ id: "b" }),
    ]);
    expect(tree[0].children).not.toBe(tree[1].children);
  });
});
