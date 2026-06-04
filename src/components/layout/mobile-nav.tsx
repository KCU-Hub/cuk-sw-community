"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type NavItem = { href: string; label: string };

// Mobile hamburger nav. The desktop <nav> in SiteHeader is `hidden sm:flex`,
// so without this the nav links are unreachable below the sm breakpoint.
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  // Close on Escape; lock body scroll while the panel is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-14 z-30 cursor-default bg-zinc-900/20"
          />
          <nav
            id="mobile-nav-panel"
            className="absolute inset-x-0 top-full z-40 border-b border-zinc-100 bg-white shadow-lg"
          >
            <ul className="mx-auto max-w-5xl px-2 py-2">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
