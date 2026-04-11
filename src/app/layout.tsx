import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CUK SW Community",
    template: "%s · CUK SW Community",
  },
  description:
    "고려사이버대학교 소프트웨어학부 학생들을 위한 커뮤니티, 블로그, 과목 자료실",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="grid min-h-screen grid-rows-[auto_1fr] bg-white text-zinc-900 antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
