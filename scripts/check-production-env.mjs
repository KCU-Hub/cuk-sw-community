const requiredWhenProduction = ["ALLOWED_SIGNUP_EMAIL_DOMAINS"];

function isProductionLike() {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

function hasValue(name) {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .some(Boolean);
}

if (isProductionLike()) {
  const missing = requiredWhenProduction.filter((name) => !hasValue(name));
  if (missing.length > 0) {
    console.error(
      `Production admission gate is not configured: ${missing.join(", ")}`,
    );
    process.exit(1);
  }
}
