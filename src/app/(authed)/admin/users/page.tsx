import { listRecentAuditLogs, listUsersForAdmin } from "@/lib/db/admin";
import { Pagination } from "@/components/ui/pagination";
import { UserRow } from "@/components/admin/user-row";
import { formatDateTimeKo } from "@/lib/format";
import { formatAuthorName } from "@/lib/author";
import type { AuditLogListItem } from "@/lib/db/admin";

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

  const [{ users, total }, auditLogs] = await Promise.all([
    listUsersForAdmin({
      page,
      pageSize: PAGE_SIZE,
      search,
    }),
    listRecentAuditLogs(),
  ]);
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

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">최근 관리자 조치</h2>
        <div className="mt-3 overflow-hidden rounded-md border border-zinc-100 bg-white">
          {auditLogs.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">
              기록된 관리자 조치가 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {auditLogs.map((log) => (
                <AuditLogRow key={log.id} log={log} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function AuditLogRow({ log }: { log: AuditLogListItem }) {
  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-zinc-900">{log.action}</span>
        <span className="text-zinc-400">·</span>
        <time className="text-xs text-zinc-500" dateTime={log.created_at}>
          {formatDateTimeKo(log.created_at)}
        </time>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        관리자 {formatAuthorName(log.admin)} → 대상 {formatAuthorName(log.target)}
      </p>
      {log.reason && (
        <p className="mt-1 text-xs text-zinc-600">사유: {log.reason}</p>
      )}
    </li>
  );
}
