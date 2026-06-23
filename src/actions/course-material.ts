"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-user";
import {
  createCourseMaterialSchema,
  updateCourseMaterialSchema,
  courseMaterialIdSchema,
} from "@/lib/validation/course-material";
import { mapSupabaseError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { firstError } from "@/lib/form";
import type { Profile } from "@/lib/types";
import { COURSE_FILES_BUCKET } from "@/lib/constants";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const ALLOWED_COURSE_FILE_EXTENSIONS = new Set([
  "pdf",
  "zip",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "txt",
  "md",
]);

type CourseMaterialActionTarget = {
  course_slug: string;
  file_path: string | null;
};

// 업로드된 파일 경로의 첫 segment 는 업로더 user_id 여야 한다 (Storage RLS
// 와 동일 규칙). zod 는 형태만 보장하므로 소유권은 여기서 강제.
//
//   - admin 은 본인이 올린 새 파일이면 본인 ID, 다른 사용자의 자료를
//     모더레이션 중이면 기존 file_path 가 그대로 들어올 수 있어 통과.
//   - 일반 사용자는 항상 본인 ID 시작이어야 함.
function assertFilePathOwnership(
  filePath: string,
  profile: Pick<Profile, "id" | "role">,
  previousFilePath: string | null,
): void {
  if (!filePath) return;
  if (filePath === previousFilePath) return; // 변경 없음 — 그대로 통과
  const [first] = filePath.split("/");
  if (first === profile.id) return;
  if (profile.role === "admin") return; // 모더레이션 시 다른 사용자 path 허용
  throw new Error("업로드 경로의 소유자와 계정이 일치하지 않습니다.");
}

function assertAllowedCourseFilePath(filePath: string): void {
  if (!filePath) return;
  const fileName = filePath.split("/").pop() ?? "";
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_COURSE_FILE_EXTENSIONS.has(extension)) {
    throw new Error("허용되지 않는 첨부 파일 형식입니다.");
  }
}

async function getCourseMaterialActionTarget(
  supabase: SupabaseServerClient,
  materialId: string,
): Promise<CourseMaterialActionTarget> {
  const { data, error } = await supabase
    .from("course_materials")
    .select("course_slug, file_path")
    .eq("id", materialId)
    .maybeSingle();
  if (error) throw new Error(mapSupabaseError(error));
  if (!data) throw new Error("자료를 찾을 수 없습니다.");
  return data as CourseMaterialActionTarget;
}

async function cleanupCourseFile(
  supabase: SupabaseServerClient,
  filePath: string | null,
): Promise<void> {
  if (!filePath) return;
  const { error } = await supabase.storage.from(COURSE_FILES_BUCKET).remove([filePath]);
  if (error) throw new Error(mapSupabaseError(error));
}

export async function createCourseMaterialAction(formData: FormData) {
  const profile = await requireProfile();

  const parsed = createCourseMaterialSchema.safeParse({
    course_slug: formData.get("course_slug"),
    material_type: formData.get("material_type") ?? "other",
    title: formData.get("title"),
    content: formData.get("content") ?? "",
    external_url: formData.get("external_url") ?? "",
    file_path: formData.get("file_path") ?? "",
  });
  if (!parsed.success) throw new Error(firstError(parsed.error));
  // create 는 비교할 previousFilePath 가 없음 — 항상 본인 ID 시작.
  assertFilePathOwnership(parsed.data.file_path ?? "", profile, null);
  assertAllowedCourseFilePath(parsed.data.file_path ?? "");

  // 자료 생성은 post_create rate limit 를 공유
  await enforceRateLimit(profile.id, "post_create");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_materials")
    .insert({
      course_slug: parsed.data.course_slug,
      author_id: profile.id,
      material_type: parsed.data.material_type,
      title: parsed.data.title,
      content: parsed.data.content ?? "",
      external_url: parsed.data.external_url || null,
      file_path: parsed.data.file_path || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath(`/courses/${parsed.data.course_slug}`);
  redirect(`/courses/${parsed.data.course_slug}/${data.id}`);
}

export async function updateCourseMaterialAction(formData: FormData) {
  const profile = await requireProfile();

  const materialIdRaw = String(formData.get("materialId") ?? "");
  const idResult = courseMaterialIdSchema.safeParse(materialIdRaw);
  if (!idResult.success) throw new Error(firstError(idResult.error));

  const parsed = updateCourseMaterialSchema.safeParse({
    material_type: formData.get("material_type") ?? "other",
    title: formData.get("title"),
    content: formData.get("content") ?? "",
    external_url: formData.get("external_url") ?? "",
    file_path: formData.get("file_path") ?? "",
  });
  if (!parsed.success) throw new Error(firstError(parsed.error));

  const supabase = await createClient();

  const target = await getCourseMaterialActionTarget(supabase, idResult.data);
  const submittedFilePath = parsed.data.file_path ?? "";
  assertFilePathOwnership(submittedFilePath, profile, target.file_path);
  assertAllowedCourseFilePath(submittedFilePath);

  const { data: updated, error } = await supabase
    .from("course_materials")
    .update({
      material_type: parsed.data.material_type,
      title: parsed.data.title,
      content: parsed.data.content ?? "",
      external_url: parsed.data.external_url || null,
      file_path: parsed.data.file_path || null,
    })
    .eq("id", idResult.data)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(mapSupabaseError(error));
  if (!updated) throw new Error("수정할 수 없는 자료입니다.");

  if (target.file_path && target.file_path !== submittedFilePath) {
    await cleanupCourseFile(supabase, target.file_path);
  }

  revalidatePath(`/courses/${target.course_slug}`);
  revalidatePath(`/courses/${target.course_slug}/${idResult.data}`);
  redirect(`/courses/${target.course_slug}/${idResult.data}`);
}

export async function deleteCourseMaterialAction(formData: FormData) {
  await requireProfile();

  const materialIdRaw = String(formData.get("materialId") ?? "");
  const idResult = courseMaterialIdSchema.safeParse(materialIdRaw);
  if (!idResult.success) throw new Error(firstError(idResult.error));

  const supabase = await createClient();
  const target = await getCourseMaterialActionTarget(supabase, idResult.data);
  const { data: deleted, error } = await supabase
    .from("course_materials")
    .update({ is_deleted: true })
    .eq("id", idResult.data)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(mapSupabaseError(error));
  if (!deleted) throw new Error("삭제할 수 없는 자료입니다.");

  await cleanupCourseFile(supabase, target.file_path);

  revalidatePath(`/courses/${target.course_slug}`);
  redirect(`/courses/${target.course_slug}`);
}
