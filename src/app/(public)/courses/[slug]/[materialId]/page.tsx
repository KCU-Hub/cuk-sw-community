import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCourseBySlug,
  getCourseFileDownloadUrl,
  getCourseMaterialById,
} from "@/lib/db/courses";
import { getCurrentProfile } from "@/lib/auth/get-user";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { deleteCourseMaterialAction } from "@/actions/course-material";
import { formatDateTimeKo } from "@/lib/format";
import { formatAuthorName } from "@/lib/author";
import { MATERIAL_TYPE_LABELS } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; materialId: string }>;
}) {
  const { materialId } = await params;
  const material = await getCourseMaterialById(materialId);
  return { title: material?.title ?? "자료" };
}

export default async function CourseMaterialDetailPage({
  params,
}: {
  params: Promise<{ slug: string; materialId: string }>;
}) {
  const { slug, materialId } = await params;

  const [course, material, viewer] = await Promise.all([
    getCourseBySlug(slug),
    getCourseMaterialById(materialId),
    getCurrentProfile(),
  ]);
  if (!course || !material || material.course_slug !== slug) notFound();

  const isAuthor = viewer?.id === material.author_id;
  const isAdmin = viewer?.role === "admin";
  const canEdit = isAuthor || isAdmin;

  if (material.is_deleted && !canEdit) notFound();

  const fileUrl = material.file_path
    ? await getCourseFileDownloadUrl(material.file_path)
    : null;
  const fileName = material.file_path?.split("/").pop() ?? null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-sm text-zinc-500">
        <Link href={`/courses/${slug}`} className="hover:text-brand-700">
          {course.name}
        </Link>
      </div>

      {material.is_deleted && (
        <div
          role="status"
          className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"
        >
          삭제된 자료입니다. 본인 또는 관리자만 열람할 수 있습니다.
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-900">
          {MATERIAL_TYPE_LABELS[material.material_type]}
        </span>
      </div>

      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        {material.title}
      </h1>

      <div className="mt-3 flex items-center gap-3 text-sm text-zinc-500">
        <span className="font-medium text-zinc-700">
          {formatAuthorName(material.author)}
        </span>
        <span aria-hidden>·</span>
        <time dateTime={material.created_at}>
          {formatDateTimeKo(material.created_at)}
        </time>
      </div>

      {(fileUrl || material.external_url) && (
        <div className="mt-6 flex flex-wrap gap-2">
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              📎 첨부 파일 {fileName ? `(${fileName})` : ""}
            </a>
          )}
          {material.external_url && (
            <a
              href={material.external_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              🔗 외부 링크
            </a>
          )}
        </div>
      )}

      {material.content && (
        <article className="mt-8 border-y border-zinc-100 py-8">
          <MarkdownRenderer content={material.content} />
        </article>
      )}

      {canEdit && (
        <div className="mt-6 flex items-center justify-end gap-4 text-sm">
          <Link
            href={`/courses/${slug}/${material.id}/edit`}
            className="text-zinc-600 transition hover:text-zinc-900"
          >
            수정
          </Link>
          <form action={deleteCourseMaterialAction}>
            <input type="hidden" name="materialId" value={material.id} />
            <input type="hidden" name="course_slug" value={slug} />
            <button
              type="submit"
              className="text-red-600 transition hover:text-red-700"
            >
              삭제
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
