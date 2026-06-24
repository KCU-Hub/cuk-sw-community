import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/get-user";
import { getPostsByBoard } from "@/lib/db/posts";
import { listBlogPosts } from "@/lib/db/blog";
import { listUserCourses } from "@/lib/db/user-courses";
import { summarize } from "@/lib/gpa";
import { formatRelativeKo } from "@/lib/format";
import { formatAuthorName } from "@/lib/author";
import type { BlogPostWithAuthor, PostWithAuthor, Profile } from "@/lib/types";

type IconProps = { className?: string };

function ChatIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
    </svg>
  );
}

function PenIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function FolderIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const FEATURES = [
  {
    title: "Records",
    description: "프로젝트 회고, 학습 노트, 생각의 초안.",
    href: "/blog",
    Icon: PenIcon,
  },
  {
    title: "Knowledge Index",
    description: "주제별 자료, 링크, 참고 문헌을 모으는 색인.",
    href: "/courses",
    Icon: FolderIcon,
  },
  {
    title: "Problem Log",
    description: "막혔던 문제와 해결 과정을 다시 찾을 수 있게 남기는 로그.",
    href: "/board",
    Icon: ChatIcon,
  },
] as const;

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (profile) {
    const [
      { posts: questions, total: openQuestionCount },
      { posts: blogs },
      userCourses,
    ] =
      await Promise.all([
        getPostsByBoard("qna", {
          page: 1,
          pageSize: 5,
          questionStatus: "open",
        }),
        listBlogPosts({ page: 1, pageSize: 4 }),
        listUserCourses(profile.id),
      ]);
    return (
      <AuthedHome
        profile={profile}
        questions={questions}
        openQuestionCount={openQuestionCount}
        blogs={blogs}
        courseCount={userCourses.length}
        gpa={summarize(userCourses).gpa}
      />
    );
  }

  return <VisitorHome />;
}

function VisitorHome() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-5xl flex-col justify-center px-4 py-16">
      <section className="text-center">
        <p className="text-sm font-medium text-brand-600">
          Personal learning archive
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="text-brand-600">Heznpc Archive</span>
        </h1>
        <p className="mt-6 text-lg text-zinc-600 sm:text-xl">
          배운 것, 만든 것, 막혔다가 푼 것을 오래 남기는 개인 지식 창고입니다.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/blog"
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            기록 읽기
          </Link>
          <Link
            href="/courses"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            인덱스 보기
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-6 sm:mt-20 sm:grid-cols-3">
        {FEATURES.map(({ title, description, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-zinc-100 bg-white p-6 transition hover:border-brand-200 hover:shadow-sm"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
              <Icon />
            </span>
            <h2 className="mt-4 text-base font-semibold text-zinc-900 group-hover:text-brand-600">
              {title}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">{description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}

function AuthedHome({
  profile,
  questions,
  openQuestionCount,
  blogs,
  courseCount,
  gpa,
}: {
  profile: Profile;
  questions: PostWithAuthor[];
  openQuestionCount: number;
  blogs: BlogPostWithAuthor[];
  courseCount: number;
  gpa: number | null;
}) {
  const displayName = profile.display_name || profile.username;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="flex flex-col gap-6 border-b border-zinc-100 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-700">
            {displayName}님의 archive desk
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
            기록하고, 분류하고, 다시 찾을 수 있게 정리하세요.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            Heznpc Archive는 공개 기록, 자료 색인, 문제 풀이 로그, 개인 학습
            지표를 한 곳에서 이어 쓰는 owner 중심 작업대입니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/board/qna/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            문제 로그 남기기
          </Link>
          <Link
            href="/blog/new"
            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            기록 쓰기
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <DashboardMetric
          label="Private GPA"
          value={gpa === null ? "—" : gpa.toFixed(2)}
          href="/gpa"
        />
        <DashboardMetric
          label="학습 행"
          value={`${courseCount}`}
          href="/gpa"
        />
        <DashboardMetric
          label="열린 문제 로그"
          value={`${openQuestionCount}`}
          href="/board/qna?status=open"
        />
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                열린 문제 로그
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                아직 닫지 않은 문제와 조사거리를 먼저 확인합니다.
              </p>
            </div>
            <Link
              href="/board/qna?status=open"
              className="text-sm font-medium text-brand-700 hover:text-brand-900"
            >
              더 보기
            </Link>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-zinc-100 bg-white">
            {questions.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-zinc-400">
                지금은 미해결 질문이 없습니다.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {questions.map((post) => (
                  <DashboardQuestion key={post.id} post={post} />
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside>
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                최근 공개 기록
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                블로그에 쌓이는 공개 archive 기록입니다.
              </p>
            </div>
            <Link
              href="/blog"
              className="text-sm font-medium text-brand-700 hover:text-brand-900"
            >
              Records
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {blogs.length === 0 ? (
              <p className="rounded-md border border-zinc-100 bg-white px-4 py-10 text-center text-sm text-zinc-400">
                아직 발행된 기록이 없습니다.
              </p>
            ) : (
              blogs.map((post) => <DashboardBlog key={post.id} post={post} />)
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function DashboardMetric({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-zinc-100 bg-white p-4 transition hover:border-brand-200 hover:bg-brand-50/30"
    >
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <span className="mt-2 block text-2xl font-semibold tracking-tight text-zinc-900">
        {value}
      </span>
    </Link>
  );
}

function DashboardQuestion({ post }: { post: PostWithAuthor }) {
  return (
    <li>
      <Link
        href={`/board/${post.board_slug}/${post.id}`}
        className="block px-4 py-3 transition hover:bg-zinc-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-sm font-medium text-zinc-900">
              {post.title}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              {formatAuthorName(post.author)} · {formatRelativeKo(post.created_at)}
            </p>
          </div>
          <span className="shrink-0 text-xs text-zinc-500">
            댓글 {post.comment_count}
          </span>
        </div>
      </Link>
    </li>
  );
}

function DashboardBlog({ post }: { post: BlogPostWithAuthor }) {
  const username = post.author?.username;
  const displayDate = post.published_at ?? post.created_at;

  return (
    <Link
      href={username ? `/blog/${username}/${post.slug}` : "/blog"}
      className="block rounded-md border border-zinc-100 bg-white p-4 transition hover:border-brand-200 hover:bg-brand-50/30"
    >
      <h3 className="line-clamp-2 text-sm font-medium text-zinc-900">
        {post.title}
      </h3>
      <p className="mt-2 text-xs text-zinc-500">
        {formatAuthorName(post.author)} · {formatRelativeKo(displayDate)}
      </p>
      {post.courses.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {post.courses.slice(0, 2).map((course) => (
            <span
              key={course.slug}
              className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-900"
            >
              {course.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
