"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import { mapSupabaseError } from "@/lib/errors";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?${new URLSearchParams({ error: message })}`);
}

export async function signInAction(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("/login", parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) redirectWithError("/login", mapSupabaseError(error));

  revalidatePath("/", "layout");
  redirect("/me");
}

export async function signUpAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("/signup", parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) redirectWithError("/signup", mapSupabaseError(error));

  revalidatePath("/", "layout");
  // Supabase returns `session: null` when email confirmation is enabled —
  // the user must click the link in their email before they can sign in.
  if (!data.session) redirect("/auth/check-email");
  redirect("/me");
}
