import { expect, it } from "vitest";
import { shuffleOptionIds } from "./optionOrder";

it("shuffles without mutating or losing answer IDs, even numeric IDs", () => {
  const ids = ["1", "2", "3"];
  expect(shuffleOptionIds(ids, () => 0)).toEqual(["2", "3", "1"]);
  expect(ids).toEqual(["1", "2", "3"]);
  expect(shuffleOptionIds(ids, () => 0.999)).toEqual(ids);
  expect(shuffleOptionIds([], () => 0)).toEqual([]);
  expect(shuffleOptionIds(["only"], () => 0)).toEqual(["only"]);
});
