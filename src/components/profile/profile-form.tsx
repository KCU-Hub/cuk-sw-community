"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { updateProfileAction } from "@/actions/profile";
import type { Profile } from "@/lib/types";
import {
  initialProfileFormState,
  type ProfileFormField,
} from "@/lib/validation/profile";

function fieldError(
  fieldErrors: Partial<Record<ProfileFormField, string[]>>,
  field: ProfileFormField,
) {
  return fieldErrors[field]?.[0] ?? null;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
    >
      {pending ? "저장 중" : "저장"}
    </button>
  );
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;

  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(
    updateProfileAction,
    initialProfileFormState,
  );

  const usernameError = fieldError(state.fieldErrors, "username");
  const displayNameError = fieldError(state.fieldErrors, "display_name");
  const bioError = fieldError(state.fieldErrors, "bio");
  const avatarUrlError = fieldError(state.fieldErrors, "avatar_url");

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div
          className={
            state.status === "success"
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </div>
      )}

      <div>
        <label
          htmlFor="username"
          className="block text-sm font-medium text-zinc-700"
        >
          사용자명
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={2}
          maxLength={30}
          pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,29}"
          defaultValue={profile.username}
          aria-invalid={Boolean(usernameError)}
          aria-describedby="username-help"
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <p id="username-help" className="mt-1 text-xs text-zinc-400">
          공개 블로그 주소와 작성자 표시에 사용됩니다. 2~30자, 영문/숫자/점/밑줄/하이픈.
        </p>
        <FieldError message={usernameError} />
      </div>

      <div>
        <label
          htmlFor="display_name"
          className="block text-sm font-medium text-zinc-700"
        >
          표시 이름
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          maxLength={50}
          defaultValue={profile.display_name ?? ""}
          placeholder="게시글과 댓글에 표시할 이름"
          aria-invalid={Boolean(displayNameError)}
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <FieldError message={displayNameError} />
      </div>

      <div>
        <label
          htmlFor="avatar_url"
          className="block text-sm font-medium text-zinc-700"
        >
          아바타 URL
        </label>
        <input
          id="avatar_url"
          name="avatar_url"
          type="url"
          maxLength={500}
          defaultValue={profile.avatar_url ?? ""}
          placeholder="https://..."
          aria-invalid={Boolean(avatarUrlError)}
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <FieldError message={avatarUrlError} />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-zinc-700">
          자기소개
        </label>
        <textarea
          id="bio"
          name="bio"
          maxLength={300}
          rows={5}
          defaultValue={profile.bio ?? ""}
          placeholder="관심 분야나 현재 공부 중인 내용을 짧게 남길 수 있습니다."
          aria-invalid={Boolean(bioError)}
          className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <p className="mt-1 text-xs text-zinc-400">
          프로필과 공개 블로그 상단에 표시됩니다. 최대 300자.
        </p>
        <FieldError message={bioError} />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/me"
          className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          취소
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
