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

// file_path 의 첫 segment 는 업로더 user_id 여야 하며 (Storage RLS 와 동일),
// 로그인한 caller 의 profile.id 와 정확히 일치해야 한다. zod 는 형태만
// 보장하고, 소유권은 여기서 강제.
function assertFilePathOwnership(filePath: string, profileId: string): void {
  if (!filePath) return;
  const [first] = filePath.split("/");
  if (first !== profileId) {
    throw new Error("업로드 경로의 소유자와 계정이 일치하지 않습니다.");
  }
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
  assertFilePathOwnership(parsed.data.file_path ?? "", profile.id);

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
  assertFilePathOwnership(parsed.data.file_path ?? "", profile.id);

  const supabase = await createClient();
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
