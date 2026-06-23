import Link from "next/link";
import type { ReactNode } from "react";

export function Pagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const prev = currentPage > 1 ? currentPage - 1 : null;
  const next = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <nav
      aria-label="페이지네이션"
      className="mt-8 flex items-center justify-between"
    >
      <PageLink href={prev ? pageHref(basePath, prev) : null}>
        ← 이전
      </PageLink>
      <span className="text-sm text-zinc-500" aria-live="polite">
        {currentPage} / {totalPages}
      </span>
      <PageLink href={next ? pageHref(basePath, next) : null}>
        다음 →
      </PageLink>
    </nav>
  );
}

function pageHref(basePath: string, page: number): string {
  return `${basePath}${basePath.includes("?") ? "&" : "?"}page=${page}`;
}

function PageLink({
  href,
  children,
}: {
  href: string | null;
  children: ReactNode;
}) {
  if (!href) {
    return (
      <span aria-disabled className="cursor-default text-sm text-zinc-300">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="text-sm font-medium text-zinc-700 hover:text-brand-700"
    >
      {children}
    </Link>
  );
}
