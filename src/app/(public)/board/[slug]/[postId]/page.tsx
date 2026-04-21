import Link from "next/link";
import { notFound } from "next/navigation";
import { getBoardBySlug, getPostById } from "@/lib/db/posts";
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
import { formatAuthorName } from "@/lib/author";
import type { Board, BoardSlug, PostWithAuthor } from "@/lib/types";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
  if (!isBoardSlug(slug)) notFound();

  // Profile first so we can embed the viewer's liked state in the post
  // query (see getPostById viewerId param) — saves the extra round-trip
  // we used to do via hasUserLikedPost().
  const profile = await getCurrentProfile();

  const [post, board, comments] = await Promise.all([
    getPostById(postId, profile?.id ?? null),
    getBoardBySlug(slug),
    getCommentsByPost(postId),
  ]);

  if (!post || post.board_slug !== slug || !board) notFound();

  const isAuthor = profile?.id === post.author_id;
  const isAdmin = profile?.role === "admin";

  if (post.is_deleted) {
    // Defense-in-depth against future RLS relaxation.
    if (!isAuthor && !isAdmin) notFound();
    return <DeletedPostView post={post} board={board} slug={slug} />;
  }

  const tree = buildCommentTree(comments);
  const canEdit = isAuthor || isAdmin;

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
        <span className="font-medium text-zinc-700">{formatAuthorName(post.author)}</span>
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
          initialLiked={post.liked_by_me ?? false}
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

function DeletedPostView({
  post,
  board,
  slug,
}: {
  post: PostWithAuthor;
  board: Board;
  slug: BoardSlug;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-sm text-zinc-500">
        <Link href={`/board/${slug}`} className="hover:text-brand-700">
          {board.name}
        </Link>
      </div>

      <div
        role="status"
        className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"
      >
        <p className="font-medium">삭제된 게시글입니다.</p>
        <p className="mt-1 text-zinc-500">
          본인 또는 관리자만 열람할 수 있습니다. 댓글과 좋아요는 비활성화됩니다.
        </p>
      </div>

      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        {post.title}
      </h1>

      <div className="mt-3 flex items-center gap-3 text-sm text-zinc-500">
        <span className="font-medium text-zinc-700">{formatAuthorName(post.author)}</span>
        <span aria-hidden>·</span>
        <time dateTime={post.created_at}>{formatDateTimeKo(post.created_at)}</time>
      </div>

      <article className="mt-8 border-y border-zinc-100 py-8">
        <MarkdownRenderer content={post.content} />
      </article>
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
