import { requireProfile } from "@/lib/auth/require-user";
import { listUserCourses } from "@/lib/db/user-courses";
import { rollupBySemester } from "@/lib/gpa";
import { createUserCourseAction } from "@/actions/user-course";
import { UserCourseForm } from "@/components/gpa/user-course-form";

export const metadata = { title: "과목 추가" };

export default async function NewUserCoursePage() {
  const profile = await requireProfile();
  const courses = await listUserCourses(profile.id);
  const lastSemester = rollupBySemester(courses).at(-1)?.semester;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">과목 추가</h1>
      <p className="mt-1 text-sm text-zinc-500">
        한 행이 한 과목입니다. 같은 과목을 재수강했다면 두 행을 모두 입력한
        뒤 옛 행에서 “GPA 제외” 를 켜세요.
      </p>

      <div className="mt-8">
        <UserCourseForm
          action={createUserCourseAction}
          mode="create"
          defaultSemester={lastSemester}
          backHref="/gpa"
        />
      </div>
    </main>
  );
}
