import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0021_public_table_grants.sql"),
  "utf8",
);

describe("0021 public table grants migration", () => {
  it("opens public catalogue and content reads through RLS", () => {
    expect(migration).toContain("grant select on");
    for (const table of [
      "public.boards",
      "public.courses",
      "public.tags",
      "public.posts",
      "public.comments",
      "public.blog_posts",
      "public.course_materials",
    ]) {
      expect(migration).toContain(table);
    }
    expect(migration).toContain("to anon, authenticated");
  });

  it("keeps profiles column-scoped instead of table-wide", () => {
    expect(migration).toContain("grant select (");
    expect(migration).toContain("username");
    expect(migration).toContain("avatar_url");
    expect(migration).not.toContain("grant select on public.profiles");
  });

  it("permits authenticated write entry points behind RLS", () => {
    expect(migration).toContain("grant insert, update on");
    expect(migration).toContain("grant insert, delete on public.post_likes");
    expect(migration).toContain("public.user_courses");
    expect(migration).toContain("public.rate_limit_events");
    expect(migration).toContain("to authenticated");
  });

  it("does not open hard-delete or direct link-table write bypasses", () => {
    expect(migration).toContain("grant insert, update on");
    expect(migration).not.toContain(
      "grant insert, update, delete on\n  public.posts",
    );
    expect(migration).not.toContain(
      "grant insert, delete on\n  public.blog_post_tags",
    );
    expect(migration).not.toContain("grant insert on public.post_courses");
    expect(migration).not.toContain("grant delete on public.blog_post_courses");
  });

  it("limits direct post like reads to the current authenticated viewer", () => {
    expect(migration).toContain("grant select on public.post_likes to authenticated");
    expect(migration).toContain("drop policy if exists post_likes_select_visible_posts");
    expect(migration).toContain("post_likes_select_own_visible_post");
    expect(migration).toContain("auth.uid() = user_id");
  });
});
