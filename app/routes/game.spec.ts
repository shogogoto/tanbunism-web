import { describe, expect, it, vi } from "vitest";
import { loader } from "./game";

vi.mock("~/features/game", () => ({ default: () => null }));

describe("game menu routes", () => {
  it.each([undefined, "adventure", "status", "item"])(
    "accepts menu %s",
    (menu) => {
      expect(loader({ params: { menu } })).toBeNull();
    },
  );

  it("returns unknown menus to the game entrance", () => {
    const response = loader({
      params: { menu: "unknown" },
    });
    expect(response?.status).toBe(302);
    expect(response?.headers.get("Location")).toBe("/game");
  });
});
