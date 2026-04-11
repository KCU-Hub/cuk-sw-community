export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto max-w-3xl px-4 py-12"
    >
      <span className="sr-only">불러오는 중</span>
      <div className="space-y-4">
        <div className="h-7 w-48 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-72 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-64 animate-pulse rounded bg-zinc-100" />
        <div className="mt-8 h-32 w-full animate-pulse rounded-lg bg-zinc-100" />
      </div>
    </main>
  );
}
