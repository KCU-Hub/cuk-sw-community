import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/get-user";
import { UserMenu } from "@/components/auth/user-menu";

type NavItem = { href: string; label: string; authedOnly?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/board", label: "게시판" },
  { href: "/blog", label: "블로그" },
  { href: "/courses", label: "자료실" },
  { href: "/gpa", label: "학점", authedOnly: true },
];

export async function SiteHeader() {
  const profile = await getCurrentProfile();
  const navItems = NAV_ITEMS.filter((item) => !item.authedOnly || profile);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight"
        >
          <span className="text-brand-600">CUK</span>{" "}
          <span className="text-zinc-900">SW</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {profile ? (
            <UserMenu profile={profile} />
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
