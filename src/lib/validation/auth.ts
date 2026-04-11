import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email({ message: "올바른 이메일 주소를 입력해주세요." }),
  password: z
    .string()
    .min(8, { message: "비밀번호는 최소 8자 이상이어야 합니다." }),
});

export const signUpSchema = z.object({
  email: z.string().email({ message: "올바른 이메일 주소를 입력해주세요." }),
  password: z
    .string()
    .min(8, { message: "비밀번호는 최소 8자 이상이어야 합니다." })
    .regex(/[a-zA-Z]/, { message: "비밀번호에 알파벳을 포함해주세요." })
    .regex(/[0-9]/, { message: "비밀번호에 숫자를 포함해주세요." }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
