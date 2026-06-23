"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/require-user";
import { mapSupabaseError, PG_ERROR_CODES } from "@/lib/errors";
import {
  type ProfileFormState,
  updateProfileSchema,
} from "@/lib/validation/profile";

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const profile = await requireProfile();

  const parsed = updateProfileSchema.safeParse({
    username: formData.get("username"),
    display_name: formData.get("display_name"),
    bio: formData.get("bio"),
    avatar_url: formData.get("avatar_url"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "입력값을 확인해주세요.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", profile.id)
    .select("id")
    .maybeSingle();

  if (error) {
    const code = typeof error.code === "string" ? error.code : null;
    return {
      status: "error",
      message:
        code === PG_ERROR_CODES.UNIQUE_VIOLATION
          ? "이미 사용 중인 사용자명입니다."
          : mapSupabaseError(error),
      fieldErrors: {},
    };
  }

  if (!updated) {
    return {
      status: "error",
      message: "수정할 수 없는 프로필입니다.",
      fieldErrors: {},
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/me");
  revalidatePath("/me/edit");
  revalidatePath(`/blog/${profile.username}`);
  if (parsed.data.username !== profile.username) {
    revalidatePath(`/blog/${parsed.data.username}`);
  }

  return {
    status: "success",
    message: "프로필을 저장했습니다.",
    fieldErrors: {},
  };
}
