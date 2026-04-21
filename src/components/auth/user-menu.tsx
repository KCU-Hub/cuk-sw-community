import Link from "next/link";
import type { Profile } from "@/lib/types";

export function UserMenu({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-3">
      {profile.role === "admin" && (
        <Link
          href="/admin/users"
          className="rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-900 hover:bg-brand-100"
        >
          admin
        </Link>
      )}
      <Link
        href="/me"
        className="text-sm font-medium text-zinc-900 hover:text-brand-600"
      >
        {profile.display_name || profile.username}
      </Link>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="text-sm text-zinc-500 transition hover:text-zinc-900"
        >
          로그아웃
        </button>
      </form>
    </div>
  );
}
