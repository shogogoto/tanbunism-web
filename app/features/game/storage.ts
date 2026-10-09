import { type GameSave, newSave } from "./domain";

export const gameSaveKey = (userId: string) =>
  `tanbunism:game:v1:${userId.replaceAll("-", "").toLowerCase()}`;

export function readGameSave(userId: string): GameSave {
  try {
    const value = JSON.parse(
      localStorage.getItem(gameSaveKey(userId)) ?? "null",
    ) as (Omit<GameSave, "version"> & { version: number }) | null;
    if (
      !value ||
      (value.version !== 1 && value.version !== 2) ||
      !value.clears ||
      typeof value.clears !== "object" ||
      Object.values(value.clears).some(
        (count) => !Number.isInteger(count) || count < 0,
      )
    )
      return newSave();
    const run = value.run;
    if (
      run &&
      (typeof run.resourceId !== "string" ||
        typeof run.name !== "string" ||
        !["path", "battle", "rest", "defeated", "cleared"].includes(
          run.phase,
        ) ||
        !Array.isArray(run.readIds) ||
        run.readIds.some((id) => typeof id !== "string") ||
        [
          run.hp,
          run.maxHp,
          run.attack,
          run.defense,
          run.moves,
          run.kills,
          run.enemyHp,
          run.enemyMaxHp,
          run.quizCursor,
        ].some((number) => !Number.isFinite(number) || number < 0))
    )
      return newSave();
    // Preserve HP/laps from v1, but never trust its device-only cooldown.
    return { version: 2, clears: value.clears, run: value.run };
  } catch {
    return newSave();
  }
}

export function writeGameSave(userId: string, save: GameSave): void {
  localStorage.setItem(gameSaveKey(userId), JSON.stringify(save));
}
