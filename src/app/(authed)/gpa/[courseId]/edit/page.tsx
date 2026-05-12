import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-user";
import { getUserCourseById } from "@/lib/db/user-courses";
import {
  deleteUserCourseAction,
  updateUserCourseAction,
} from "@/actions/user-course";
import { UserCourseForm } from "@/components/gpa/user-course-form";

export const metadata = { title: "과목 수정" };

export default async function EditUserCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const profile = await requireProfile();
  const course = await getUserCourseById(courseId);
  if (!course) notFound();
  if (course.user_id !== profile.id) redirect("/gpa");

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">과목 수정</h1>

      <div className="mt-8">
        <UserCourseForm
          action={updateUserCourseAction}
          mode="edit"
          initial={course}
          backHref="/gpa"
        />
      </div>

      <form
        action={deleteUserCourseAction}
        className="mt-8 flex items-center justify-end border-t border-zinc-100 pt-4"
      >
        <input type="hidden" name="courseId" value={course.id} />
        <button
          type="submit"
          className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
        >
          이 과목 삭제
        </button>
      </form>
    </main>
  );
}
