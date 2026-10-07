import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useTouchNavigation } from "./useTouchNavigation";

function Fixture({
  onSwipe,
}: { onSwipe: (direction: "left" | "right") => void }) {
  const horizontal = useTouchNavigation(onSwipe);
  return (
    <div data-testid="horizontal" {...horizontal}>
      問題
      <input aria-label="検索" />
      <div data-dashboard-swipe-ignore>除外</div>
    </div>
  );
}

function swipe(element: HTMLElement, endX: number, endY: number) {
  fireEvent.touchStart(element, { touches: [{ clientX: 200, clientY: 200 }] });
  fireEvent.touchMove(element, { touches: [{ clientX: endX, clientY: endY }] });
  fireEvent.touchEnd(element, {
    changedTouches: [{ clientX: endX, clientY: endY }],
  });
}

it("横スワイプは左右を通知し、縦・入力・除外領域は無視する", () => {
  const onSwipe = vi.fn();
  render(<Fixture onSwipe={onSwipe} />);
  swipe(screen.getByTestId("horizontal"), 50, 200);
  swipe(screen.getByTestId("horizontal"), 350, 200);
  expect(onSwipe.mock.calls).toEqual([["left"], ["right"]]);
  swipe(screen.getByTestId("horizontal"), 200, 50);
  swipe(screen.getByRole("textbox"), 50, 200);
  swipe(screen.getByText("除外"), 50, 200);
  expect(onSwipe).toHaveBeenCalledTimes(2);
});

it("キャンセルされたジェスチャーでは移動しない", () => {
  const onSwipe = vi.fn();
  render(<Fixture onSwipe={onSwipe} />);
  const horizontal = screen.getByTestId("horizontal");
  fireEvent.touchStart(horizontal, {
    touches: [{ clientX: 200, clientY: 200 }],
  });
  fireEvent.touchCancel(horizontal);
  fireEvent.touchEnd(horizontal, {
    changedTouches: [{ clientX: 50, clientY: 200 }],
  });
  expect(onSwipe).not.toHaveBeenCalled();
});
