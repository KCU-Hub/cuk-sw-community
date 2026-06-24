import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCourseBySlug,
  getCourseMaterialStats,
  listCourseMaterials,
  listCourseRelatedBlogPosts,
  listCourseRelatedPosts,
} from "@/lib/db/courses";
import { getCurrentProfile } from "@/lib/auth/get-user";
import { Pagination } from "@/components/ui/pagination";
import { formatRelativeKo } from "@/lib/format";
import { formatAuthorName } from "@/lib/author";
import {
  MATERIAL_TYPES,
  MATERIAL_TYPE_LABELS,
  isMaterialType,
} from "@/lib/types";
import type {
  BlogPostWithAuthor,
  CourseMaterialWithAuthor,
  PostWithAuthor,
} from "@/lib/types";

const PAGE_SIZE = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  return { title: course?.name ?? "Index" };
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

  const [{ materials, total }, materialStats, relatedPosts, relatedBlogPosts] =
    await Promise.all([
      listCourseMaterials({
        courseSlug: slug,
        page,
        pageSize: PAGE_SIZE,
        type,
        search,
      }),
      getCourseMaterialStats(slug),
      listCourseRelatedPosts({ courseSlug: slug }),
      listCourseRelatedBlogPosts({ courseSlug: slug }),
    ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canContribute = Boolean(profile);
  const paginationParams = new URLSearchParams();
  if (search) paginationParams.set("q", search);
  if (type) paginationParams.set("type", type);
  const paginationBase = paginationParams.size
    ? `/courses/${slug}?${paginationParams.toString()}`
    : `/courses/${slug}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <header className="flex flex-col gap-5 border-b border-zinc-100 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm text-zinc-500">
            <Link href="/courses" className="hover:text-brand-700">
              Knowledge Index
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {course.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {course.code}
            {course.semester_hint ? ` · ${course.semester_hint}` : ""}
          </p>
          {course.description && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
              {course.description}
            </p>
          )}
        </div>

        <Link
          href={canContribute ? `/courses/${slug}/new` : "/login"}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          자료 올리기
        </Link>
      </header>

      <section aria-labelledby="course-stats-title" className="mt-8">
        <h2 id="course-stats-title" className="sr-only">
          인덱스 자료 현황
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="전체 항목" value={materialStats.total} />
          {MATERIAL_TYPES.map((materialType) => (
            <StatTile
              key={materialType}
              label={MATERIAL_TYPE_LABELS[materialType]}
              value={materialStats.byType[materialType]}
            />
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="course-materials-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="course-materials-title"
                className="text-lg font-semibold tracking-tight"
              >
                자료
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                제목과 본문 기준으로 검색하고 종류별로 좁혀볼 수 있습니다.
              </p>
            </div>
          </div>

          <form className="mt-4 flex flex-wrap items-center gap-2" role="search">
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

          <MaterialList
            materials={materials}
            slug={slug}
            search={search}
            type={type}
          />

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath={paginationBase}
          />
        </section>

        <aside className="space-y-4">
          <section className="rounded-md border border-zinc-100 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">바로가기</h2>
            <div className="mt-3 space-y-2">
              <HubAction
                href={canContribute ? `/board/qna/new?course=${slug}` : "/login"}
                title="문제 로그 남기기"
                description={`${course.name}에서 막힌 부분과 해결 과정을 로그로 남깁니다.`}
              />
              <HubAction
                href={canContribute ? `/blog/new?course=${slug}` : "/login"}
                title="기록 쓰기"
                description="배운 내용과 시행착오를 공개 기록으로 남깁니다."
              />
              <HubAction
                href={canContribute ? `/courses/${slug}/new` : "/login"}
                title="자료 추가"
                description="노트, 링크, 파일 자료를 이 인덱스에 모읍니다."
              />
              <HubAction
                href={
                  canContribute
                    ? `/gpa/new?courseName=${encodeURIComponent(course.name)}${
                        course.code
                          ? `&courseCode=${encodeURIComponent(course.code)}`
                          : ""
                      }`
                    : "/login"
                }
                title="Private에 추가"
                description="개인 학습 행에 이 주제를 추가합니다."
              />
            </div>
          </section>

          <section className="rounded-md border border-zinc-100 bg-white p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">관련 문제 로그</h2>
              <Link
                href="/board/qna"
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                Problem Log
              </Link>
            </div>
            <RelatedPosts posts={relatedPosts} />
          </section>

          <section className="rounded-md border border-zinc-100 bg-white p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">관련 기록</h2>
              <Link
                href="/blog"
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                Records
              </Link>
            </div>
            <RelatedBlogPosts posts={relatedBlogPosts} />
          </section>
        </aside>
      </div>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-100 bg-zinc-50/50 px-4 py-3">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
        {value}
      </div>
    </div>
  );
}

function HubAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-zinc-100 px-3 py-2 transition hover:border-brand-200 hover:bg-brand-50/40"
    >
      <span className="text-sm font-medium text-zinc-900">{title}</span>
      <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
        {description}
      </span>
    </Link>
  );
}

function MaterialList({
  materials,
  slug,
  search,
  type,
}: {
  materials: CourseMaterialWithAuthor[];
  slug: string;
  search: string;
  type?: string;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-zinc-100 bg-white">
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
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>{formatAuthorName(m.author)}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={m.created_at}>
                      {formatRelativeKo(m.created_at)}
                    </time>
                    {m.file_path && (
                      <>
                        <span aria-hidden>·</span>
                        <span>첨부</span>
                      </>
                    )}
                    {m.external_url && (
                      <>
                        <span aria-hidden>·</span>
                        <span>링크</span>
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
  );
}

function RelatedPosts({ posts }: { posts: PostWithAuthor[] }) {
  if (posts.length === 0) {
    return (
      <p className="mt-3 rounded-md bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-400">
        아직 연결된 질문이 없습니다.
      </p>
    );
  }

  return (
    <ul className="mt-3 divide-y divide-zinc-100">
      {posts.map((post) => (
        <li key={post.id}>
          <Link
            href={`/board/${post.board_slug}/${post.id}`}
            className="block py-3 transition hover:text-brand-700"
          >
            <h3 className="line-clamp-2 text-sm font-medium text-zinc-900">
              {post.title}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              댓글 {post.comment_count} · {formatRelativeKo(post.created_at)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RelatedBlogPosts({ posts }: { posts: BlogPostWithAuthor[] }) {
  if (posts.length === 0) {
    return (
      <p className="mt-3 rounded-md bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-400">
        아직 연결된 기록이 없습니다.
      </p>
    );
  }

  return (
    <ul className="mt-3 divide-y divide-zinc-100">
      {posts.map((post) => {
        const username = post.author?.username;
        const href = username ? `/blog/${username}/${post.slug}` : "/blog";
        return (
          <li key={post.id}>
            <Link
              href={href}
              className="block py-3 transition hover:text-brand-700"
            >
              <h3 className="line-clamp-2 text-sm font-medium text-zinc-900">
                {post.title}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {formatAuthorName(post.author)} ·{" "}
                {formatRelativeKo(post.published_at ?? post.created_at)}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
