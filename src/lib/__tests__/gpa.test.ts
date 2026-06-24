import { describe, expect, it } from "vitest";
import type { Grade, UserCourse } from "@/lib/types";
import {
  GPA_MILESTONES,
  GRADE_POINTS,
  projectForTarget,
  rollupBySemester,
  summarize,
} from "@/lib/gpa";

let seq = 0;
function mk(opts: {
  semester?: string;
  credits?: number;
  grade?: Grade;
  is_excluded?: boolean;
}): UserCourse {
  seq += 1;
  return {
    id: `c${seq}`,
    user_id: "u1",
    semester: opts.semester ?? "2024-1",
    course_name: `과목${seq}`,
    course_code: null,
    credits: opts.credits ?? 3,
    grade: opts.grade ?? "A",
    is_excluded: opts.is_excluded ?? false,
    memo: null,
    created_at: new Date(2024, 0, seq).toISOString(),
    updated_at: new Date(2024, 0, seq).toISOString(),
  };
}

describe("GRADE_POINTS", () => {
  it("maps standard 4.5 scale", () => {
    expect(GRADE_POINTS["A+"]).toBe(4.5);
    expect(GRADE_POINTS["A"]).toBe(4.0);
    expect(GRADE_POINTS["B+"]).toBe(3.5);
    expect(GRADE_POINTS["F"]).toBe(0.0);
  });
  it("excludes P/NP from grading", () => {
    expect(GRADE_POINTS["P"]).toBeNull();
    expect(GRADE_POINTS["NP"]).toBeNull();
  });
});

describe("summarize", () => {
  it("returns null gpa for empty input", () => {
    const s = summarize([]);
    expect(s.gpa).toBeNull();
    expect(s.gradedCredits).toBe(0);
    expect(s.earnedCredits).toBe(0);
  });

  it("computes weighted GPA on credits", () => {
    // 3학점 A (4.0) + 1학점 A+ (4.5) → (12 + 4.5) / 4 = 4.125
    const s = summarize([
      mk({ credits: 3, grade: "A" }),
      mk({ credits: 1, grade: "A+" }),
    ]);
    expect(s.gpa).toBeCloseTo(4.125, 5);
    expect(s.gradedCredits).toBe(4);
    expect(s.earnedCredits).toBe(4);
  });

  it("includes F in gradedCredits but not earnedCredits", () => {
    const s = summarize([
      mk({ credits: 3, grade: "A" }), // graded 3, earned 3
      mk({ credits: 3, grade: "F" }), // graded 3, earned 0
    ]);
    expect(s.gradedCredits).toBe(6);
    expect(s.earnedCredits).toBe(3);
    expect(s.gpa).toBeCloseTo(2.0, 5); // (12 + 0) / 6
  });

  it("treats P as earned but not graded", () => {
    const s = summarize([
      mk({ credits: 3, grade: "A" }),
      mk({ credits: 2, grade: "P" }),
    ]);
    expect(s.gradedCredits).toBe(3);
    expect(s.earnedCredits).toBe(5);
    expect(s.gpa).toBeCloseTo(4.0, 5);
  });

  it("treats NP as neither graded nor earned", () => {
    const s = summarize([
      mk({ credits: 3, grade: "A" }),
      mk({ credits: 2, grade: "NP" }),
    ]);
    expect(s.gradedCredits).toBe(3);
    expect(s.earnedCredits).toBe(3);
  });

  it("respects is_excluded flag for both graded and earned", () => {
    const s = summarize([
      mk({ credits: 3, grade: "A" }),
      mk({ credits: 3, grade: "F", is_excluded: true }), // 재수강 후 제외 가정
    ]);
    expect(s.gradedCredits).toBe(3);
    expect(s.earnedCredits).toBe(3);
    expect(s.gpa).toBeCloseTo(4.0, 5);
  });

  it("keeps rows = courses.length for an all-NP list (must not collapse to 0)", () => {
    // Regression: an early-return for gradedCredits===0 && earnedCredits===0
    // used to discard courses.length, reporting rows: 0 for a 2-course list.
    const s = summarize([
      mk({ credits: 3, grade: "NP" }),
      mk({ credits: 2, grade: "NP" }),
    ]);
    expect(s.rows).toBe(2);
    expect(s.gpa).toBeNull();
    expect(s.gradedCredits).toBe(0);
    expect(s.earnedCredits).toBe(0);
  });

  it("keeps rows = courses.length for an all-excluded list", () => {
    const s = summarize([
      mk({ credits: 3, grade: "A", is_excluded: true }),
      mk({ credits: 3, grade: "B", is_excluded: true }),
    ]);
    expect(s.rows).toBe(2);
    expect(s.gpa).toBeNull();
  });

  it("reports rows 0 only for a genuinely empty list", () => {
    expect(summarize([]).rows).toBe(0);
  });
});

