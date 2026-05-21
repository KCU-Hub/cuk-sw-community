"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { COURSE_FILES_BUCKET } from "@/lib/constants";
import { sanitizeFilename } from "@/lib/file/sanitize-filename";

// Client-side 업로드: 파일을 Supabase Storage 의 course-files bucket 으로
// 보낸 뒤, 서버 액션에 `file_path` 만 전달. 실제 바이너리는 action 에
// 안 건너가므로 Next/Route body size 제한을 회피.
//
// Path 구조: `${userId}/${timestamp}-${sanitized-filename}` — 0015 RLS 가
// 첫 segment 를 auth.uid() 와 맞추도록 강제.
export function FileUploadInput({
  userId,
  defaultPath,
}: {
  userId: string;
  defaultPath?: string | null;
}) {
  const [path, setPath] = useState<string>(defaultPath ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("파일은 20 MB 이하만 업로드 가능합니다.");
      return;
    }

    setUploading(true);
    try {
      const safeName = sanitizeFilename(file.name);
      const nextPath = `${userId}/${Date.now()}-${safeName}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(COURSE_FILES_BUCKET)
        .upload(nextPath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      // 이전 파일이 있었으면 삭제 시도 — 실패해도 무시 (orphan 방지 best-effort)
      if (path && path !== nextPath) {
        await supabase.storage.from(COURSE_FILES_BUCKET).remove([path]);
      }

      setPath(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleClear() {
    if (!path) return;
    const supabase = createClient();
    await supabase.storage.from(COURSE_FILES_BUCKET).remove([path]);
    setPath("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="file_path" value={path} />

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          disabled={uploading}
          className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800 disabled:opacity-50"
        />
        {path && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            제거
          </button>
        )}
      </div>

      {uploading && (
        <p className="text-xs text-zinc-500">업로드 중…</p>
      )}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {path && !uploading && (
        <p className="truncate text-xs text-zinc-500">
          현재 파일: <span className="font-mono">{path}</span>
        </p>
      )}
    </div>
  );
}
