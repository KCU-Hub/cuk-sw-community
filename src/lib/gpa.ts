import type { Grade, UserCourse } from "@/lib/types";

// 한국 사이버대학 표준 4.5 만점. P/NP 는 평점 계산에서 제외 → null.
export const GRADE_POINTS: Record<Grade, number | null> = {
  "A+": 4.5,
  "A": 4.0,
  "B+": 3.5,
  "B": 3.0,
  "C+": 2.5,
  "C": 2.0,
  "D+": 1.5,
  "D": 1.0,
  "F": 0.0,
  "P": null,
  "NP": null,
};

export const GRADE_MAX = 4.5;

// 표시·계산용 마일스톤. 조기졸업(4.0) 도 한 항목으로 포함되어 있고,
// 일반 GPA 평균 기준선들 (B/B+/A/A+) 과 같은 자리에서 노출됨.
export interface GpaMilestone {
  readonly label: string;
  readonly threshold: number;
  readonly hint?: string;
}

export const GPA_MILESTONES: readonly GpaMilestone[] = [
  { label: "B 평균",   threshold: 3.0 },
  { label: "B+ 평균",  threshold: 3.5 },
  { label: "조기졸업", threshold: 4.0, hint: "고려사이버대 조기졸업 자격 기준 (학점 평균 4.0)" },
  { label: "A 평균",   threshold: 4.0 },
  { label: "A+ 평균",  threshold: 4.5 },
];

export interface GpaSummary {
  // 평점 계산 대상 학점 합 (P/NP/excluded 제외)
  gradedCredits: number;
  // 평점 계산 대상 점수 합 (gradePoint × credits)
  weightedTotal: number;
  // GPA — gradedCredits 가 0 이면 null (계산 불가)
  gpa: number | null;
  // 표시용 누적 학점 (P 도 포함, F/NP/excluded 제외)
  earnedCredits: number;
  // 단순 행 개수
  rows: number;
}

export function summarize(courses: UserCourse[]): GpaSummary {
  let gradedCredits = 0;
  let weightedTotal = 0;
  let earnedCredits = 0;

  for (const c of courses) {
    if (c.is_excluded) continue;

    const point = GRADE_POINTS[c.grade];
    if (point !== null) {
      gradedCredits += c.credits;
      weightedTotal += point * c.credits;
      // F 는 평점에는 들어가지만 이수 학점에는 들어가지 않음
      if (c.grade !== "F") earnedCredits += c.credits;
    } else if (c.grade === "P") {
      // P 는 평점 외, 이수 학점에는 포함
      earnedCredits += c.credits;
    }
    // NP / excluded 는 양쪽 모두 제외
  }

  // `rows` is always courses.length — an all-NP or all-excluded (but non-empty)
  // list still has rows. Do NOT early-return a zeroed summary on
  // gradedCredits===0, or rows would collapse to 0 and contradict the normal
  // path (which counts excluded rows). gpa stays null when nothing is graded.
  return {
    gradedCredits,
    weightedTotal,
    gpa: gradedCredits === 0 ? null : weightedTotal / gradedCredits,
    earnedCredits,
    rows: courses.length,
  };
}

// 학기별로 묶은 뒤 각 학기의 GPA 와 누적 정보를 동시에 제공.
export interface SemesterRollup {
  semester: string;
  courses: UserCourse[];
  summary: GpaSummary;
}

export function rollupBySemester(courses: UserCourse[]): SemesterRollup[] {
  const buckets = new Map<string, UserCourse[]>();
  for (const c of courses) {
    const list = buckets.get(c.semester);
    if (list) list.push(c);
    else buckets.set(c.semester, [c]);
  }
  const semesters = Array.from(buckets.keys()).sort();
  return semesters.map((semester) => {
    const list = buckets.get(semester)!;
    return { semester, courses: list, summary: summarize(list) };
  });
}

// 어떤 목표 GPA 에 도달하기 위해 앞으로 N 학점에서 평균 몇 점이 필요한가.
// 결과:
//   - { kind: "reached" }            현재 이미 목표 이상
//   - { kind: "impossible" }         남은 학점이 최고점이어도 도달 불가
//   - { kind: "need", requiredAvg }  필요 평균 (0..4.5 사이)
//   - { kind: "noPlannedCredits" }   plannedCredits<=0 일 때 (입력 보조)
export type GpaProjection =
  | { kind: "reached" }
  | { kind: "impossible"; bestPossibleGpa: number }
  | { kind: "need"; requiredAvg: number }
  | { kind: "noPlannedCredits" };

export function projectForTarget(
  current: GpaSummary,
  plannedCredits: number,
  targetGpa: number,
): GpaProjection {
  if (current.gpa !== null && current.gpa >= targetGpa) {
    return { kind: "reached" };
  }
  if (plannedCredits <= 0) return { kind: "noPlannedCredits" };

  const totalCredits = current.gradedCredits + plannedCredits;
  const bestPossible =
    (current.weightedTotal + plannedCredits * GRADE_MAX) / totalCredits;
  if (bestPossible < targetGpa) {
    return { kind: "impossible", bestPossibleGpa: bestPossible };
  }

  const requiredAvg =
    (targetGpa * totalCredits - current.weightedTotal) / plannedCredits;
  return { kind: "need", requiredAvg };
}
