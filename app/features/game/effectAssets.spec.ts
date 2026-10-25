import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { animationLabels } from "./catalog";
import { spriteAnimationLabels, spriteAsset } from "./effectAssets";

it("registers local strips with valid metadata, licenses and poster files", () => {
  const ids = Object.keys(spriteAnimationLabels);
  expect(ids).toHaveLength(54);
  for (const id of ids) {
    expect(animationLabels).toHaveProperty(id);
    const asset = spriteAsset(id);
    expect(asset).toBeDefined();
    if (!asset) throw new Error(id);
    expect(asset.frames).toBeGreaterThan(2);
    expect(asset.frameSize).toBe(192);
    expect(asset.durationMs).toBeGreaterThanOrEqual(650);
    expect(asset.durationMs).toBeLessThanOrEqual(1600);
    for (const url of [asset.src, asset.poster]) {
      expect(url).toMatch(
        /^\/game-assets\/effects\/(?:oga|mochi|willo)_\w+(?:-poster)?\.webp$/,
      );
      const file = readFileSync(resolve("public", url.slice(1)));
      expect(file.toString("ascii", 0, 4)).toBe("RIFF");
      expect(file.toString("ascii", 8, 12)).toBe("WEBP");
    }
    expect(asset.license).toBe(
      id.startsWith("willo_") || id.startsWith("mochi_")
        ? "Royalty-free"
        : "CC0",
    );
  }
  expect(spriteAsset("../unknown")).toBeUndefined();
  expect(spriteAsset("fire")).toBeUndefined();
});
