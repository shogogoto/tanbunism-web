import { type TouchEvent, useRef } from "react";
import {
  type SwipeGesture,
  finishSwipeGesture,
  lockSwipeAxis,
  startSwipeGesture,
} from "~/shared/lib/swipe";

/** Navigation requires a deliberate gesture; scrolling never switches tabs. */
export function useTouchNavigation(
  onSwipe: (direction: "left" | "right") => void,
) {
  const gesture = useRef<SwipeGesture | undefined>(undefined);
  return {
    onTouchStart(event: TouchEvent<HTMLElement>) {
      const touch = event.touches[0];
      gesture.current =
        event.touches.length === 1 && touch && !ignoreTouch(event.target)
          ? startSwipeGesture(touch.clientX, touch.clientY)
          : undefined;
    },
    onTouchMove(event: TouchEvent<HTMLElement>) {
      const touch = event.touches[0];
      if (event.touches.length !== 1) gesture.current = undefined;
      if (gesture.current && touch)
        gesture.current = lockSwipeAxis(
          gesture.current,
          touch.clientX,
          touch.clientY,
        );
    },
    onTouchEnd(event: TouchEvent<HTMLElement>) {
      const current = gesture.current;
      gesture.current = undefined;
      const touch = event.changedTouches[0];
      if (!current || !touch) return;
      const direction = finishSwipeGesture(
        current,
        touch.clientX,
        touch.clientY,
      );
      if (direction) onSwipe(direction);
    },
    onTouchCancel() {
      gesture.current = undefined;
    },
  };
}

function ignoreTouch(target: EventTarget) {
  return (
    target instanceof Element &&
    target.closest(
      "input, textarea, select, [role=dialog], [data-dashboard-swipe-ignore]",
    )
  );
}
