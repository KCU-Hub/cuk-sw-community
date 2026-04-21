import { banUserAction, unbanUserAction } from "@/actions/admin";
import { formatDateTimeKo } from "@/lib/format";
import type { AdminUserListItem } from "@/lib/db/admin";

interface UserRowProps {
  user: AdminUserListItem;
  now: Date;
}

export function UserRow({ user, now }: UserRowProps) {
  const activelyBanned =
    user.is_banned ||
    (user.banned_until !== null && new Date(user.banned_until) > now);

  return (
    <tr className="align-top">
      <td className="px-3 py-3">
        <div className="font-medium text-zinc-900">
          {user.display_name ?? user.username}
        </div>
        <div className="text-xs text-zinc-500">@{user.username}</div>
        <div className="mt-0.5 text-xs text-zinc-400">
          가입 {formatDateTimeKo(user.created_at)}
        </div>
      </td>
      <td className="px-3 py-3 text-xs">
        <span
          className={
            user.role === "admin"
              ? "rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-900"
              : "text-zinc-500"
          }
        >
          {user.role}
        </span>
      </td>
      <td className="px-3 py-3 text-xs text-zinc-500">
        <div>글 {user.post_count}</div>
        <div>댓글 {user.comment_count}</div>
      </td>
      <td className="px-3 py-3 text-xs">
        {activelyBanned ? (
          <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
            BAN
            {user.banned_until && !user.is_banned && (
              <>
                {" — "}
                {formatDateTimeKo(user.banned_until)}까지
              </>
            )}
          </span>
        ) : (
          <span className="text-zinc-400">정상</span>
        )}
        {user.ban_reason && (
          <div className="mt-1 text-zinc-500">사유: {user.ban_reason}</div>
        )}
      </td>
      <td className="px-3 py-3">
        {activelyBanned ? (
          <form action={unbanUserAction}>
            <input type="hidden" name="targetUserId" value={user.id} />
            <button
              type="submit"
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              ban 해제
            </button>
          </form>
        ) : (
          <form action={banUserAction} className="space-y-1">
            <input type="hidden" name="targetUserId" value={user.id} />
            <div className="flex gap-1">
              <select
                name="duration"
                defaultValue="7d"
                className="rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs"
                aria-label="ban 기간"
              >
                <option value="1d">1일</option>
                <option value="7d">7일</option>
                <option value="30d">30일</option>
                <option value="permanent">영구</option>
              </select>
              <button
                type="submit"
                className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-red-700"
              >
                ban
              </button>
            </div>
            <input
              type="text"
              name="reason"
              placeholder="사유 (선택)"
              maxLength={500}
              className="block w-full rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs placeholder:text-zinc-400"
            />
          </form>
        )}
      </td>
    </tr>
  );
}
