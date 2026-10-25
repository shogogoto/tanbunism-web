import { readFileSync } from "node:fs";
import { vi } from "vitest";
import {
  animationSounds,
  battleSoundFiles,
  playBattleSound,
  playSkillSound,
  stopBattleSounds,
} from "./battleSound";
import { animationLabels } from "./catalog";
import { soundAssets } from "./soundAssets";

class TestAudio {
  static instances: TestAudio[] = [];
  volume = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(async () => undefined);
  pause = vi.fn();
  constructor(public src: string) {
    TestAudio.instances.push(this);
  }
}
beforeEach(() => {
  TestAudio.instances = [];
  vi.stubGlobal("Audio", TestAudio);
});
afterEach(() => {
  stopBattleSounds();
  vi.unstubAllGlobals();
});

it.each(Object.keys(battleSoundFiles) as (keyof typeof battleSoundFiles)[])(
  "plays a real, locally bundled WAV for %s",
  (sound) => {
    playSkillSound({ effect: "attack", sound });
    const audio = TestAudio.instances[0];
    expect(audio.src).toBe(battleSoundFiles[sound]);
    expect(audio.play).toHaveBeenCalledOnce();
    const wav = readFileSync(`public${audio.src}`);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.length).toBeGreaterThan(5000);
    expect(wav.length).toBeLessThan(2000000);
    expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
    audio.onended?.();
    stopBattleSounds();
    expect(audio.pause).not.toHaveBeenCalled();
  },
);

it.each(["lightning", "lightning_2", "lightning_storm"] as const)(
  "uses a short complete %s one-shot rather than a long discharge",
  (sound) => {
    const wav = readFileSync(`public${battleSoundFiles[sound]}`);
    const seconds = wav.readUInt32LE(40) / wav.readUInt32LE(28);
    expect(seconds).toBeGreaterThan(0.08);
    expect(seconds).toBeLessThan(1.2);
    expect(wav.readInt16LE(wav.length - 2)).toBe(0);
  },
);

it("assigns an intentional sound to every visual effect", () => {
  expect(Object.keys(animationSounds).sort()).toEqual(
    Object.keys(animationLabels).sort(),
  );
  for (const [animation, sound] of Object.entries(animationSounds)) {
    if (animation === "none") continue;
    expect(sound).not.toBeNull();
    expect(sound && battleSoundFiles[sound]).toBeTruthy();
  }
});

it("pairs the new ice and lightning visuals with short, complete locally hosted sounds", () => {
  expect(animationSounds.willo_ice_shatter).toBe("willo_ice_shatter");
  expect(animationSounds.willo_zap).toBe("willo_zap");
  expect(animationSounds.oga_star_ice).toBe("willo_ice_cast");
  expect(animationSounds.oga_star_thunder).toBe("willo_zap");
  for (const id of ["willo_zap", "willo_thunder"] as const) {
    const wav = readFileSync(`public${battleSoundFiles[id]}`);
    expect(wav.readUInt32LE(40) / wav.readUInt32LE(28)).toBeLessThan(1.2);
    expect(wav.readInt16LE(wav.length - 2)).toBe(0);
  }
});

it("keeps pitched magic-bolt sounds out of lightning choices and defaults", () => {
  expect(
    Object.entries(soundAssets)
      .filter(([, sound]) => sound.group === "雷")
      .map(([id]) => id),
  ).toEqual(["lightning", "lightning_2", "lightning_storm"]);
  for (const animation of [
    "lightning",
    "oga_spell_8",
    "oga_arcane_5",
    "oga_arcane_6",
  ] as const) {
    expect(animationSounds[animation]).toMatch(/^lightning/);
  }
});

it("keeps explicitly silent skills silent", () => {
  playSkillSound({ effect: "attack", animation: "fire", sound: "none" });
  expect(TestAudio.instances).toHaveLength(0);
});

it.each([
  ["fire", "fire_burst"],
  ["oga_spell_3", "fire_burst"],
  ["lightning", "lightning"],
  ["oga_spell_8", "lightning"],
  ["slash", "slash"],
  ["oga_spell_9", "water"],
  ["oga_effect_4", "ice"],
  ["oga_effect_1", "explosion"],
  ["oga_effect_2", "explosion_2"],
  ["oga_cosmic_4", "teleport"],
  ["oga_nature_1", "earth"],
  ["mochi_status_curse", "curse"],
  ["mochi_status_shield", "chime_3"],
] as const)(
  "matches automatic %s animation to %s audio",
  (animation, sound) => {
    playSkillSound({ effect: "attack", animation });
    expect(TestAudio.instances[0].src).toBe(battleSoundFiles[sound]);
  },
);

it("preserves overrides and uses the visual preset before the skill category", () => {
  playSkillSound({ effect: "attack", animation: "fire", sound: "slash" });
  playSkillSound({ effect: "heal_mp", animation: "fire" });
  playSkillSound({ effect: "ailment", ailment: "curse" });
  expect(TestAudio.instances.map((audio) => audio.src)).toEqual([
    battleSoundFiles.slash,
    battleSoundFiles.fire_burst,
    battleSoundFiles.curse,
  ]);
});

it("preserves legacy auto behavior when no visual effect is selected", () => {
  playSkillSound({ effect: "heal_mp" });
  playSkillSound({ effect: "heal_hp", animation: "none" });
  expect(TestAudio.instances.map((audio) => audio.src)).toEqual([
    battleSoundFiles.heal,
    battleSoundFiles.heal,
  ]);
});

it("uses the same impact sample for both sides without pitch shifting", () => {
  playBattleSound(true, 3);
  playBattleSound(false);
  expect(TestAudio.instances.map((audio) => audio.src)).toEqual([
    battleSoundFiles.impact,
    battleSoundFiles.impact,
  ]);
  expect(TestAudio.instances[0].volume).toBeCloseTo(0.85);
});

it("stops playing effects when music is disabled", async () => {
  const { setMusicPreferences } = await import("./music");
  playBattleSound(true);
  setMusicPreferences({ enabled: false });
  expect(TestAudio.instances[0].pause).toHaveBeenCalledOnce();
});

it("limits overlapping voices", () => {
  for (let i = 0; i < 9; i++) playBattleSound(true);
  expect(TestAudio.instances[0].pause).toHaveBeenCalledOnce();
  expect(TestAudio.instances[1].pause).not.toHaveBeenCalled();
});

it("releases rejected or failed playback without interrupting gameplay", async () => {
  playBattleSound(true);
  TestAudio.instances[0].onerror?.();
  const rejected = vi.fn().mockRejectedValue(new Error("autoplay blocked"));
  vi.stubGlobal(
    "Audio",
    class extends TestAudio {
      play = rejected;
    },
  );
  expect(() => playBattleSound(false)).not.toThrow();
  await Promise.resolve();
  await Promise.resolve();
  stopBattleSounds();
  expect(
    TestAudio.instances.every((audio) => !audio.pause.mock.calls.length),
  ).toBe(true);
  vi.stubGlobal("Audio", undefined);
  expect(() => playBattleSound(false)).not.toThrow();
});
