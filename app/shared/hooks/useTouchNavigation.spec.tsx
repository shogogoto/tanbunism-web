import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useBottomSwipe, useTouchNavigation } from "./useTouchNavigation";

function Fixture({
  onNext,
  onSwipe,
  enabled = true,
}: {
  onNext: () => void;
  onSwipe: (direction: "left" | "right") => void;
  enabled?: boolean;
}) {
  const bottom = useBottomSwipe(onNext, enabled);
  const horizontal = useTouchNavigation(onSwipe);
  return (
    <div data-testid="scroll" style={{ overflowY: "auto" }}>
      <div data-testid="horizontal" {...horizontal}>
        <div data-testid="quiz" {...bottom}>
          問題
        </div>
        <input aria-label="検索" />
        <div data-dashboard-swipe-ignore>除外</div>
      </div>
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

it("下端からの上スワイプだけが次の問題へ進む", () => {
  const onNext = vi.fn();
  const onSwipe = vi.fn();
  render(<Fixture onNext={onNext} onSwipe={onSwipe} />);
  const container = screen.getByTestId("scroll");
  Object.defineProperties(container, {
    scrollHeight: { value: 1000 },
    clientHeight: { value: 400 },
    scrollTop: { value: 100, writable: true },
  });
  const quiz = screen.getByTestId("quiz");
  swipe(quiz, 200, 50);
  expect(onNext).not.toHaveBeenCalled();
  container.scrollTop = 600;
  swipe(quiz, 200, 150);
  swipe(quiz, 200, 350);
  expect(onNext).not.toHaveBeenCalled();
  swipe(quiz, 200, 50);
  expect(onNext).toHaveBeenCalledTimes(1);
  expect(onSwipe).not.toHaveBeenCalled();
});

it("横スワイプは左右を通知し、縦・入力・除外領域は無視する", () => {
  const onSwipe = vi.fn();
  render(<Fixture onNext={vi.fn()} onSwipe={onSwipe} />);
  swipe(screen.getByTestId("horizontal"), 50, 200);
  swipe(screen.getByTestId("horizontal"), 350, 200);
  expect(onSwipe.mock.calls).toEqual([["left"], ["right"]]);
  swipe(screen.getByTestId("horizontal"), 200, 50);
  swipe(screen.getByRole("textbox"), 50, 200);
  swipe(screen.getByText("除外"), 50, 200);
  expect(onSwipe).toHaveBeenCalledTimes(2);
});

it("最後の問題とキャンセルされたジェスチャーでは進まない", () => {
  const onNext = vi.fn();
  const onSwipe = vi.fn();
  render(<Fixture onNext={onNext} onSwipe={onSwipe} enabled={false} />);
  swipe(screen.getByTestId("quiz"), 200, 50);
  expect(onNext).not.toHaveBeenCalled();
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
