import type { Metadata } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";
import "highlight.js/styles/github-dark.min.css";

// Self-host Pretendard via next/font/local so we don't depend on
// jsdelivr CDN (→ simpler CSP, no font FOIT on cold cache, no third-party
// privacy footprint). Variable file taken from npm `pretendard@1.3.9`.
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_NAME = "CUK SW Community";
const SITE_DESCRIPTION =
  "고려사이버대학교 소프트웨어학부 학생들을 위한 커뮤니티, 블로그, 과목 자료실";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={pretendard.variable}>
      <body className="grid min-h-screen grid-rows-[auto_1fr] bg-white text-zinc-900 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          본문으로 건너뛰기
        </a>
        <SiteHeader />
        {/* tabIndex=-1 so the skip-link moves keyboard focus here, not just
            the scroll position. Page-level <main> elements remain the landmarks. */}
        <div id="main-content" tabIndex={-1} className="outline-none">
          {children}
        </div>
      </body>
    </html>
  );
}
