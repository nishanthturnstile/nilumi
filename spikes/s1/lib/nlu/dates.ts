import * as chrono from "chrono-node";
import { DateTime } from "luxon";
import type { DateExpr } from "./contracts";

export const ZONE = "Asia/Kolkata";
export type DateResolution = {
  resolved?: string;
  precision?: DateExpr["precision"];
  reason?: string;
};
const iso = (x: DateTime) =>
  x.toISO({ suppressMilliseconds: true }) ?? undefined;
export function resolveDate(
  phrase: string,
  occurredAt: string,
): DateResolution {
  const now = DateTime.fromISO(occurredAt).setZone(ZONE);
  let s = phrase.normalize("NFC").toLowerCase().trim();
  for (const [a, b] of [
    ["நாளை", "tomorrow"],
    ["naalai", "tomorrow"],
    ["naalaikku", "tomorrow"],
    ["இன்று", "today"],
    ["innaikku", "today"],
    ["காலை", "morning"],
    ["kaalai", "morning"],
    ["மாலை", "evening"],
    ["maalai", "evening"],
    ["இரவு", "tonight"],
    ["raathiri", "tonight"],
    ["மதியம்", "afternoon"],
    ["madhiyam", "afternoon"],
    ["adutha sanikizhamai", "next saturday"],
  ])
    s = s.replaceAll(a, b);
  if (!now.isValid || !s) return { reason: "unresolved_date" };
  if (/^\d{4}$/.test(s) || /^in \d{4}$/.test(s))
    return {
      resolved: iso(
        now
          .set({ year: Number(s.match(/\d{4}/)?.[0]), month: 1, day: 1 })
          .startOf("day"),
      ),
      precision: "year",
    };
  if (s === "next month")
    return {
      resolved: iso(now.plus({ months: 1 }).startOf("month")),
      precision: "month",
    };
  const month =
    /^(?:in |from )?(january|february|march|april|may|june|july|august|september|october|november|december)(?: (\d{4}))?$/.exec(
      s,
    );
  if (month) {
    const m =
      "january february march april may june july august september october november december"
        .split(" ")
        .indexOf(month[1]) + 1;
    return {
      resolved: iso(
        now
          .set({
            year: month[2] ? Number(month[2]) : now.year,
            month: m,
            day: 1,
          })
          .startOf("day"),
      ),
      precision: "month",
    };
  }
  if (s === "weekend" || s === "this weekend") {
    const delta = (6 - now.weekday + 7) % 7;
    return {
      resolved: iso(
        now
          .plus({ days: delta })
          .set({ hour: 10, minute: 0, second: 0, millisecond: 0 }),
      ),
      precision: "minute",
    };
  }
  if (/^(?:at )?\d{1,2}$/.test(s)) return { reason: "ambiguous_time" };
  const defaults: Record<string, [number, number]> = {
    morning: [9, 0],
    afternoon: [14, 0],
    evening: [18, 30],
    tonight: [20, 30],
  };
  const part = Object.keys(defaults).find((p) => s.includes(p));
  let base = now.startOf("day");
  const weekday =
    /next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/.exec(s);
  if (s.includes("tomorrow")) base = base.plus({ days: 1 });
  else if (weekday) {
    const day =
      "monday tuesday wednesday thursday friday saturday sunday"
        .split(" ")
        .indexOf(weekday[1]) + 1;
    base = base.plus({ days: (day - now.weekday + 7) % 7 || 7 });
  } else if (
    !(
      s.includes("today") ||
      s.includes("tonight") ||
      /^(?:at )?\d{1,2}(?::\d{2})?\s*(?:am|pm)$/.test(s)
    )
  ) {
    const parsed = chrono.en.GB.parse(s, {
      instant: now.toJSDate(),
      timezone: 330,
    });
    if (parsed.length !== 1) return { reason: "unresolved_date" };
    const start = parsed[0].start;
    base = base.set({
      year: start.get("year") ?? now.year,
      month: start.get("month") ?? now.month,
      day: start.get("day") ?? now.day,
    });
    if (!base.isValid) return { reason: "unresolved_date" };
    if (!part && start.isCertain("hour"))
      return {
        resolved: iso(
          base.set({
            hour: start.get("hour") ?? 0,
            minute: start.get("minute") ?? 0,
          }),
        ),
        precision: "minute",
      };
    if (!part) return { resolved: iso(base), precision: "day" };
  }
  const time = /(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/.exec(s);
  if (time) {
    let hour = Number(time[1]);
    if (hour < 1 || hour > 12 || Number(time[2] ?? 0) > 59)
      return { reason: "unresolved_date" };
    hour = (hour % 12) + (time[3] === "pm" ? 12 : 0);
    return {
      resolved: iso(base.set({ hour, minute: Number(time[2] ?? 0) })),
      precision: "minute",
    };
  }
  if (part) {
    const [hour, minute] = defaults[part];
    return { resolved: iso(base.set({ hour, minute })), precision: "minute" };
  }
  return { resolved: iso(base), precision: "day" };
}
export function checkDate(
  date: DateExpr,
  occurredAt: string,
  reminder = false,
): string | null {
  const computed = resolveDate(date.phrase, occurredAt);
  if (computed.reason) return computed.reason;
  if (!date.resolved) return "unresolved_date";
  if (
    DateTime.fromISO(date.resolved).toMillis() !==
      DateTime.fromISO(computed.resolved ?? "").toMillis() ||
    date.precision !== computed.precision
  )
    return "date_disagreement";
  if (reminder && date.precision !== "minute") return "missing_time";
  if (
    reminder &&
    DateTime.fromISO(date.resolved).toMillis() <=
      DateTime.fromISO(occurredAt).toMillis()
  )
    return "past_time";
  return null;
}
