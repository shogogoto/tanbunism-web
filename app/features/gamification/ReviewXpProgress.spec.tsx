import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import ReviewXpProgress from "./ReviewXpProgress";

it.each([
  {
    current: 31,
    required: 50,
    today: 7,
    previousWidth: "48%",
    todayWidth: "14%",
  },
  {
    current: 18,
    required: 150,
    today: 68,
    previousWidth: "0%",
    todayWidth: "12%",
  },
  {
    current: 31,
    required: 50,
    today: 0,
    previousWidth: "62%",
    todayWidth: "0%",
  },
  {
    current: 31,
    required: 50,
    today: undefined,
    previousWidth: "62%",
    todayWidth: "0%",
  },
  {
    current: 0,
    required: 50,
    today: 50,
    previousWidth: "0%",
    todayWidth: "0%",
  },
])(
  "現在XP $current / $required、今日 $today を二色に分ける",
  ({ current, required, today, previousWidth, todayWidth }) => {
    render(
      <ReviewXpProgress
        currentXp={current}
        requiredXp={required}
        todayXp={today}
      />,
    );
    const bar = screen.getByRole("progressbar");
    expect(bar.querySelector('[data-xp-segment="previous"]')).toHaveStyle({
      width: previousWidth,
    });
    const todaySegment = bar.querySelector<HTMLElement>(
      '[data-xp-segment="today"]',
    );
    expect(Number.parseFloat(todaySegment?.style.width ?? "")).toBeCloseTo(
      Number.parseFloat(todayWidth),
    );
    expect(bar).toHaveAttribute(
      "aria-valuenow",
      String((current / required) * 100),
    );
    expect(bar).toHaveAttribute(
      "aria-valuetext",
      `${current} / ${required} XP${today === undefined ? "" : ` · 今日 +${today} XP`}`,
    );
  },
);
