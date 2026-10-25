// Rebuild locally hosted sprite strips from the original downloaded packs.
// Usage: node scripts/import-skill-effects.mjs /tmp/tanbun-skill-effects.XXXXXX
// Requires ImageMagick (convert/identify). No network access; see SOURCES.md.
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const input = process.argv[2];
if (!input)
  throw new Error(
    "Provide the directory containing extracted packs listed in SOURCES.md.",
  );
const output = resolve("public/game-assets/effects");
const only = process.argv[3]?.split(",");
const work = mkdtempSync(join(tmpdir(), "tanbun-effect-import-"));
mkdirSync(output, { recursive: true });
const run = (name, args) => execFileSync(name, args, { encoding: "utf8" });
const specs = [
  ...[1, 2, 3, 4, 5].map((n) => ({
    id: `oga_slash_${n}`,
    directory: `slash/Classic/${n}`,
    author: "Cethiel",
  })),
  ...[
    "fx1_blue_topEffect",
    "fx2_swordFire",
    "fx3_fireBall",
    "fx4_sign_of_fire",
    "fx5_fire_scissors",
    "fx6_eaterFire",
    "fx7_energyBall",
    "fx8_lighteningBall",
    "fx9_rainOnGround",
    "fx10_blackExplosion",
  ].map((directory, i) => ({
    id: `oga_spell_${i + 1}`,
    directory: `magic/${directory}`,
    author: "Mikodrak / Martin Jelinek",
  })),
  ...["Explosion03", "Explosion21", "Effect95", "Effect47", "Aura38"].map(
    (file, i) => ({
      id: `oga_effect_${i + 1}`,
      sheet: `${file}.png`,
      author: "Soluna Software",
    }),
  ),
  ...[0, 1, 2, 3].map((n) => ({
    id: `oga_nature_${n + 1}`,
    directory: "nature",
    prefix: `${n}-`,
    posterFraction: 0.6,
    author: "Cethiel",
  })),
  ...[1, 2, 3, 4, 5, 6].map((n) => ({
    id: `oga_arcane_${n}`,
    directory: `arcane/${String(n).padStart(2, "0")}`,
    posterFraction: 0.6,
    author: "Cethiel",
  })),
  ...["earth", "cosmic"].flatMap((pack) =>
    [1, 2, 3, 4, 5].map((n) => ({
      id: `oga_${pack}_${n}`,
      directory: `${pack}/${n}`,
      posterFraction: 0.6,
      author: "Cethiel",
    })),
  ),
  ...["curse", "buff", "shield", "heal", "speed"].map((effect) => ({
    id: `mochi_status_${effect}`,
    directory: `mochi/game-fx-starter-vol1/frames/starter_status_${effect}`,
    posterFraction: 0.5,
    author: "Mochi Lab Studio",
  })),
  ...[
    ["ice_shatter", 70, 12],
    ["zap", 60, 8],
    ["fire_impact", 70, 11],
    ["cast", 70, 8],
    ["heal", 80, 12],
    ["impact", 60, 8],
  ].map(([effect, frameMs, count]) => ({
    id: `willo_${effect}`,
    directory: `vfx/${effect}/frames`,
    author: "Willosuna",
    pixelArt: true,
    posterFraction: 0.4,
    durationMs: Math.max(650, (count + 1) * frameMs),
  })),
  ...[
    ["ice", "Icespear"],
    ["thunder", "Thundersphere"],
    ["fire", "Fireball"],
  ].map(([id, prefix]) => ({
    id: `oga_star_${id}`,
    directory: "starsteel",
    prefix,
    author: "StarsteelGaming",
    pixelArt: true,
    posterFraction: 0.4,
    durationMs: 750,
  })),
];
const manifestPath = resolve("app/features/game/effectSpriteManifest.json");
const manifest = only ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
let imported = 0;
for (const spec of specs) {
  if (only && !only.includes(spec.id)) continue;
  let files;
  if (spec.directory) {
    const dir = join(input, spec.directory);
    files = readdirSync(dir)
      .filter((f) => f.endsWith(".png") && f.startsWith(spec.prefix ?? ""))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
      .map((f) => join(dir, f));
  } else {
    run("convert", [
      join(input, spec.sheet),
      "-crop",
      "128x128",
      "+repage",
      join(work, `${spec.id}-%02d.png`),
    ]);
    files = readdirSync(work)
      .filter((f) => f.startsWith(`${spec.id}-`))
      .sort()
      .map((f) => join(work, f));
  }
  const sizes = files.map((f) =>
    run("identify", ["-format", "%w %h", f]).trim().split(" ").map(Number),
  );
  const width = Math.max(...sizes.map((s) => s[0]));
  const height = Math.max(...sizes.map((s) => s[1]));
  const normalized = files.map((file, i) => {
    const target = join(work, `${spec.id}-frame-${i}.png`);
    run("convert", [
      file,
      "-background",
      "none",
      "-gravity",
      "center",
      "-extent",
      `${width}x${height}`,
      ...(spec.pixelArt ? ["-filter", "point"] : []),
      "-resize",
      "192x192",
      "-extent",
      "192x192",
      target,
    ]);
    return target;
  });
  // Append a transparent final frame so an effect never stays over the battle.
  const blank = join(work, `${spec.id}-blank.png`);
  run("convert", ["-size", "192x192", "xc:none", blank]);
  const frames = normalized.length + 1;
  run("convert", [
    ...normalized,
    blank,
    "+append",
    "-define",
    "webp:lossless=true",
    join(output, `${spec.id}.webp`),
  ]);
  run("convert", [
    normalized[Math.floor(normalized.length * (spec.posterFraction ?? 1 / 3))],
    "-resize",
    "96x96",
    "-define",
    "webp:lossless=true",
    join(output, `${spec.id}-poster.webp`),
  ]);
  manifest[spec.id] = {
    frames,
    frameSize: 192,
    durationMs:
      spec.durationMs ?? Math.min(1600, Math.max(650, normalized.length * 45)),
    author: spec.author,
  };
  imported++;
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Imported ${imported} animations to ${output}`);
