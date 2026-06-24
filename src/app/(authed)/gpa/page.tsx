import Link from "next/link";
import { requireProfile } from "@/lib/auth/require-user";
import { listUserCourses } from "@/lib/db/user-courses";
import {
  GRADE_POINTS,
  rollupBySemester,
  summarize,
} from "@/lib/gpa";
import { GpaSummaryCard } from "@/components/gpa/gpa-summary-card";
import { toggleUserCourseExcludedAction } from "@/actions/user-course";
import { formatDateKo } from "@/lib/format";

export const metadata = { title: "Private Learning Metrics" };

export default async function GpaPage() {
  const profile = await requireProfile();
  const courses = await listUserCourses(profile.id);

  const overall = summarize(courses);
  const semesters = rollupBySemester(courses);
  // 마지막 학기 라벨을 다음 입력의 placeholder 로
  const lastSemester = semesters.at(-1)?.semester;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Private Learning Metrics
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            owner만 열람하는 개인 학습 행과 4.5 기준 GPA 시뮬레이션입니다.
          </p>
        </div>
        <Link
          href="/gpa/new"
          className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          과목 추가
        </Link>
      </div>

      <div className="mt-8">
        <GpaSummaryCard summary={overall} />
      </div>

      {semesters.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
          아직 등록한 과목이 없습니다. 우상단 <strong>과목 추가</strong> 로
          시작하세요. P/NP 는 평점 계산에서 빠지고, 재수강 등은 행별로
          “GPA 제외” 토글로 조절할 수 있습니다.
        </div>
      ) : (
        <section className="mt-10 space-y-8">
          {semesters.map((s) => (
            <SemesterBlock
              key={s.semester}
              semester={s.semester}
              courses={s.courses}
              summaryGpa={s.summary.gpa}
              summaryCredits={s.summary.gradedCredits}
              lastSemesterHint={lastSemester === s.semester}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function SemesterBlock({
  semester,
  courses,
  summaryGpa,
  summaryCredits,
  lastSemesterHint,
}: {
  semester: string;
  courses: import("@/lib/types").UserCourse[];
  summaryGpa: number | null;
  summaryCredits: number;
  lastSemesterHint: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white">
      <header className="flex items-baseline justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          {semester}
          {lastSemesterHint && (
            <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-900">
              최신
            </span>
          )}
        </h2>
        <div className="text-xs text-zinc-500">
          학기 GPA{" "}
          <span className="font-medium text-zinc-700">
            {summaryGpa === null ? "—" : summaryGpa.toFixed(2)}
          </span>
          {" · "}
          {summaryCredits.toFixed(1)} 학점
        </div>
      </header>
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-2 font-medium">과목</th>
            <th className="px-4 py-2 font-medium">학점</th>
            <th className="px-4 py-2 font-medium">성적</th>
            <th className="px-4 py-2 font-medium">메모</th>
            <th className="px-4 py-2 font-medium text-right">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {courses.map((c) => {
            const point = GRADE_POINTS[c.grade];
            return (
              <tr
                key={c.id}
                className={
                  c.is_excluded ? "bg-zinc-50 text-zinc-400" : undefined
                }
              >
                <td className="px-4 py-2">
                  <div className="font-medium text-zinc-900">
                    {c.course_name}
                  </div>
                  {c.course_code && (
                    <div className="text-xs text-zinc-400">{c.course_code}</div>
                  )}
                </td>
                <td className="px-4 py-2 tabular-nums">
                  {c.credits.toFixed(1)}
                </td>
                <td className="px-4 py-2">
                  <span className="font-mono text-zinc-800">{c.grade}</span>
                  {point !== null && (
                    <span className="ml-1 text-xs text-zinc-400">
                      ({point.toFixed(1)})
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-zinc-500">
                  {c.memo ?? ""}
                  <span className="block text-xs text-zinc-400">
                    등록 {formatDateKo(c.created_at)}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-3 text-xs">
                    <form action={toggleUserCourseExcludedAction}>
                      <input type="hidden" name="courseId" value={c.id} />
                      <input
                        type="hidden"
                        name="next_excluded"
                        value={c.is_excluded ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="text-zinc-600 transition hover:text-zinc-900"
                      >
                        {c.is_excluded ? "포함" : "제외"}
                      </button>
                    </form>
                    <Link
                      href={`/gpa/${c.id}/edit`}
                      className="text-zinc-600 transition hover:text-zinc-900"
                    >
                      수정
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
