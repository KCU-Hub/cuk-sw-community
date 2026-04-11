const RELATIVE = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
const DATE = new Intl.DateTimeFormat("ko", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
const DATE_TIME = new Intl.DateTimeFormat("ko", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatRelativeKo(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const diffSec = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);

  if (abs < MINUTE) return RELATIVE.format(Math.round(diffSec), "second");
  if (abs < HOUR) return RELATIVE.format(Math.round(diffSec / MINUTE), "minute");
  if (abs < DAY) return RELATIVE.format(Math.round(diffSec / HOUR), "hour");
  if (abs < WEEK) return RELATIVE.format(Math.round(diffSec / DAY), "day");

  return DATE.format(date);
}

export function formatDateKo(input: string | Date): string {
  return DATE.format(typeof input === "string" ? new Date(input) : input);
}

export function formatDateTimeKo(input: string | Date): string {
  return DATE_TIME.format(typeof input === "string" ? new Date(input) : input);
}
