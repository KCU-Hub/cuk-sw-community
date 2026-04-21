import { createClient } from "@/lib/supabase/server";
import type {
  Course,
  CourseMaterialWithAuthor,
  MaterialType,
} from "@/lib/types";

const MATERIAL_SELECT = `
  *,
  author:profiles!author_id(id, username, display_name, avatar_url)
`;

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

// Storage public URL — bucket 이 public=true 이므로 직접 URL 조립.
// supabase-js 의 getPublicUrl 을 쓰면 env 에 의존해 그냥 컴포넌트에서
// helper 호출.
export function publicCourseFileUrl(
  supabaseUrl: string,
  path: string,
): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/course-files/${encodeURI(path)}`;
}
