import { z } from "zod";

const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{1,29}$/;
const HTTP_URL_RE = /^https?:\/\//i;

function optionalTrimmedString(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, { message })
    .transform((value) => (value.length === 0 ? null : value));
}

export const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, { message: "사용자명은 최소 2자입니다." })
    .max(30, { message: "사용자명은 최대 30자입니다." })
    .regex(USERNAME_RE, {
      message: "사용자명은 영문, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다.",
    }),
  display_name: optionalTrimmedString(50, "표시 이름은 최대 50자입니다."),
  bio: optionalTrimmedString(300, "자기소개는 최대 300자입니다."),
  avatar_url: z
    .string()
    .trim()
    .max(500, { message: "아바타 URL은 최대 500자입니다." })
    .refine((value) => value.length === 0 || HTTP_URL_RE.test(value), {
      message: "아바타 URL은 http 또는 https 주소여야 합니다.",
    })
    .refine(
      (value) => {
        if (value.length === 0) return true;
        return z.string().url().safeParse(value).success;
      },
      { message: "아바타 URL 형식을 확인해주세요." },
    )
    .transform((value) => (value.length === 0 ? null : value)),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export type ProfileFormField = keyof UpdateProfileInput;

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<Record<ProfileFormField, string[]>>;
};

export const initialProfileFormState: ProfileFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};
