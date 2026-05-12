import type { GpaSummary } from "@/lib/gpa";
import { GPA_MILESTONES, GRADE_MAX, projectForTarget } from "@/lib/gpa";

function formatGpa(value: number | null): string {
  if (value === null) return "—";
  return value.toFixed(2);
}

export function GpaSummaryCard({
  summary,
  plannedCreditsForTarget = 18,
}: {
  summary: GpaSummary;
  // 다음 학기 (또는 남은 학기) 예상 학점. 마일스톤 시뮬레이션에 사용.
  plannedCreditsForTarget?: number;
}) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Stat
        title="누적 GPA"
        value={formatGpa(summary.gpa)}
        sub={`/ ${GRADE_MAX.toFixed(1)}`}
        emphasized
      />
      <Stat
        title="평점 산정 학점"
        value={summary.gradedCredits.toFixed(1)}
        sub="P/NP·제외 행 제외"
      />
      <Stat
        title="이수 학점"
        value={summary.earnedCredits.toFixed(1)}
        sub="F·NP·제외 행 제외"
      />

      <div className="sm:col-span-3">
        <h3 className="text-sm font-medium text-zinc-700">마일스톤</h3>
        <ul className="mt-2 divide-y divide-zinc-100 rounded-md border border-zinc-100 bg-white">
          {GPA_MILESTONES.map((m) => {
            const reached = summary.gpa !== null && summary.gpa >= m.threshold;
            const proj = projectForTarget(
              summary,
              plannedCreditsForTarget,
              m.threshold,
            );
            return (
              <li
                key={`${m.label}-${m.threshold}`}
                className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        reached
                          ? "rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-900"
                          : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500"
                      }
                    >
                      {reached ? "달성" : "미달성"}
                    </span>
                    <span className="font-medium text-zinc-900">
                      {m.label}
                    </span>
                    <span className="text-xs text-zinc-500">
                      ≥ {m.threshold.toFixed(1)}
                    </span>
                  </div>
                  {m.hint && (
                    <p className="mt-0.5 text-xs text-zinc-500">{m.hint}</p>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-zinc-500">
                  <Projection proj={proj} planned={plannedCreditsForTarget} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-zinc-400">
          마일스톤 우측 시뮬레이션은 다음 {plannedCreditsForTarget} 학점에서
          필요한 평균을 계산한 값입니다.
        </p>
      </div>
    </section>
  );
}

function Stat({
  title,
  value,
  sub,
  emphasized,
}: {
  title: string;
  value: string;
  sub?: string;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {title}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={
            emphasized
              ? "text-3xl font-bold tracking-tight text-zinc-900"
              : "text-2xl font-semibold text-zinc-900"
          }
        >
          {value}
        </span>
        {sub && <span className="text-sm text-zinc-400">{sub}</span>}
      </div>
    </div>
  );
}

function Projection({
  proj,
  planned,
}: {
  proj: ReturnType<typeof projectForTarget>;
  planned: number;
}) {
  if (proj.kind === "reached") return <span className="text-brand-700">이미 도달</span>;
  if (proj.kind === "noPlannedCredits") return <span>—</span>;
  if (proj.kind === "impossible") {
    return (
      <span className="text-red-600">
        +{planned}학점 만점도 부족 (최고 {proj.bestPossibleGpa.toFixed(2)})
      </span>
    );
  }
  return (
    <span>
      필요 평균 <span className="font-medium text-zinc-700">{proj.requiredAvg.toFixed(2)}</span>
    </span>
  );
}
