import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import PullToRefresh from "./PullToRefresh";

function renderRefresh(onRefresh = vi.fn(async () => {})) {
  render(
    <PullToRefresh enabled className="overflow-y-auto" onRefresh={onRefresh}>
      <p>content</p>
    </PullToRefresh>,
  );
  const container = screen.getByRole("main");
  Object.defineProperty(container, "scrollTop", { value: 0, writable: true });
  return { container, onRefresh };
}

it("ページ先頭を十分に下へ引いて離すと更新する", async () => {
  const { container, onRefresh } = renderRefresh();

  fireEvent.touchStart(container, {
    touches: [{ clientX: 40, clientY: 20 }],
  });
  fireEvent.touchMove(container, {
    touches: [{ clientX: 42, clientY: 180 }],
  });
  expect(screen.getByText("離して更新")).toBeVisible();
  fireEvent.touchEnd(container, {
    changedTouches: [{ clientX: 42, clientY: 180 }],
  });

  await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
});

it("横スワイプや途中までのpullでは更新しない", () => {
  const { container, onRefresh } = renderRefresh();

  fireEvent.touchStart(container, {
    touches: [{ clientX: 20, clientY: 20 }],
  });
  fireEvent.touchMove(container, {
    touches: [{ clientX: 160, clientY: 40 }],
  });
  fireEvent.touchEnd(container);

  fireEvent.touchStart(container, {
    touches: [{ clientX: 20, clientY: 20 }],
  });
  fireEvent.touchMove(container, {
    touches: [{ clientX: 20, clientY: 80 }],
  });
  fireEvent.touchEnd(container);

  expect(onRefresh).not.toHaveBeenCalled();
});

it("スクロール途中ではpullしても更新しない", () => {
  const { container, onRefresh } = renderRefresh();
  container.scrollTop = 10;

  fireEvent.touchStart(container, {
    touches: [{ clientX: 20, clientY: 20 }],
  });
  fireEvent.touchMove(container, {
    touches: [{ clientX: 20, clientY: 200 }],
  });
  fireEvent.touchEnd(container);

  expect(onRefresh).not.toHaveBeenCalled();
});
