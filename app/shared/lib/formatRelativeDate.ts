const japanDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 日本時間の日付単位。直近は相対日付、それ以前は月日（別年は年付き）。 */
export function formatRelativeDate(value: string, now = new Date()): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const day = japanDate.format(date);
  const today = japanDate.format(now);
  const elapsed = Math.round(
    (Date.parse(today) - Date.parse(day)) / 86_400_000,
  );
  if (elapsed === 0) return "今日";
  if (elapsed === 1) return "昨日";
  if (elapsed > 1 && elapsed < 7) return `${elapsed}日前`;
  const [year, month, dateOfMonth] = day.split("-");
  const short = `${Number(month)}/${Number(dateOfMonth)}`;
  return year === today.slice(0, 4) ? short : `${year}/${short}`;
}
