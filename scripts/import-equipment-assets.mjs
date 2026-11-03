// Import selected, unmodified CC0 equipment sprites from the licensed Crawl ZIP.
// node scripts/import-equipment-assets.mjs /tmp/crawl-tiles.zip
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const archive = process.argv[2];
if (!archive) throw new Error("Provide the original Dungeon Crawl ZIP.");
const files = [
  "leather_armour1.png",
  "chain_mail1.png",
  "plate_mail1.png",
  "robe1.png",
  "headgear/elven_leather_helm.png",
  "headgear/helmet1_visored.png",
  "headgear/helmet2_etched.png",
  "headgear/wizard_hat1.png",
  "boots1_brown.png",
  "boots2_jackboots.png",
  "boots3_stripe.png",
  "glove1.png",
  "glove4_gauntlets.png",
  "cloak1_leather.png",
  "cloak3.png",
];
for (const file of files) {
  const path = `item/armour/${file}`;
  const bytes = execFileSync("unzip", [
    "-p",
    archive,
    `crawl-tiles Oct-5-2010/${path}`,
  ]);
  if (
    bytes.toString("hex", 0, 8) !== "89504e470d0a1a0a" ||
    bytes.readUInt32BE(16) !== 32 ||
    bytes.readUInt32BE(20) !== 32
  )
    throw new Error(`Unexpected sprite: ${path}`);
  const destination = resolve("public/game-assets/crawl", path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
}
console.log(`Imported ${files.length} unmodified equipment sprites.`);
