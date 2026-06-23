import type { Course } from "@/lib/types";

export function CourseCheckboxList({
  courses,
  selectedSlugs = [],
  helpText,
}: {
  courses: Course[];
  selectedSlugs?: string[];
  helpText: string;
}) {
  const selected = new Set(selectedSlugs.filter(Boolean));

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-zinc-700">
        연결 과목
      </legend>
      <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto rounded-md border border-zinc-200 bg-white p-3 sm:grid-cols-2">
        {courses.length === 0 ? (
          <p className="text-sm text-zinc-400">등록된 과목이 없습니다.</p>
        ) : (
          courses.map((course) => (
            <label
              key={course.slug}
              className="flex min-w-0 items-start gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                name="course_slugs"
                value={course.slug}
                defaultChecked={selected.has(course.slug)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300"
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-zinc-900">
                  {course.name}
                </span>
                {course.code && (
                  <span className="block truncate text-xs text-zinc-500">
                    {course.code}
                  </span>
                )}
              </span>
            </label>
          ))
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-400">{helpText}</p>
    </fieldset>
  );
}
