export type SwipeAxis = "pending" | "horizontal" | "vertical";

export type SwipeGesture = {
  startX: number;
  startY: number;
  axis: SwipeAxis;
};

const DIRECTION_LOCK_DISTANCE = 15;
const HORIZONTAL_DOMINANCE_RATIO = 2;
const SWIPE_DISTANCE = 100;

export function startSwipeGesture(x: number, y: number): SwipeGesture {
  return { startX: x, startY: y, axis: "pending" };
}

export function lockSwipeAxis(
  gesture: SwipeGesture,
  x: number,
  y: number,
): SwipeGesture {
  if (gesture.axis !== "pending") return gesture;
  const deltaX = Math.abs(x - gesture.startX);
  const deltaY = Math.abs(y - gesture.startY);
  if (Math.hypot(deltaX, deltaY) < DIRECTION_LOCK_DISTANCE) return gesture;
  return {
    ...gesture,
    axis:
      deltaX >= deltaY * HORIZONTAL_DOMINANCE_RATIO ? "horizontal" : "vertical",
  };
}

export function finishSwipeGesture(
  gesture: SwipeGesture,
  x: number,
  y: number,
): "left" | "right" | undefined {
  const locked = lockSwipeAxis(gesture, x, y);
  if (locked.axis !== "horizontal") return undefined;
  const deltaX = x - locked.startX;
  const deltaY = y - locked.startY;
  if (
    Math.abs(deltaX) < SWIPE_DISTANCE ||
    Math.abs(deltaX) < Math.abs(deltaY) * HORIZONTAL_DOMINANCE_RATIO
  ) {
    return undefined;
  }
  return deltaX < 0 ? "left" : "right";
}
