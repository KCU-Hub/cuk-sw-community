import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-user";
import { createPostAction } from "@/actions/posts";
import { CourseCheckboxList } from "@/components/courses/course-checkbox-list";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { getBoardBySlug } from "@/lib/db/posts";
import { listCourses } from "@/lib/db/courses";
import { isBoardSlug } from "@/lib/constants";

export default async function NewPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ course?: string }>;
}) {
  const { slug } = await params;
  const { course: courseParam } = await searchParams;
  if (!isBoardSlug(slug)) notFound();

  const [profile, board, courses] = await Promise.all([
    requireProfile(),
    getBoardBySlug(slug),
    listCourses(),
  ]);
  if (!board) notFound();

  if (board.is_admin_only && profile.role !== "admin") {
    redirect(`/board/${slug}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">
        {board.name} 글쓰기
      </h1>

      <form action={createPostAction} className="mt-8 space-y-6">
        <input type="hidden" name="board_slug" value={slug} />

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-zinc-700"
          >
            제목
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            placeholder="제목을 입력해주세요"
            className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <CourseCheckboxList
          courses={courses}
          selectedSlugs={courseParam ? [courseParam] : []}
          helpText="최대 3개까지 연결할 수 있습니다. 질문게시판 글은 과목과 연결하면 과목 페이지에도 함께 표시됩니다."
        />

        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-zinc-700"
          >
            내용
          </label>
          <div className="mt-1">
            <MarkdownEditor name="content" required minLength={1} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href={`/board/${slug}`}
            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            취소
          </Link>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            게시
          </button>
        </div>
      </form>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isBoardSlug(slug)) return { title: "글쓰기" };
  const board = await getBoardBySlug(slug);
  return { title: `${board?.name ?? "게시판"} 글쓰기` };
}
