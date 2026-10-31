import { describe, expect, it, vi } from "vitest";
import { gameMenuTabs } from "~/features/game/menu";
import { loader } from "./game";

vi.mock("~/features/game", () => ({ default: () => null }));

describe("game menu routes", () => {
  it.each([undefined, ...gameMenuTabs.map(([tab]) => tab), "shop", "boss"])(
    "accepts menu %s",
    (menu) => {
      expect(loader({ params: { menu } })).toBeNull();
    },
  );

  it.each(["adventure", "unknown"])("opens adventure for menu %s", (menu) => {
    const response = loader({
      params: { menu },
    });
    expect(response?.status).toBe(302);
    expect(response?.headers.get("Location")).toBe("/game");
  });
});
