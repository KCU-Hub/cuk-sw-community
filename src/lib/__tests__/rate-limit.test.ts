import { describe, expect, it } from "vitest";
import { decideRateLimit, RATE_LIMITS } from "../rate-limit";

function ago(now: Date, ms: number): Date {
  return new Date(now.getTime() - ms);
}

const S = 1000;
const M = 60 * S;

describe("decideRateLimit", () => {
  const now = new Date(2026, 3, 21, 12, 0, 0);

  it("admits when no prior events", () => {
    expect(decideRateLimit([], now, RATE_LIMITS.post_create)).toEqual({ ok: true });
  });

  it("admits below minute + hour thresholds", () => {
    const events = [ago(now, 10 * S), ago(now, 30 * S), ago(now, 45 * S)];
    // post_create: perMinute=5, perHour=30
    expect(decideRateLimit(events, now, RATE_LIMITS.post_create)).toEqual({ ok: true });
  });

  it("rejects at minute threshold (>=)", () => {
    // 5 events inside last minute, post_create.perMinute = 5 → rejected
    const events = [
      ago(now, 5 * S),
      ago(now, 10 * S),
      ago(now, 15 * S),
      ago(now, 20 * S),
      ago(now, 25 * S),
    ];
    expect(decideRateLimit(events, now, RATE_LIMITS.post_create)).toEqual({
      ok: false,
      reason: "minute",
    });
  });

  it("does not count events older than 1 minute toward minute threshold", () => {
    const events = [
      ago(now, 5 * S),
      ago(now, 10 * S),
      ago(now, 50 * S),
      ago(now, 65 * S), // outside 1-minute window
      ago(now, 90 * S),
      ago(now, 2 * M),
    ];
    // Only 3 within 1 minute, limit is 5 → ok
    expect(decideRateLimit(events, now, RATE_LIMITS.post_create)).toEqual({ ok: true });
  });

  it("rejects at hour threshold when minute is fine", () => {
    // 30 events clustered outside the 1-minute window but inside 1 hour.
    // post_create: perMinute=5, perHour=30 → minute count = 0, hour = 30.
    const hourBand: Date[] = [];
    for (let i = 0; i < 30; i += 1) {
      hourBand.push(ago(now, 5 * M + i * S)); // 5min ago + i sec, all inside 1h
    }
    expect(decideRateLimit(hourBand, now, RATE_LIMITS.post_create)).toEqual({
      ok: false,
      reason: "hour",
    });
  });

  it("ignores events beyond the 1-hour window entirely", () => {
    const events = [
      ago(now, 61 * M),
      ago(now, 2 * 60 * M),
      ago(now, 24 * 60 * M),
    ];
    expect(decideRateLimit(events, now, RATE_LIMITS.post_create)).toEqual({ ok: true });
  });

  it("prioritizes minute reason over hour when both would trip", () => {
    const events: Date[] = [];
    // 5 inside minute → minute reason
    for (let i = 0; i < 5; i += 1) events.push(ago(now, i * S));
    // plus 30 inside hour → hour reason would also fire alone
    for (let i = 0; i < 30; i += 1) events.push(ago(now, (2 + i) * M));
    const decision = decideRateLimit(events, now, RATE_LIMITS.post_create);
    expect(decision).toEqual({ ok: false, reason: "minute" });
  });

  it("applies per-action thresholds (comment_create more generous than post_create)", () => {
    // 6 events in a minute — over post_create(5) but under comment_create(10)
    const events = Array.from({ length: 6 }, (_, i) => ago(now, i * S));
    expect(decideRateLimit(events, now, RATE_LIMITS.post_create)).toEqual({
      ok: false,
      reason: "minute",
    });
    expect(decideRateLimit(events, now, RATE_LIMITS.comment_create)).toEqual({
      ok: true,
    });
  });
});
