const admissionGateEnv = ["ARCHIVE_OWNER_EMAIL", "ALLOWED_SIGNUP_EMAIL_DOMAINS"];

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
  const hasAdmissionGate = admissionGateEnv.some((name) => hasValue(name));
  if (!hasAdmissionGate) {
    console.error(
      `Production archive admission gate is not configured: set one of ${admissionGateEnv.join(", ")}`,
    );
    process.exit(1);
  }
}
