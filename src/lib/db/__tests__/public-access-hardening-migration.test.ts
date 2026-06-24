import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0020_public_beta_blockers.sql"),
  "utf8",
);

describe("0020 public access hardening migration", () => {
  it("removes direct access to sensitive profile columns", () => {
    expect(migration).toContain("revoke select on public.profiles");
    expect(migration).toContain("grant select (");
    expect(migration).toContain("public.get_current_profile()");
    expect(migration).toContain("public.admin_list_users");
  });

  it("scopes comments and likes to visible parent posts", () => {
    expect(migration).toContain("comments_select_public");
    expect(migration).toContain("post_likes_select_visible_posts");
    expect(migration).toContain("p.is_deleted = false");
  });

  it("makes course files private and bounded", () => {
    expect(migration).toContain("public = false");
    expect(migration).toContain("file_size_limit = 20971520");
    expect(migration).toContain("allowed_mime_types");
  });

  it("moves course/tag limit checks into SQL RPCs", () => {
    expect(migration).toContain("cardinality(v_tags) > 10");
    expect(migration).toContain("cardinality(v_course_slugs) > 3");
    expect(migration).toContain("deleted posts cannot be relinked");
  });
});
