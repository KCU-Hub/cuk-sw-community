import Link from "next/link";
import { listCourses } from "@/lib/db/courses";

export const metadata = { title: "과목 자료실" };

export default async function CoursesIndexPage() {
  const courses = await listCourses();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">과목 자료실</h1>
      <p className="mt-1 text-sm text-zinc-500">
        학부 커리큘럼 기준. 과목별 강의/과제/시험 자료를 공유합니다.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {courses.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/courses/${c.slug}`}
              className="block rounded-xl border border-zinc-100 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-semibold text-zinc-900">
                  {c.name}
                </h2>
                {c.code && (
                  <span className="text-xs text-zinc-400">{c.code}</span>
                )}
              </div>
              {c.semester_hint && (
                <p className="mt-1 text-xs text-zinc-500">{c.semester_hint}</p>
              )}
              {c.description && (
                <p className="mt-2 text-sm text-zinc-600">{c.description}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
