import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-user";
import {
  getCourseBySlug,
  getCourseMaterialById,
} from "@/lib/db/courses";
import { updateCourseMaterialAction } from "@/actions/course-material";
import { CourseMaterialForm } from "@/components/courses/course-material-form";

export const metadata = { title: "자료 수정" };

export default async function EditCourseMaterialPage({
  params,
}: {
  params: Promise<{ slug: string; materialId: string }>;
}) {
  const { slug, materialId } = await params;
  const [profile, course, material] = await Promise.all([
    requireProfile(),
    getCourseBySlug(slug),
    getCourseMaterialById(materialId),
  ]);
  if (!course || !material || material.course_slug !== slug) notFound();

  const isAuthor = profile.id === material.author_id;
  const isAdmin = profile.role === "admin";
  if (!isAuthor && !isAdmin) {
    redirect(`/courses/${slug}/${materialId}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">자료 수정</h1>

      <div className="mt-8">
        <CourseMaterialForm
          action={updateCourseMaterialAction}
          mode="edit"
          courseSlug={slug}
          userId={profile.id}
          initial={material}
          backHref={`/courses/${slug}/${material.id}`}
        />
      </div>
    </main>
  );
}
