import Link from "next/link";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import type { BlogPostWithAuthor, BlogSeries, Course } from "@/lib/types";

type FormAction = (formData: FormData) => void | Promise<void>;

export function BlogPostForm({
  action,
  mode,
  initialPost,
  seriesOptions,
  courseOptions,
  initialCourseSlug,
  backHref,
}: {
  action: FormAction;
  mode: "create" | "edit";
  initialPost?: BlogPostWithAuthor;
  seriesOptions: BlogSeries[];
  courseOptions: Course[];
  initialCourseSlug?: string;
  backHref: string;
}) {
  const submitLabel = mode === "create" ? "발행" : "수정";

  return (
    <form action={action} className="space-y-6">
      {initialPost && (
        <input type="hidden" name="postId" value={initialPost.id} />
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-zinc-700">
          제목
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={initialPost?.title ?? ""}
          placeholder="제목"
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-zinc-700">
          URL slug <span className="text-xs font-normal text-zinc-400">(비워두면 제목으로 자동 생성)</span>
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          maxLength={80}
          defaultValue={initialPost?.slug ?? ""}
          placeholder="my-first-post"
          pattern="[a-z0-9][a-z0-9-]{0,79}"
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <p className="mt-1 text-xs text-zinc-400">
          소문자/숫자/하이픈만 가능, 최대 80자.
        </p>
      </div>

      <div>
        <label htmlFor="excerpt" className="block text-sm font-medium text-zinc-700">
          요약 <span className="text-xs font-normal text-zinc-400">(목록 카드에 표시됨)</span>
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          maxLength={300}
          defaultValue={initialPost?.excerpt ?? ""}
          rows={2}
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label htmlFor="cover_image" className="block text-sm font-medium text-zinc-700">
          커버 이미지 URL
        </label>
        <input
          id="cover_image"
          name="cover_image"
          type="url"
          defaultValue={initialPost?.cover_image ?? ""}
          placeholder="https://..."
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-zinc-700">
          태그 <span className="text-xs font-normal text-zinc-400">(쉼표로 구분, 최대 10개)</span>
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          defaultValue={initialPost?.tags.map((t) => t.slug).join(", ") ?? ""}
          placeholder="java, algorithm, tips"
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label htmlFor="course_slugs" className="block text-sm font-medium text-zinc-700">
          연결 과목
        </label>
        <select
          id="course_slugs"
          name="course_slugs"
          defaultValue={initialPost?.courses[0]?.slug ?? initialCourseSlug ?? ""}
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="">과목 연결 없음</option>
          {courseOptions.map((course) => (
            <option key={course.slug} value={course.slug}>
              {course.name}
              {course.code ? ` (${course.code})` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-400">
          과목과 연결하면 해당 과목 페이지에서 학습 기록으로 함께 보입니다.
        </p>
      </div>

      <div>
        <label htmlFor="series_id" className="block text-sm font-medium text-zinc-700">
          시리즈
        </label>
        <select
          id="series_id"
          name="series_id"
          defaultValue={initialPost?.series_id ?? ""}
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="">— 없음 —</option>
          {seriesOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-zinc-700">
          본문
        </label>
        <div className="mt-1">
          <MarkdownEditor
            name="content"
            required
            minLength={1}
            defaultValue={initialPost?.content ?? ""}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={initialPost?.is_published ?? true}
            className="h-4 w-4 rounded border-zinc-300"
          />
          바로 발행
        </label>

        <div className="flex gap-2">
          <Link
            href={backHref}
            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            취소
          </Link>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
