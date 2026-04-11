import Link from "next/link";
import type { Profile } from "@/lib/types";

export function UserMenu({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-3">
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
