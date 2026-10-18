type Box = { left: number; right: number; top: number; bottom: number };
export type Direction = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

/** Choose in visual space, preferring aligned controls and never wrapping edges. */
export function nearestControl(
  origin: Box,
  boxes: Box[],
  direction: Direction,
) {
  const horizontal = direction === "ArrowLeft" || direction === "ArrowRight";
  const sign = direction === "ArrowLeft" || direction === "ArrowUp" ? -1 : 1;
  const center = (box: Box) =>
    horizontal
      ? [(box.left + box.right) / 2, (box.top + box.bottom) / 2]
      : [(box.top + box.bottom) / 2, (box.left + box.right) / 2];
  const [a, b] = center(origin);
  let best = -1;
  let score = Number.POSITIVE_INFINITY;
  for (const [index, box] of boxes.entries()) {
    const [x, y] = center(box);
    const forward = (x - a) * sign;
    const sideways = Math.abs(y - b);
    const aligned = horizontal
      ? box.top < origin.bottom && box.bottom > origin.top
      : box.left < origin.right && box.right > origin.left;
    if (forward <= 1 || (!aligned && sideways > forward * 2)) continue;
    // A full-width answer is directly below a narrow enemy card even though
    // their centres differ. Prioritize the next aligned row, not a far-away
    // small report/confirm button whose centre happens to line up perfectly.
    const distance =
      forward + (aligned ? sideways * 0.01 : sideways * 2 + 10000);
    if (distance < score) {
      score = distance;
      best = index;
    }
  }
  return best;
}

export function movePanelFocus(
  root: HTMLElement,
  target: HTMLElement,
  direction: Direction,
) {
  const controls = Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    ),
  ).filter((element) => {
    if (
      element.closest(
        '[hidden], [aria-hidden="true"], [data-spatial-focus-ignore], [data-slot="dialog-close"]',
      )
    )
      return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  if (!controls.includes(target)) return false;
  const next = nearestControl(
    target.getBoundingClientRect(),
    controls.map((element) => element.getBoundingClientRect()),
    direction,
  );
  if (next < 0) return false;
  controls[next].focus();
  controls[next].scrollIntoView?.({ block: "nearest", inline: "nearest" });
  return true;
}
