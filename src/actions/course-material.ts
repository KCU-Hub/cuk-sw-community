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

function firstError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "입력값을 확인해주세요.";
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
  await requireProfile();

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
