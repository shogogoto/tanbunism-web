import { afterEach, expect, it, vi } from "vitest";
import { loadDungeonPreparation } from "./api";
import { gameRequest } from "./battle";
import { newSave } from "./domain";
import { recoverGameState, requestGameState } from "./state";

afterEach(() => vi.unstubAllGlobals());
it.each(["save", "recover", "battle", "preparation"])(
  "explains structured %s errors instead of [object Object]",
  async (operation) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              detail: [
                {
                  loc: ["body", "save"],
                  msg: "MPが最大値を超えています。",
                  type: "value_error",
                },
              ],
            }),
            { status: 422 },
          ),
      ),
    );
    const request =
      operation === "save"
        ? requestGameState({ revision: 0, save: newSave() })
        : operation === "recover"
          ? recoverGameState()
          : operation === "battle"
            ? gameRequest("battle/next", {})
            : loadDungeonPreparation("book");
    await expect(request).rejects.toThrow("MPが最大値を超えています。");
  },
);
