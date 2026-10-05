/** 日替わり推薦の境界はサーバーと同じ日本時間の午前0時。 */
export function recommendationDay(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 開いたまま日付が変わっても、前日のセットを持ち越さない。 */
export function useRecommendationDay(): string {
  const [day, setDay] = useState(recommendationDay);
  useEffect(() => {
    const update = () => setDay(recommendationDay());
    const timer = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return day;
}
import { useEffect, useState } from "react";
