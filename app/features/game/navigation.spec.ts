import { expect, it } from "vitest";
import { directionalPlace } from "./navigation";

it("follows screen direction rather than discovery order and does not wrap at edges", () => {
  const positions = new Map([
    ["center", { x: 200, y: 200 }],
    ["down", { x: 200, y: 350 }],
    ["left", { x: 0, y: 200 }],
    ["right", { x: 400, y: 200 }],
    ["diagonal", { x: 250, y: 400 }],
    ["up", { x: 200, y: 50 }],
  ]);
  expect(directionalPlace(positions, "center", "ArrowRight")).toBe("right");
  expect(directionalPlace(positions, "center", "ArrowLeft")).toBe("left");
  expect(directionalPlace(positions, "center", "ArrowUp")).toBe("up");
  expect(directionalPlace(positions, "center", "ArrowDown")).toBe("down");
  expect(directionalPlace(positions, "left", "ArrowLeft")).toBeUndefined();
  expect(directionalPlace(positions, "missing", "ArrowRight")).toBeUndefined();
  expect(directionalPlace(positions, "center", "Enter")).toBeUndefined();
});
