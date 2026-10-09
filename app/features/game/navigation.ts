export type MapPoint = { x: number; y: number };

/** Pick a nearby point in the requested screen direction, favouring alignment. */
export function directionalPlace(
  positions: Map<string, MapPoint>,
  from: string,
  key: string,
): string | undefined {
  const origin = positions.get(from);
  const direction = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }[key];
  if (!origin || !direction) return;
  let nearest: string | undefined;
  let best = Number.POSITIVE_INFINITY;
  for (const [id, point] of positions) {
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const forward = dx * direction[0] + dy * direction[1];
    if (forward <= 0) continue;
    const sideways = Math.abs(dx * direction[1] - dy * direction[0]);
    const score = forward + sideways * 2;
    if (score < best) {
      nearest = id;
      best = score;
    }
  }
  return nearest;
}
