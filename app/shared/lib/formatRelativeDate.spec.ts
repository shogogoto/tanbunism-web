import { expect, it } from "vitest";
import { formatRelativeDate } from "./formatRelativeDate";

it("日本時間の今日・昨日・直近の日数で省略する", () => {
  const now = new Date("2026-10-06T01:00:00Z");
  expect(formatRelativeDate("2026-10-06", now)).toBe("今日");
  expect(formatRelativeDate("2026-10-05T16:00:00Z", now)).toBe("今日");
  expect(formatRelativeDate("2026-10-05", now)).toBe("昨日");
  expect(formatRelativeDate("2026-10-04", now)).toBe("2日前");
  expect(formatRelativeDate("2026-09-30", now)).toBe("6日前");
});

it("古い日付と未来は月日、別年は年も残し、不正値を安全に扱う", () => {
  const now = new Date("2026-10-06T01:00:00Z");
  expect(formatRelativeDate("2026-09-29", now)).toBe("9/29");
  expect(formatRelativeDate("2025-10-06", now)).toBe("2025/10/6");
  expect(formatRelativeDate("2026-10-08", now)).toBe("10/8");
  expect(formatRelativeDate("invalid", now)).toBe("—");
});
