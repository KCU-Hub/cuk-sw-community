import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-user";
import { getCourseBySlug } from "@/lib/db/courses";
import { createCourseMaterialAction } from "@/actions/course-material";
import { CourseMaterialForm } from "@/components/courses/course-material-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  return { title: `${course?.name ?? "과목"} 자료 올리기` };
}

export default async function NewCourseMaterialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [profile, course] = await Promise.all([
    requireProfile(),
    getCourseBySlug(slug),
  ]);
  if (!course) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">
        {course.name} 자료 올리기
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        파일(20 MB 이내) 또는 외부 링크, 본문 (마크다운) 중 최소 하나를
        채워주세요.
      </p>

      <div className="mt-8">
        <CourseMaterialForm
          action={createCourseMaterialAction}
          mode="create"
          courseSlug={slug}
          userId={profile.id}
          backHref={`/courses/${slug}`}
        />
      </div>
    </main>
  );
}
