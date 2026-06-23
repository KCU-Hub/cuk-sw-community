const DOMAIN_ENV = "ALLOWED_SIGNUP_EMAIL_DOMAINS";

export function isSignupEmailAllowlistRequired(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

export function getAllowedSignupEmailDomains(): string[] {
  return (process.env[DOMAIN_ENV] ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

export function isSignupEmailDomainAllowed(
  email: string | null | undefined,
  allowedDomains = getAllowedSignupEmailDomains(),
  requireAllowlist = isSignupEmailAllowlistRequired(),
): boolean {
  if (allowedDomains.length === 0) return !requireAllowlist;
  const domain = email?.split("@").pop()?.trim().toLowerCase();
  if (!domain) return false;

  return allowedDomains.some((allowedDomain) => {
    if (allowedDomain.startsWith("*.")) {
      const suffix = allowedDomain.slice(2);
      return domain.endsWith(`.${suffix}`);
    }
    return domain === allowedDomain;
  });
}

export function signupEmailDomainErrorMessage(): string {
  return "허용된 학교 이메일 도메인으로만 가입/로그인할 수 있습니다.";
}
