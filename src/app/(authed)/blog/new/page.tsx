import { requireProfile } from "@/lib/auth/require-user";
import { createBlogPostAction } from "@/actions/blog";
import { BlogPostForm } from "@/components/blog/blog-post-form";
import { listSeriesByAuthor } from "@/lib/db/blog";

export const metadata = { title: "새 글 쓰기" };

export default async function NewBlogPostPage() {
  const profile = await requireProfile();
  const series = await listSeriesByAuthor(profile.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">새 글 쓰기</h1>
      <p className="mt-1 text-sm text-zinc-500">
        velog 스타일 마크다운 블로그입니다. 기본 설정은 바로 발행.
      </p>

      <div className="mt-8">
        <BlogPostForm
          action={createBlogPostAction}
          mode="create"
          seriesOptions={series}
          backHref="/blog"
        />
      </div>
    </main>
  );
}
