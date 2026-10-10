import { describe, expect, it, vi } from "vitest";
import { loader } from "./game";

vi.mock("~/features/game", () => ({ default: () => null }));

describe("game menu routes", () => {
  it.each([undefined, "status", "item"])("accepts menu %s", (menu) => {
    expect(loader({ params: { menu } })).toBeNull();
  });

  it.each(["adventure", "unknown"])("opens adventure for menu %s", (menu) => {
    const response = loader({
      params: { menu },
    });
    expect(response?.status).toBe(302);
    expect(response?.headers.get("Location")).toBe("/game");
  });
});
