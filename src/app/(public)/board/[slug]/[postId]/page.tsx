import Link from "next/link";
import { notFound } from "next/navigation";
import { getBoardBySlug, getPostById, hasUserLikedPost } from "@/lib/db/posts";
import { getCommentsByPost, buildCommentTree } from "@/lib/db/comments";
import { getCurrentProfile } from "@/lib/auth/get-user";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { CommentTree } from "@/components/board/comment-tree";
import { CommentForm } from "@/components/board/comment-form";
import { LikeButton } from "@/components/board/like-button";
import { DeletePostButton } from "@/components/board/delete-post-button";
import { PostViewTracker } from "@/components/board/post-view-tracker";
import { formatDateTimeKo } from "@/lib/format";
import { isBoardSlug } from "@/lib/constants";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
  if (!isBoardSlug(slug)) notFound();

  const [post, board, comments, profile] = await Promise.all([
    getPostById(postId),
    getBoardBySlug(slug),
    getCommentsByPost(postId),
    getCurrentProfile(),
  ]);

  if (!post || post.board_slug !== slug || !board) notFound();

  const liked = profile ? await hasUserLikedPost(postId, profile.id) : false;
  const tree = buildCommentTree(comments);
  const isAuthor = profile?.id === post.author_id;
  const isAdmin = profile?.role === "admin";
  const canEdit = isAuthor || isAdmin;
  const authorName =
    post.author?.display_name || post.author?.username || "알 수 없음";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <PostViewTracker postId={postId} />

      <div className="text-sm text-zinc-500">
        <Link href={`/board/${slug}`} className="hover:text-brand-700">
          {board.name}
        </Link>
      </div>

      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        {post.title}
      </h1>

      <div className="mt-3 flex items-center gap-3 text-sm text-zinc-500">
        <span className="font-medium text-zinc-700">{authorName}</span>
        <span aria-hidden>·</span>
        <time dateTime={post.created_at}>{formatDateTimeKo(post.created_at)}</time>
        <span aria-hidden>·</span>
        <span>조회 {post.view_count}</span>
      </div>

      <article className="mt-8 border-y border-zinc-100 py-8">
        <MarkdownRenderer content={post.content} />
      </article>

      <div className="mt-6 flex items-center justify-between">
        <LikeButton
          postId={postId}
          boardSlug={slug}
          initialLikeCount={post.like_count}
          initialLiked={liked}
          disabled={!profile}
        />
        {canEdit && (
          <div className="flex items-center gap-4 text-sm">
            <Link
              href={`/board/${slug}/${postId}/edit`}
              className="text-zinc-600 transition hover:text-zinc-900"
            >
              수정
            </Link>
            <DeletePostButton postId={postId} boardSlug={slug} />
          </div>
        )}
      </div>

      <section className="mt-12">
        <h2 className="text-base font-semibold text-zinc-900">
          댓글 {post.comment_count}
        </h2>

        {profile ? (
          <div className="mt-4">
            <CommentForm postId={postId} boardSlug={slug} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">
              로그인
            </Link>
            {" 후 댓글을 작성할 수 있습니다."}
          </p>
        )}

        <div className="mt-8">
          {tree.length > 0 ? (
            <CommentTree
              nodes={tree}
              postId={postId}
              boardSlug={slug}
              currentUserId={profile?.id ?? null}
              isAdmin={isAdmin}
            />
          ) : (
            <p className="text-sm text-zinc-400">아직 댓글이 없습니다.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
  if (!isBoardSlug(slug)) return { title: "게시글" };
  const post = await getPostById(postId);
  return { title: post?.title ?? "게시글" };
}
