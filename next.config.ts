import type { NextConfig } from "next";

// Supabase endpoint for CSP connect-src. At build time the browser-side
// env is inlined already; we mirror the same value into the header.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Minimal sane CSP. Goals:
//   - No third-party fonts (Pretendard is now bundled via next/font/local).
//   - Allow Supabase API/realtime over HTTPS + WSS.
//   - Allow inline styles (Tailwind v4 + next/font injects inline <style>).
//   - Allow Next's inline bootstrap script via 'unsafe-inline' — eliminating
//     this would require a full nonce-based pipeline; not today's battle.
function buildCsp(): string {
  const connect = ["'self'", "https:", "wss:"];
  if (SUPABASE_URL) {
    try {
      const url = new URL(SUPABASE_URL);
      // redundant with https:/wss: above but explicit for readers
      connect.push(url.origin);
      connect.push(url.origin.replace("https://", "wss://"));
    } catch {
      /* ignore malformed env */
    }
  }

  // React's dev runtime uses eval() for debugging features; without
  // 'unsafe-eval' the dev console throws. Production never needs it.
  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? ["'self'", "'unsafe-inline'"]
      : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": Array.from(new Set(connect)),
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");
}

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy", value: buildCsp() },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
