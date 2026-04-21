"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import { mapSupabaseError } from "@/lib/errors";

// Providers we've wired up in Supabase Dashboard → Authentication → Providers.
// Adding a new one here requires (1) enabling it in the dashboard and (2)
// registering a matching OAuth app with the vendor.
const SUPPORTED_PROVIDERS: readonly Provider[] = ["google", "kakao"] as const;

function isSupportedProvider(value: string): value is Provider {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(value);
}

async function currentOrigin(): Promise<string> {
  const h = await headers();
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (envOrigin) return envOrigin.replace(/\/$/, "");
  // Fall back to request-derived origin during local dev when SITE_URL isn't set.
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

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

// OAuth kickoff. The form posts `provider=google|kakao` and `intent=login|signup`
// (the latter determines the fallback route if the provider URL can't be
// generated). Actual session exchange happens in src/app/(auth)/auth/callback.
export async function signInWithProviderAction(formData: FormData) {
  const providerRaw = String(formData.get("provider") ?? "");
  const intent = formData.get("intent") === "signup" ? "signup" : "login";

  if (!isSupportedProvider(providerRaw)) {
    redirectWithError(`/${intent}`, "지원하지 않는 로그인 방식입니다.");
  }

  const supabase = await createClient();
  const origin = await currentOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: providerRaw,
    options: {
      redirectTo: `${origin}/auth/callback?next=/me`,
    },
  });

  if (error || !data?.url) {
    redirectWithError(
      `/${intent}`,
      error ? mapSupabaseError(error) : "OAuth 연결에 실패했습니다.",
    );
  }

  redirect(data.url);
}
