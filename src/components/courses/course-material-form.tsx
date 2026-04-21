import Link from "next/link";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { FileUploadInput } from "@/components/courses/file-upload-input";
import { MATERIAL_TYPES, MATERIAL_TYPE_LABELS } from "@/lib/types";
import type { CourseMaterialWithAuthor } from "@/lib/types";

type FormAction = (formData: FormData) => void | Promise<void>;

export function CourseMaterialForm({
  action,
  mode,
  courseSlug,
  userId,
  initial,
  backHref,
}: {
  action: FormAction;
  mode: "create" | "edit";
  courseSlug: string;
  userId: string;
  initial?: CourseMaterialWithAuthor;
  backHref: string;
}) {
  const submitLabel = mode === "create" ? "등록" : "수정";
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="course_slug" value={courseSlug} />
      {initial && (
        <input type="hidden" name="materialId" value={initial.id} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
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
            defaultValue={initial?.title ?? ""}
            placeholder="제목"
            className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <label htmlFor="material_type" className="block text-sm font-medium text-zinc-700">
            종류
          </label>
          <select
            id="material_type"
            name="material_type"
            defaultValue={initial?.material_type ?? "other"}
            className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {MATERIAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {MATERIAL_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="external_url" className="block text-sm font-medium text-zinc-700">
          외부 링크 <span className="text-xs font-normal text-zinc-400">(선택)</span>
        </label>
        <input
          id="external_url"
          name="external_url"
          type="url"
          defaultValue={initial?.external_url ?? ""}
          placeholder="https://drive.google.com/..."
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-zinc-700">
          첨부 파일 <span className="text-xs font-normal text-zinc-400">(20 MB 이하)</span>
        </span>
        <div className="mt-1">
          <FileUploadInput userId={userId} defaultPath={initial?.file_path ?? null} />
        </div>
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-zinc-700">
          본문 <span className="text-xs font-normal text-zinc-400">(마크다운, 선택)</span>
        </label>
        <div className="mt-1">
          <MarkdownEditor
            name="content"
            defaultValue={initial?.content ?? ""}
            rows={10}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
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
    </form>
  );
}
