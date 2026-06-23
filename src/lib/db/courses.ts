import { createClient } from "@/lib/supabase/server";
import { AUTHOR_EMBED } from "@/lib/db/selects";
import { COURSE_FILES_BUCKET } from "@/lib/constants";
import { MATERIAL_TYPES } from "@/lib/types";
import type {
  BlogPost,
  BlogPostWithAuthor,
  BlogSeries,
  Course,
  CourseMaterialWithAuthor,
  MaterialType,
  PostWithAuthor,
  Tag,
} from "@/lib/types";

const MATERIAL_SELECT = `*, ${AUTHOR_EMBED}`;
const COURSE_EMBED =
  "post_courses(course:courses(slug, name, code, description, semester_hint, sort_order))";
const POST_SELECT = `*, ${AUTHOR_EMBED}, ${COURSE_EMBED}`;
const BLOG_POST_SELECT = `
  *,
  ${AUTHOR_EMBED},
  blog_post_tags(tag_slug, tags(slug, name)),
  series:blog_series(id, title),
  blog_post_courses(course:courses(slug, name, code, description, semester_hint, sort_order))
`;

type RawPostRow = PostWithAuthor & {
  post_courses?: Array<{ course: Course | null }>;
};

type RawBlogPostRow = BlogPost & {
  author: BlogPostWithAuthor["author"];
  blog_post_tags?: Array<{ tag_slug: string; tags: Tag | null }>;
  blog_post_courses?: Array<{ course: Course | null }>;
  series: Pick<BlogSeries, "id" | "title"> | null;
};

function normalizePost(row: RawPostRow): PostWithAuthor {
  const courses = (row.post_courses ?? [])
    .map((item) => item.course)
    .filter((course): course is Course => course !== null);
  const { post_courses: _drop, ...rest } = row;
  void _drop;
  return { ...rest, courses };
}

function normalizeBlogPost(row: RawBlogPostRow): BlogPostWithAuthor {
  const tags = (row.blog_post_tags ?? [])
    .map((item) => item.tags)
    .filter((tag): tag is Tag => tag !== null);
  const courses = (row.blog_post_courses ?? [])
    .map((item) => item.course)
    .filter((course): course is Course => course !== null);
  const { blog_post_tags: _dropTags, blog_post_courses: _dropCourses, ...rest } =
    row;
  void _dropTags;
  void _dropCourses;
  return { ...rest, tags, courses };
}

export type CourseMaterialStats = {
  total: number;
  byType: Record<MaterialType, number>;
};

export async function listCourses(): Promise<Course[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function getCourseBySlug(
  slug: string,
): Promise<Course | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Course | null) ?? null;
}

export async function listCourseMaterials({
  courseSlug,
  page = 1,
  pageSize = 20,
  type,
  search,
}: {
  courseSlug: string;
  page?: number;
  pageSize?: number;
  type?: MaterialType;
  search?: string;
}): Promise<{ materials: CourseMaterialWithAuthor[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("course_materials")
    .select(MATERIAL_SELECT, { count: "exact" })
    .eq("course_slug", courseSlug)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (type) query = query.eq("material_type", type);

  if (search && search.trim()) {
    // plainto_tsquery('simple', <q>) @@ tsv — simple dict 는 한국어도
    // prefix match 가능. PostgREST 의 .textSearch 로 바인딩.
    query = query.textSearch("tsv", search.trim(), {
      type: "plain",
      config: "simple",
    });
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    materials: (data ?? []) as unknown as CourseMaterialWithAuthor[],
    total: count ?? 0,
  };
}

export async function getCourseMaterialStats(
  courseSlug: string,
): Promise<CourseMaterialStats> {
  const supabase = await createClient();

  const emptyByType = MATERIAL_TYPES.reduce(
    (acc, materialType) => {
      acc[materialType] = 0;
      return acc;
    },
    {} as Record<MaterialType, number>,
  );

  const totalQuery = supabase
    .from("course_materials")
    .select("id", { count: "exact", head: true })
    .eq("course_slug", courseSlug)
    .eq("is_deleted", false);

  const countQueries = MATERIAL_TYPES.map(async (materialType) => {
    const { count, error } = await supabase
      .from("course_materials")
      .select("id", { count: "exact", head: true })
      .eq("course_slug", courseSlug)
      .eq("is_deleted", false)
      .eq("material_type", materialType);
    if (error) throw error;
    return [materialType, count ?? 0] as const;
  });

  const [{ count: total, error: totalError }, ...typeCounts] =
    await Promise.all([totalQuery, ...countQueries]);
  if (totalError) throw totalError;

  for (const [materialType, count] of typeCounts) {
    emptyByType[materialType] = count;
  }

  return {
    total: total ?? 0,
    byType: emptyByType,
  };
}

export async function listCourseRelatedPosts({
  courseSlug,
  limit = 5,
}: {
  courseSlug: string;
  limit?: number;
}): Promise<PostWithAuthor[]> {
  const supabase = await createClient();
  const { data: links, error: linkError } = await supabase
    .from("post_courses")
    .select("post_id")
    .eq("course_slug", courseSlug)
    .order("created_at", { ascending: false })
    .limit(limit * 3);
  if (linkError) throw linkError;

  const ids = Array.from(new Set((links ?? []).map((link) => link.post_id)));
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .in("id", ids)
    .eq("board_slug", "qna")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as RawPostRow[]).map(normalizePost);
}

export async function listCourseRelatedBlogPosts({
  courseSlug,
  limit = 5,
}: {
  courseSlug: string;
  limit?: number;
}): Promise<BlogPostWithAuthor[]> {
  const supabase = await createClient();
  const { data: links, error: linkError } = await supabase
    .from("blog_post_courses")
    .select("post_id")
    .eq("course_slug", courseSlug)
    .order("created_at", { ascending: false })
    .limit(limit * 3);
  if (linkError) throw linkError;

  const ids = Array.from(new Set((links ?? []).map((link) => link.post_id)));
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT)
    .in("id", ids)
    .eq("is_published", true)
    .eq("is_deleted", false)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as RawBlogPostRow[]).map(normalizeBlogPost);
}

export async function getCourseMaterialById(
  id: string,
): Promise<CourseMaterialWithAuthor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_materials")
    .select(MATERIAL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as CourseMaterialWithAuthor | null) ?? null;
}

// Storage download URL — bucket is private, so detail pages mint a short-lived
// signed URL instead of exposing permanent object URLs.
export async function getCourseFileDownloadUrl(path: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(COURSE_FILES_BUCKET)
    .createSignedUrl(path, 10 * 60);
  if (error) throw error;
  return data.signedUrl;
}
