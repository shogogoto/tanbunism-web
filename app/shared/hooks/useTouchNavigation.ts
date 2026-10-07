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

function scrollContainer(element: HTMLElement): HTMLElement {
  let parent = element.parentElement;
  while (parent) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) return parent;
    parent = parent.parentElement;
  }
  return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

/** A new upward swipe started at the bottom advances one quiz, never mid-scroll. */
export function useBottomSwipe(onNext: () => void, enabled: boolean) {
  const gesture = useRef<SwipeGesture | undefined>(undefined);
  return {
    onTouchStart(event: TouchEvent<HTMLElement>) {
      const touch = event.touches[0];
      const container = scrollContainer(event.currentTarget);
      const atBottom =
        container.scrollHeight - container.clientHeight - container.scrollTop <=
        8;
      gesture.current =
        enabled &&
        atBottom &&
        event.touches.length === 1 &&
        touch &&
        !ignoreTouch(event.target)
          ? startSwipeGesture(touch.clientX, touch.clientY)
          : undefined;
    },
    onTouchMove(event: TouchEvent<HTMLElement>) {
      if (event.touches.length !== 1) gesture.current = undefined;
      const touch = event.touches[0];
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
      if (!current || !touch || !enabled) return;
      const dx = touch.clientX - current.startX;
      const dy = touch.clientY - current.startY;
      if (
        lockSwipeAxis(current, touch.clientX, touch.clientY).axis ===
          "vertical" &&
        dy <= -100 &&
        -dy >= Math.abs(dx) * 2
      )
        onNext();
    },
    onTouchCancel() {
      gesture.current = undefined;
    },
  };
}
