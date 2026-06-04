import Link from "next/link";

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
    title: "커뮤니티",
    description: "자유게시판, 질문게시판, 공지사항.",
    href: "/board",
    Icon: ChatIcon,
  },
  {
    title: "블로그",
    description: "마크다운으로 정리하는 학습 기록.",
    href: "/blog",
    Icon: PenIcon,
  },
  {
    title: "과목 자료실",
    description: "과목별 노트, 과제 팁, 시험 팁 모음.",
    href: "/courses",
    Icon: FolderIcon,
  },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-5xl flex-col justify-center px-4 py-16">
      <section className="text-center">
        <p className="text-sm font-medium text-brand-600">
          고려사이버대학교 · 소프트웨어학부
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          함께 배우는{" "}
          <span className="text-brand-600">CUK SW Community</span>
        </h1>
        <p className="mt-6 text-lg text-zinc-600 sm:text-xl">
          학부 학생들을 위한 커뮤니티, 블로그, 과목별 자료실. 한 곳에서.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/board"
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            게시판 둘러보기
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            시작하기
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
