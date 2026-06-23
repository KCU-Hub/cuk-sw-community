import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isSignupEmailDomainAllowed,
  signupEmailDomainErrorMessage,
} from "@/lib/auth/email-domain";

// Handles redirects from:
//  1. Email confirmation links (Supabase signs up the user, then bounces here)
//  2. OAuth providers in Phase 5 (Google, Kakao)
// Both flows attach a `code` query param that we exchange for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/me";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!isSignupEmailDomainAllowed(user?.email)) {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            `${origin}/login?${new URLSearchParams({
              error: signupEmailDomainErrorMessage(),
            })}`,
          );
        }
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch {
      // Fall through to error redirect below
    }
  }

  const message = "인증 링크가 유효하지 않거나 만료되었습니다.";
  return NextResponse.redirect(
    `${origin}/login?${new URLSearchParams({ error: message })}`,
  );
}
