"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-user";
import {
  createCourseMaterialSchema,
  updateCourseMaterialSchema,
  courseMaterialIdSchema,
  courseSlugSchema,
} from "@/lib/validation/course-material";
import { mapSupabaseError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { firstError } from "@/lib/form";
import type { Profile } from "@/lib/types";

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
  const courseSlugRaw = String(formData.get("course_slug") ?? "");
  const idResult = courseMaterialIdSchema.safeParse(materialIdRaw);
  const slugResult = courseSlugSchema.safeParse(courseSlugRaw);
  if (!idResult.success) throw new Error(firstError(idResult.error));
  if (!slugResult.success) throw new Error(firstError(slugResult.error));

  const parsed = updateCourseMaterialSchema.safeParse({
    material_type: formData.get("material_type") ?? "other",
    title: formData.get("title"),
    content: formData.get("content") ?? "",
    external_url: formData.get("external_url") ?? "",
    file_path: formData.get("file_path") ?? "",
  });
  if (!parsed.success) throw new Error(firstError(parsed.error));

  const supabase = await createClient();

  // 기존 행을 1회 lookup 해서 file_path 가 정말 바뀌었을 때만 새 owner
  // 검증을 적용. admin 모더레이션 시 form 의 hidden 'file_path' 가
  // 그대로 다른 사용자 ID 시작이라도 변경 없음 ⇒ 통과.
  const { data: existing, error: lookupError } = await supabase
    .from("course_materials")
    .select("file_path")
    .eq("id", idResult.data)
    .maybeSingle();
  if (lookupError) throw new Error(mapSupabaseError(lookupError));

  assertFilePathOwnership(
    parsed.data.file_path ?? "",
    profile,
    (existing?.file_path as string | null | undefined) ?? null,
  );

  const { error } = await supabase
    .from("course_materials")
    .update({
      material_type: parsed.data.material_type,
      title: parsed.data.title,
      content: parsed.data.content ?? "",
      external_url: parsed.data.external_url || null,
      file_path: parsed.data.file_path || null,
    })
    .eq("id", idResult.data);
  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath(`/courses/${slugResult.data}`);
  revalidatePath(`/courses/${slugResult.data}/${idResult.data}`);
  redirect(`/courses/${slugResult.data}/${idResult.data}`);
}

export async function deleteCourseMaterialAction(formData: FormData) {
  await requireProfile();

  const materialIdRaw = String(formData.get("materialId") ?? "");
  const courseSlugRaw = String(formData.get("course_slug") ?? "");
  const idResult = courseMaterialIdSchema.safeParse(materialIdRaw);
  const slugResult = courseSlugSchema.safeParse(courseSlugRaw);
  if (!idResult.success) throw new Error(firstError(idResult.error));
  if (!slugResult.success) throw new Error(firstError(slugResult.error));

  const supabase = await createClient();
  const { error } = await supabase
    .from("course_materials")
    .update({ is_deleted: true })
    .eq("id", idResult.data);
  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath(`/courses/${slugResult.data}`);
  redirect(`/courses/${slugResult.data}`);
}
