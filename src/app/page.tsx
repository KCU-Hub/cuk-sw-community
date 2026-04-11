import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
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

      <section className="mt-24 grid gap-6 sm:grid-cols-3">
        {[
          {
            title: "커뮤니티",
            description: "자유게시판, 질문게시판, 공지사항.",
            href: "/board",
          },
          {
            title: "블로그",
            description: "마크다운으로 정리하는 학습 기록.",
            href: "/blog",
          },
          {
            title: "과목 자료실",
            description: "과목별 노트, 과제 팁, 시험 팁 모음.",
            href: "/courses",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl border border-zinc-100 bg-white p-6 transition hover:border-brand-200 hover:shadow-sm"
          >
            <h2 className="text-base font-semibold text-zinc-900 group-hover:text-brand-600">
              {item.title}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">{item.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
