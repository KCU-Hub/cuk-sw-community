import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-user";
import { getPostById } from "@/lib/db/posts";
import { updatePostAction } from "@/actions/posts";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { isBoardSlug } from "@/lib/constants";

export const metadata = {
  title: "게시글 수정",
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
  if (!isBoardSlug(slug)) notFound();

  const profile = await requireProfile();
  const post = await getPostById(postId);

  if (!post || post.board_slug !== slug) notFound();

  if (post.author_id !== profile.id && profile.role !== "admin") {
    redirect(`/board/${slug}/${postId}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">게시글 수정</h1>

      <form action={updatePostAction} className="mt-8 space-y-6">
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="boardSlug" value={slug} />

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
            defaultValue={post.title}
            className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-zinc-700"
          >
            내용
          </label>
          <div className="mt-1">
            <MarkdownEditor
              name="content"
              defaultValue={post.content}
              required
              minLength={1}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href={`/board/${slug}/${postId}`}
            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            취소
          </Link>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            저장
          </button>
        </div>
      </form>
    </main>
  );
}