describe("rollupBySemester", () => {
  it("groups by semester and sorts ascending", () => {
    const r = rollupBySemester([
      mk({ semester: "2024-1", grade: "A" }),
      mk({ semester: "2023-2", grade: "B" }),
      mk({ semester: "2024-1", grade: "B+" }),
    ]);
    expect(r.map((s) => s.semester)).toEqual(["2023-2", "2024-1"]);
    expect(r[1].courses).toHaveLength(2);
  });

  it("computes per-semester gpa independently", () => {
    const r = rollupBySemester([
      mk({ semester: "2024-1", grade: "A" }),
      mk({ semester: "2024-2", grade: "B" }),
    ]);
    expect(r[0].summary.gpa).toBe(4.0);
    expect(r[1].summary.gpa).toBe(3.0);
  });

  it("keeps a non-zero rows count for an all-NP semester bucket", () => {
    const r = rollupBySemester([
      mk({ semester: "2024-1", grade: "NP", credits: 3 }),
      mk({ semester: "2024-2", grade: "A", credits: 3 }),
    ]);
    expect(r[0].summary.rows).toBe(1);
    expect(r[0].summary.gpa).toBeNull();
    expect(r[1].summary.rows).toBe(1);
    expect(r[1].summary.gpa).toBe(4.0);
  });
});

describe("projectForTarget", () => {
  it("returns reached when already at or above target", () => {
    const s = summarize([mk({ credits: 3, grade: "A+" })]);
    expect(projectForTarget(s, 18, 4.0)).toEqual({ kind: "reached" });
  });

  it("returns noPlannedCredits when planned=0 and not reached", () => {
    const s = summarize([mk({ credits: 3, grade: "B" })]);
    expect(projectForTarget(s, 0, 4.0)).toEqual({ kind: "noPlannedCredits" });
  });

  it("computes required avg for plausible 4.0 target", () => {
    // current: 60 credits at 3.8 ⇒ weightedTotal 228
    // target 4.0 with 70 more credits ⇒ required = (4.0*130 - 228)/70 = 4.171
    const s = {
      gradedCredits: 60,
      weightedTotal: 60 * 3.8,
      gpa: 3.8,
      earnedCredits: 60,
      rows: 20,
    };
    const r = projectForTarget(s, 70, 4.0);
    expect(r.kind).toBe("need");
    if (r.kind === "need") expect(r.requiredAvg).toBeCloseTo(4.171, 3);
  });

  it("returns impossible when even max grade is insufficient", () => {
    // current: 100 credits at 3.0 ⇒ even 30 more at 4.5 yields (300 + 135)/130 ≈ 3.35
    const s = {
      gradedCredits: 100,
      weightedTotal: 300,
      gpa: 3.0,
      earnedCredits: 100,
      rows: 30,
    };
    const r = projectForTarget(s, 30, 4.0);
    expect(r.kind).toBe("impossible");
    if (r.kind === "impossible") expect(r.bestPossibleGpa).toBeCloseTo(3.346, 2);
  });
});

describe("GPA_MILESTONES", () => {
  it("includes a personal 4.0 target hint", () => {
    const m = GPA_MILESTONES.find(
      (x) => x.threshold === 4.0 && x.label === "4.0 목표",
    );
    expect(m).toBeDefined();
    expect(m?.hint).toMatch(/개인 목표/);
  });
  it("covers 3.0 / 3.5 / 4.0 / 4.5", () => {
    const thresholds = GPA_MILESTONES.map((m) => m.threshold).sort();
    expect(thresholds).toContain(3.0);
    expect(thresholds).toContain(3.5);
    expect(thresholds).toContain(4.0);
    expect(thresholds).toContain(4.5);
  });
});
