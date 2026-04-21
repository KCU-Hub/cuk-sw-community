import { listUsersForAdmin } from "@/lib/db/admin";
import { Pagination } from "@/components/ui/pagination";
import { UserRow } from "@/components/admin/user-row";
import { formatDateTimeKo } from "@/lib/format";

export const metadata = { title: "사용자 관리" };

const PAGE_SIZE = 30;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageStr, q } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);
  const search = (q ?? "").slice(0, 40);

  const { users, total } = await listUsersForAdmin({
    page,
    pageSize: PAGE_SIZE,
    search,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const now = new Date();

  return (
    <main>
      <h1 className="text-2xl font-bold tracking-tight">사용자 관리</h1>
      <p className="mt-1 text-sm text-zinc-500">
        전체 {total.toLocaleString()} 명. 마지막 스냅샷 {formatDateTimeKo(now)}.
      </p>

      <form className="mt-6" role="search">
        <label htmlFor="q" className="sr-only">
          사용자 검색
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={search}
          placeholder="username / display name 검색"
          className="block w-full max-w-sm rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </form>

      <div className="mt-6 overflow-hidden rounded-md border border-zinc-100">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">사용자</th>
              <th className="px-3 py-2 font-medium">역할</th>
              <th className="px-3 py-2 font-medium">활동</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 font-medium">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-zinc-400"
                >
                  일치하는 사용자가 없습니다.
                </td>
              </tr>
            ) : (
              users.map((u) => <UserRow key={u.id} user={u} now={now} />)
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/admin/users"
      />
    </main>
  );
}
