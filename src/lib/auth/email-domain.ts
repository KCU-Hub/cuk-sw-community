const DOMAIN_ENV = "ALLOWED_SIGNUP_EMAIL_DOMAINS";
const OWNER_EMAIL_ENV = "ARCHIVE_OWNER_EMAIL";

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isSignupEmailAllowlistRequired(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

export function getArchiveOwnerEmail(): string | null {
  return normalizeEmail(process.env[OWNER_EMAIL_ENV]);
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
  ownerEmail = getArchiveOwnerEmail(),
): boolean {
  const normalizedEmail = normalizeEmail(email);
  if (ownerEmail) return normalizedEmail === ownerEmail;
  if (allowedDomains.length === 0) return !requireAllowlist;
  const domain = normalizedEmail?.split("@").pop();
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
  return "Heznpc Archive에서 허용된 owner 계정으로만 로그인할 수 있습니다.";
}
