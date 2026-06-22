import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-user";
import { getBlogPostByAuthorSlug, listSeriesByAuthor } from "@/lib/db/blog";
import { listCourses } from "@/lib/db/courses";
import { updateBlogPostAction } from "@/actions/blog";
import { BlogPostForm } from "@/components/blog/blog-post-form";

export const metadata = { title: "글 수정" };

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const profile = await requireProfile();

  const post = await getBlogPostByAuthorSlug(username, slug);
  if (!post) notFound();

  const isAuthor = profile.id === post.author_id;
  const isAdmin = profile.role === "admin";
  if (!isAuthor && !isAdmin) {
    redirect(`/blog/${username}/${slug}`);
  }

  const [series, courses] = await Promise.all([
    listSeriesByAuthor(post.author_id ?? profile.id),
    listCourses(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">글 수정</h1>

      <div className="mt-8">
        <BlogPostForm
          action={updateBlogPostAction}
          mode="edit"
          initialPost={post}
          seriesOptions={series}
          courseOptions={courses}
          backHref={`/blog/${username}/${slug}`}
        />
      </div>
    </main>
  );
}
