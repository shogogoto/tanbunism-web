import type { DungeonContent, PathKnowledge } from "./api";
import type { GameSave, Run } from "./domain";

export const ENTRANCE = "@entrance";
export const PLACES_PER_REGION = 5;
export type DungeonMap = {
  current: string;
  places: { id: string; region: number }[];
  edges: { from: string; to: string; kind: "relation" | "detour" }[];
};
export type ParkedDungeon = { run: Run; content?: DungeonContent };

/** Old ordered routes become a connected map without inventing knowledge relations. */
export function dungeonMap(save: GameSave, run: Run): DungeonMap {
  const stored = save.maps?.[run.resourceId];
  if (stored) return stored;
  const ids = [...new Set(run.readIds)];
  return {
    current: run.readIds.at(-1) ?? ENTRANCE,
    places: ids.map((id, index) => ({
      id,
      region: Math.floor(index / PLACES_PER_REGION),
    })),
    edges: ids.map((id, index) => ({
      from: ids[index - 1] ?? ENTRANCE,
      to: id,
      kind: "detour",
    })),
  };
}

export function neighbours(map: DungeonMap): string[] {
  return [
    ...new Set(
      map.edges.flatMap((edge) =>
        edge.from === map.current
          ? [edge.to]
          : edge.to === map.current
            ? [edge.from]
            : [],
      ),
    ),
  ];
}

export function explore(
  save: GameSave,
  id: string,
  kind: "relation" | "detour",
): GameSave {
  if (!save.run) return save;
  const map = dungeonMap(save, save.run);
  if (id === map.current) return save;
  const known = id === ENTRANCE || map.places.some((place) => place.id === id);
  const connected = map.edges.some(
    (edge) =>
      (edge.from === map.current && edge.to === id) ||
      (edge.to === map.current && edge.from === id),
  );
  return {
    ...save,
    maps: {
      ...save.maps,
      [save.run.resourceId]: {
        current: id,
        places: known
          ? map.places
          : [
              ...map.places,
              { id, region: Math.floor(map.places.length / PLACES_PER_REGION) },
            ],
        // Travel to known places never invents a knowledge relation or detour.
        edges:
          known || connected
            ? map.edges
            : [...map.edges, { from: map.current, to: id, kind }],
      },
    },
  };
}

/** Parking is not retreat: no healing, no reset, and no active battle switching. */
export function parkDungeon(save: GameSave): GameSave {
  if (!save.run || save.run.phase === "battle" || save.battleFeedback)
    return save;
  return {
    ...save,
    maps: { ...save.maps, [save.run.resourceId]: dungeonMap(save, save.run) },
    dungeons: {
      ...save.dungeons,
      [save.run.resourceId]: { run: save.run, content: save.content },
    },
    run: undefined,
    content: undefined,
    battleFeedback: undefined,
  };
}

export function knownKnowledge(
  content: DungeonContent,
  added: PathKnowledge[],
): DungeonContent {
  return {
    ...content,
    knowledge: [
      ...new Map(
        [...content.knowledge, ...added].map((item) => [item.uid, item]),
      ).values(),
    ],
  };
}
