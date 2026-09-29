import { describe, expect, it } from "vitest";
import { finishSwipeGesture, lockSwipeAxis, startSwipeGesture } from "./swipe";

describe("dashboard swipe", () => {
  it("明確な横フリックだけを判定する", () => {
    const gesture = lockSwipeAxis(startSwipeGesture(200, 100), 160, 105);

    expect(gesture.axis).toBe("horizontal");
    expect(finishSwipeGesture(gesture, 90, 110)).toBe("left");
  });

  it("縦に始まった操作は後から横へそれても判定しない", () => {
    const gesture = lockSwipeAxis(startSwipeGesture(200, 100), 196, 125);

    expect(gesture.axis).toBe("vertical");
    expect(finishSwipeGesture(gesture, 80, 240)).toBeUndefined();
  });

  it("斜め移動と短い横移動を判定しない", () => {
    const diagonal = lockSwipeAxis(startSwipeGesture(200, 100), 170, 120);
    const short = lockSwipeAxis(startSwipeGesture(200, 100), 170, 100);

    expect(diagonal.axis).toBe("vertical");
    expect(finishSwipeGesture(diagonal, 80, 170)).toBeUndefined();
    expect(finishSwipeGesture(short, 130, 100)).toBeUndefined();
  });
});
