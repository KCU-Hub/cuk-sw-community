import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0022_heznpc_archive_mode.sql"),
  "utf8",
);

describe("0022 Heznpc Archive mode migration", () => {
  it("defines admin-backed archive writers", () => {
    expect(migration).toContain("public.is_archive_writer()");
    expect(migration).toContain("select public.is_admin()");
    expect(migration).toContain("grant execute on function public.is_archive_writer()");
  });

  it("keeps content writes behind archive-writer policies", () => {
    for (const policy of [
      "posts_insert_authed",
      "comments_insert_authed",
      "blog_posts_insert_authed",
      "course_materials_insert_authed",
    ]) {
      expect(migration).toContain(policy);
    }
    expect(migration).toContain("(select public.is_archive_writer())");
    expect(migration).toContain("auth.uid() = author_id");
  });

  it("protects course material file paths at SQL level", () => {
    expect(migration).toContain("validate_course_material_archive_fields");
    expect(migration).toContain("course material file path owner mismatch");
    expect(migration).toContain("unsupported course material file extension");
    expect(migration).toContain("course material needs content, external_url, or file_path");
  });

  it("requires archive-writer access inside link replacement RPCs", () => {
    expect(migration).toContain("not public.is_archive_writer()");
    expect(migration).not.toContain("auth.uid() <> v_author_id and not public.is_admin()");
  });
});
