import Link from "next/link";

export const metadata = {
  title: "이메일 확인",
};

export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-semibold text-brand-700">회원가입 거의 완료</p>
      <h1 className="text-2xl font-bold tracking-tight">
        이메일을 확인해주세요
      </h1>
      <p className="text-sm leading-6 text-zinc-500">
        입력하신 이메일 주소로 인증 메일을 발송했습니다.
        <br />
        메일의 링크를 클릭하면 가입이 완료됩니다.
      </p>
      <p className="mt-4 text-xs text-zinc-400">
        메일이 보이지 않는다면 스팸함도 확인해주세요.
      </p>
      <Link
        href="/login"
        className="mt-2 text-sm font-medium text-brand-700 hover:text-brand-800"
      >
        로그인 페이지로
      </Link>
    </main>
  );
}
