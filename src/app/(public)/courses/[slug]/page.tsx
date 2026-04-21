import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseBySlug, listCourseMaterials } from "@/lib/db/courses";
import { getCurrentProfile } from "@/lib/auth/get-user";
import { Pagination } from "@/components/ui/pagination";
import { formatRelativeKo } from "@/lib/format";
import { formatAuthorName } from "@/lib/author";
import { MATERIAL_TYPE_LABELS, type MaterialType } from "@/lib/types";
import { MATERIAL_TYPES } from "@/lib/validation/course-material";

const PAGE_SIZE = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  return { title: course?.name ?? "과목" };
}

function isMaterialType(v: string): v is MaterialType {
  return (MATERIAL_TYPES as readonly string[]).includes(v);
}

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; q?: string; type?: string }>;
}) {
  const { slug } = await params;
  const { page: pageStr, q, type: typeStr } = await searchParams;

  const [course, profile] = await Promise.all([
    getCourseBySlug(slug),
    getCurrentProfile(),
  ]);
  if (!course) notFound();

  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);
  const search = (q ?? "").slice(0, 80).trim();
  const type = typeStr && isMaterialType(typeStr) ? typeStr : undefined;

  const { materials, total } = await listCourseMaterials({
    courseSlug: slug,
    page,
    pageSize: PAGE_SIZE,
    type,
    search,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="text-sm text-zinc-500">
            <Link href="/courses" className="hover:text-brand-700">
              과목 자료실
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {course.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {course.code}
            {course.semester_hint ? ` · ${course.semester_hint}` : ""}
          </p>
        </div>
        {profile && (
          <Link
            href={`/courses/${slug}/new`}
            className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            자료 올리기
          </Link>
        )}
      </div>

      <form className="mt-6 flex flex-wrap items-center gap-2" role="search">
        <input
          name="q"
          type="search"
          defaultValue={search}
          placeholder="자료 검색 (제목/본문)"
          className="block w-full max-w-md rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <select
          name="type"
          defaultValue={type ?? ""}
          className="rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm"
          aria-label="종류 필터"
        >
          <option value="">전체 종류</option>
          {MATERIAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {MATERIAL_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          검색
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-md border border-zinc-100 bg-white">
        {materials.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400">
            {search || type
              ? "조건에 맞는 자료가 없습니다."
              : "아직 등록된 자료가 없습니다."}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {materials.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/courses/${slug}/${m.id}`}
                  className="flex items-start justify-between gap-4 px-4 py-3 transition hover:bg-zinc-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-900">
                        {MATERIAL_TYPE_LABELS[m.material_type]}
                      </span>
                      <h3 className="truncate text-sm font-medium text-zinc-900">
                        {m.title}
                      </h3>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span>{formatAuthorName(m.author)}</span>
                      <span aria-hidden>·</span>
                      <time dateTime={m.created_at}>
                        {formatRelativeKo(m.created_at)}
                      </time>
                      {m.file_path && (
                        <>
                          <span aria-hidden>·</span>
                          <span>📎 첨부</span>
                        </>
                      )}
                      {m.external_url && (
                        <>
                          <span aria-hidden>·</span>
                          <span>🔗 링크</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath={`/courses/${slug}`}
      />
    </main>
  );
}
