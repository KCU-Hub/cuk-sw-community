import { createClient } from "@/lib/supabase/server";

export type RateAction = "post_create" | "comment_create" | "like_toggle";

export interface RateLimit {
  perMinute: number;
  perHour: number;
}

// Personal archive 기준 — 정상 owner 작업은 이 한도 안쪽, 자동화 실수와
// bot spam 만 차단. 필요 시 admin 이 DB config 로 이관할 수 있음.
export const RATE_LIMITS: Record<RateAction, RateLimit> = {
  post_create:    { perMinute: 5,  perHour: 30  },
  comment_create: { perMinute: 10, perHour: 100 },
  like_toggle:    { perMinute: 30, perHour: 300 },
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export type RateLimitDecision =
  | { ok: true }
  | { ok: false; reason: "minute" | "hour" };

// Pure function — given raw event timestamps + now + limit config, decide
// whether a new event should be admitted. Extracted so the policy is unit
// testable without a Supabase client.
export function decideRateLimit(
  events: Date[],
  now: Date,
  limits: RateLimit,
): RateLimitDecision {
  const nowMs = now.getTime();
  let minuteCount = 0;
  let hourCount = 0;
  for (const e of events) {
    const t = e.getTime();
    if (t >= nowMs - HOUR_MS) hourCount += 1;
    if (t >= nowMs - MINUTE_MS) minuteCount += 1;
  }
  if (minuteCount >= limits.perMinute) return { ok: false, reason: "minute" };
  if (hourCount >= limits.perHour) return { ok: false, reason: "hour" };
  return { ok: true };
}

// Throws if the user has exceeded the limit; otherwise records the event
// and returns. Callers invoke this as the first real side-effect inside a
// server action so that rate-limit errors surface before any DB mutation.
//
// Threat model — best-effort, NOT atomic:
//   fetch events → decide → insert is a TOCTOU window. N parallel requests
//   from the same user can all observe count < limit before any of them
//   inserts, letting up to N-1 extra events through. Acceptable because the
//   limits exist to slow accidental floods and bot-level spam at personal
//   archive scale; a determined adversary bypassing by O(limit) is not
//   in scope. Do NOT assume strict ordering from this function — if you
//   need atomicity (e.g. for billing), move the check into a DB function
//   that holds a row lock or uses INSERT ... WHERE.
export async function enforceRateLimit(
  userId: string,
  action: RateAction,
): Promise<void> {
  const supabase = await createClient();
  const limits = RATE_LIMITS[action];
  const now = new Date();
  const oneHourAgoIso = new Date(now.getTime() - HOUR_MS).toISOString();

  // 단일 fetch 로 최근 1h 이벤트를 가져오고 메모리에서 분류 — 두 번의
  // count() 쿼리보다 DB round-trip 이 하나 적고, 분/시간 임계치 대비
  // archive 규모에선 자릿수가 수십 건 이내라 payload 도 가벼움.
  const { data, error } = await supabase
    .from("rate_limit_events")
    .select("created_at")
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", oneHourAgoIso);

  if (error) throw error;

  const events = (data ?? []).map((r) => new Date(r.created_at as string));
  const decision = decideRateLimit(events, now, limits);

  if (!decision.ok) {
    throw new Error(
      decision.reason === "minute"
        ? "요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요."
        : "1시간 이내 허용 요청 수를 초과했습니다. 나중에 다시 시도해주세요.",
    );
  }

  const { error: insertError } = await supabase
    .from("rate_limit_events")
    .insert({ user_id: userId, action });
  if (insertError) throw insertError;
}
