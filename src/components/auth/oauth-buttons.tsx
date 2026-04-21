import { signInWithProviderAction } from "@/actions/auth";

type Intent = "login" | "signup";

// Google/Kakao OAuth form buttons. Uses server action + hidden inputs so
// there's zero client JS required — works with JS disabled, and each button
// is a real <form action=...> submit.
export function OAuthButtons({ intent }: { intent: Intent }) {
  const label = intent === "signup" ? "가입" : "로그인";

  return (
    <div className="mt-6 space-y-2">
      <div className="relative flex items-center">
        <div className="flex-1 border-t border-zinc-100" />
        <span className="px-3 text-xs uppercase tracking-wide text-zinc-400">
          또는
        </span>
        <div className="flex-1 border-t border-zinc-100" />
      </div>

      <form action={signInWithProviderAction}>
        <input type="hidden" name="provider" value="google" />
        <input type="hidden" name="intent" value={intent} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          <GoogleIcon className="h-4 w-4" />
          Google 로 {label}
        </button>
      </form>

      <form action={signInWithProviderAction}>
        <input type="hidden" name="provider" value="kakao" />
        <input type="hidden" name="intent" value={intent} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-transparent bg-[#FEE500] px-3 py-2 text-sm font-medium text-[#3c1e1e] transition hover:brightness-95"
        >
          <KakaoIcon className="h-4 w-4" />
          카카오로 {label}
        </button>
      </form>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 8.5-20.4l5.7-5.7A20 20 0 1 0 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28.5l-6.5 5A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C40.5 36.4 44 30.6 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3C6.5 3 2 6.5 2 10.8c0 2.7 1.9 5.1 4.8 6.4L6 21l4.3-2.4c.6.1 1.1.1 1.7.1 5.5 0 10-3.5 10-7.8C22 6.5 17.5 3 12 3z"
      />
    </svg>
  );
}
