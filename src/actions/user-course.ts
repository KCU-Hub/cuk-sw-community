"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-user";
import {
  createUserCourseSchema,
  updateUserCourseSchema,
  userCourseIdSchema,
} from "@/lib/validation/user-course";
import { mapSupabaseError } from "@/lib/errors";
import { firstError, formBool } from "@/lib/form";

function readFormPayload(formData: FormData) {
  return {
    semester: String(formData.get("semester") ?? ""),
    course_name: String(formData.get("course_name") ?? ""),
    course_code: String(formData.get("course_code") ?? ""),
    credits: String(formData.get("credits") ?? ""),
    grade: String(formData.get("grade") ?? ""),
    is_excluded: formBool(formData, "is_excluded", false),
    memo: String(formData.get("memo") ?? ""),
  };
}

export async function createUserCourseAction(formData: FormData) {
  const profile = await requireProfile();

  const parsed = createUserCourseSchema.safeParse(readFormPayload(formData));
  if (!parsed.success) throw new Error(firstError(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("user_courses").insert({
    user_id: profile.id,
    semester: parsed.data.semester,
    course_name: parsed.data.course_name,
    course_code: parsed.data.course_code || null,
    credits: parsed.data.credits,
    grade: parsed.data.grade,
    is_excluded: parsed.data.is_excluded,
    memo: parsed.data.memo || null,
  });
  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath("/gpa");
  redirect("/gpa");
}

export async function updateUserCourseAction(formData: FormData) {
  await requireProfile();

  const idRaw = String(formData.get("courseId") ?? "");
  const idResult = userCourseIdSchema.safeParse(idRaw);
  if (!idResult.success) throw new Error(firstError(idResult.error));

  const parsed = updateUserCourseSchema.safeParse(readFormPayload(formData));
  if (!parsed.success) throw new Error(firstError(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_courses")
    .update({
      semester: parsed.data.semester,
      course_name: parsed.data.course_name,
      course_code: parsed.data.course_code || null,
      credits: parsed.data.credits,
      grade: parsed.data.grade,
      is_excluded: parsed.data.is_excluded,
      memo: parsed.data.memo || null,
    })
    .eq("id", idResult.data);
  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath("/gpa");
  redirect("/gpa");
}

export async function deleteUserCourseAction(formData: FormData) {
  await requireProfile();

  const idRaw = String(formData.get("courseId") ?? "");
  const idResult = userCourseIdSchema.safeParse(idRaw);
  if (!idResult.success) throw new Error(firstError(idResult.error));

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_courses")
    .delete()
    .eq("id", idResult.data);
  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath("/gpa");
  redirect("/gpa");
}

export async function toggleUserCourseExcludedAction(formData: FormData) {
  await requireProfile();

  const idRaw = String(formData.get("courseId") ?? "");
  const idResult = userCourseIdSchema.safeParse(idRaw);
  if (!idResult.success) throw new Error(firstError(idResult.error));

  const nextExcluded = formBool(formData, "next_excluded", false);

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_courses")
    .update({ is_excluded: nextExcluded })
    .eq("id", idResult.data);
  if (error) throw new Error(mapSupabaseError(error));

  revalidatePath("/gpa");
}
