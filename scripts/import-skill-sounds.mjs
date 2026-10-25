// Convert the licensed third-party sources in sounds/SOURCES.md into short PCM WAVs.
// Usage: PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome node scripts/import-skill-sounds.mjs /tmp/source-dir
// Requires the existing Playwright installation. No network access or synthesis.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const input = process.argv[2];
if (!input) throw new Error("Provide the extracted source directory.");
const output = resolve("public/game-assets/sounds");
const sources = {
  impact: ["punch.ogg"],
  slash: ["rpg/blade_01.ogg"],
  fire: ["rpg/spell_fire_01.ogg"],
  // Crackling discharge loops, shaped into short bursts (no pitched Zap tones).
  lightning: ["crackleelectricityloop.wav", 0, 0.7, 0.025],
  lightning_2: ["snaploop.wav", 0, 0.55, 0.03],
  lightning_storm: ["snaploop.wav", 0.55, 1.5, 0.04],
  heal: ["cure/Cure1.wav"],
  buff: ["cure/Cure2.wav"],
  debuff: ["rpg/spell_02.ogg"],
  poison: ["rpg/creature_slime_01.ogg"],
  curse: ["dark_magic/fout-02.flac"],
  ...Object.fromEntries(
    [2, 3].map((n) => [`slash_${n}`, [`rpg/blade_0${n}.ogg`]]),
  ),
  ...Object.fromEntries(
    [2, 3, 4, 5, 6, 7].map((n) => [`fire_${n}`, [`rpg/spell_fire_0${n}.ogg`]]),
  ),
  ...Object.fromEntries(
    [2, 3, 4, 5, 6, 7].map((n) => [`heal_${n}`, [`cure/Cure${n + 1}.wav`]]),
  ),
  ...Object.fromEntries(
    [2, 3, 4].map((n) => [`poison_${n}`, [`rpg/creature_slime_0${n}.ogg`]]),
  ),
  magic: ["rpg/spell_01.ogg"],
  metal: ["rpg/metal_01.ogg"],
  metal_2: ["rpg/metal_02.ogg"],
  coins: ["rpg/item_coins_01.ogg"],
  stones: ["rpg/stones_01.ogg"],
  fire_burst: ["impacts/Fire Spell Impacts/Fire Spell Impact 4.wav"],
  fire_burst_2: ["impacts/Fire Spell Impacts/Fire Spell Impact 5.wav"],
  fire_burst_3: ["impacts/Fire Spell Impacts/Fire Spell Impact 1.wav"],
  ...Object.fromEntries(
    [5, 4, 3, 1, 2].map((n, i) => [
      i ? `ice_${i + 1}` : "ice",
      [`impacts/Ice Spell Impacts/Ice Spell Impact ${n}.wav`],
    ]),
  ),
  ...Object.fromEntries(
    [4, 1, 2, 3, 5].map((n, i) => [
      i ? `water_${i + 1}` : "water",
      [`impacts/Water Spell Impacts/Water Spell Impact ${n}.wav`],
    ]),
  ),
  earth: ["earth.ogg"],
  dark_2: ["dark_magic/fout-01.flac"],
  dark_3: ["dark_magic/fout-03.flac"],
  drain: ["qubodup-PowerDrain/ogg/qubodup-PowerDrain.ogg"],
  teleport: ["teleport.wav"],
  chime: ["chime.ogg"],
  chime_2: ["chime2.ogg"],
  chime_3: ["chime3.ogg"],
  chime_4: ["chime4.ogg"],
  wind: ["sand.flac"],
  explosion: ["explosion.ogg"],
  explosion_2: ["explosion2.ogg"],
  zap: ["digital/zap1.mp3"],
  zap_2: ["digital/zap2.mp3"],
  magic_rise: ["digital/powerUp2.mp3"],
  ...Object.fromEntries(
    [
      "cast",
      "impact",
      "fire_cast",
      "fire_impact",
      "ice_cast",
      "ice_shatter",
      "zap",
      "thunder",
      "water_cast",
      "water_impact",
      "wind",
      "poison",
      "shadow",
      "heal",
      "buff",
      "debuff",
      "mana",
      "dispel",
      "arcane_blast",
      "rune",
    ].map((name) => [`willo_${name}`, [`sfx/wav/${name}_01.wav`]]),
  ),
};
const only = process.argv[3]?.split(",");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
try {
  const page = await browser.newPage();
  await mkdir(output, { recursive: true });
  for (const [
    id,
    [file, start = 0, end = null, fade = 0.005],
  ] of Object.entries(sources)) {
    if (only && !only.includes(id)) continue;
    const base64 = (await readFile(resolve(input, file))).toString("base64");
    const samples = await page.evaluate(
      async ({ base64, start, end, fade }) => {
        const context = new OfflineAudioContext(1, 1, 32000);
        const decoded = await context.decodeAudioData(
          Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer,
        );
        const mono = new Float32Array(decoded.length);
        for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
          const data = decoded.getChannelData(channel);
          for (let i = 0; i < data.length; i++)
            mono[i] += data[i] / decoded.numberOfChannels;
        }
        let first = Math.floor(start * decoded.sampleRate);
        const boundary =
          end === null
            ? mono.length
            : Math.min(mono.length, Math.floor(end * decoded.sampleRate));
        let last = boundary;
        let peak = 0;
        for (let i = first; i < last; i++)
          peak = Math.max(peak, Math.abs(mono[i]));
        if (peak === 0) throw new Error("Silent source");
        while (Math.abs(mono[first]) < peak * 0.002) first++;
        while (Math.abs(mono[last - 1]) < peak * 0.002) last--;
        // Leave 20 ms of tail, normalize peaks, and fade boundaries.
        last = Math.min(boundary, last + 640);
        const length = last - first;
        const fadeSamples = Math.round(fade * decoded.sampleRate);
        return Array.from(mono.subarray(first, last), (sample, i) =>
          Math.round(
            (sample / peak) *
              0.85 *
              Math.min(1, i / fadeSamples, (length - 1 - i) / fadeSamples) *
              32767,
          ),
        );
      },
      { base64, start, end, fade },
    );
    const wav = Buffer.alloc(44 + samples.length * 2);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(32000, 24);
    wav.writeUInt32LE(64000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(samples.length * 2, 40);
    samples.forEach((sample, i) => wav.writeInt16LE(sample, 44 + i * 2));
    await writeFile(resolve(output, `${id}.wav`), wav);
    console.log(`${id}: ${(samples.length / 32000).toFixed(2)}s`);
  }
} finally {
  await browser.close();
}
