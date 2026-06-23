import Link from "next/link";
import { GRADES } from "@/lib/types";
import type { UserCourse } from "@/lib/types";

type FormAction = (formData: FormData) => void | Promise<void>;

export function UserCourseForm({
  action,
  mode,
  defaultSemester,
  defaultCourseName,
  defaultCourseCode,
  initial,
  backHref,
}: {
  action: FormAction;
  mode: "create" | "edit";
  // 새 row 의 학기 placeholder. 마지막 입력 학기를 그대로 이어가게.
  defaultSemester?: string;
  defaultCourseName?: string;
  defaultCourseCode?: string;
  initial?: UserCourse;
  backHref: string;
}) {
  const submitLabel = mode === "create" ? "추가" : "수정";

  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {initial && <input type="hidden" name="courseId" value={initial.id} />}

      <div>
        <label htmlFor="semester" className="block text-sm font-medium text-zinc-700">
          학기
        </label>
        <input
          id="semester"
          name="semester"
          type="text"
          required
          maxLength={20}
          defaultValue={initial?.semester ?? defaultSemester ?? ""}
          placeholder="2024-1"
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label htmlFor="course_code" className="block text-sm font-medium text-zinc-700">
          과목 코드 <span className="text-xs font-normal text-zinc-400">(선택)</span>
        </label>
        <input
          id="course_code"
          name="course_code"
          type="text"
          maxLength={40}
          defaultValue={initial?.course_code ?? defaultCourseCode ?? ""}
          placeholder="SW201"
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="course_name" className="block text-sm font-medium text-zinc-700">
          과목명
        </label>
        <input
          id="course_name"
          name="course_name"
          type="text"
          required
          maxLength={80}
          defaultValue={initial?.course_name ?? defaultCourseName ?? ""}
          placeholder="자료구조"
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label htmlFor="credits" className="block text-sm font-medium text-zinc-700">
          학점
        </label>
        <input
          id="credits"
          name="credits"
          type="number"
          required
          min="0.5"
          max="9"
          step="0.5"
          defaultValue={initial?.credits ?? 3}
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label htmlFor="grade" className="block text-sm font-medium text-zinc-700">
          성적
        </label>
        <select
          id="grade"
          name="grade"
          defaultValue={initial?.grade ?? "A"}
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="memo" className="block text-sm font-medium text-zinc-700">
          메모 <span className="text-xs font-normal text-zinc-400">(선택)</span>
        </label>
        <input
          id="memo"
          name="memo"
          type="text"
          maxLength={200}
          defaultValue={initial?.memo ?? ""}
          placeholder="재수강 / 영역 / 교수 등 자유 메모"
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <label className="sm:col-span-2 flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="is_excluded"
          defaultChecked={initial?.is_excluded ?? false}
          className="h-4 w-4 rounded border-zinc-300"
        />
        GPA 계산에서 제외 (재수강 등)
      </label>

      <div className="sm:col-span-2 flex justify-end gap-2">
        <Link
          href={backHref}
          className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          취소
        </Link>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
