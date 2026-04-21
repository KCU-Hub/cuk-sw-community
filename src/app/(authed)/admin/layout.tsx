import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-user";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireAdmin redirects non-admins to '/', so the child tree is safe to
  // assume the viewer is an admin.
  await requireAdmin();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav aria-label="admin-nav" className="mb-6 flex gap-4 text-sm">
        <Link
          href="/admin/users"
          className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          사용자
        </Link>
      </nav>
      {children}
    </div>
  );
}
