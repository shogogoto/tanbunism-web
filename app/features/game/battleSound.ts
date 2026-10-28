import type { SkillAnimation, SkillDefinition, SkillSound } from "./catalog";
import { soundAssets } from "./soundAssets";

type Preset = Exclude<SkillSound, "auto" | "none">;
/** Locally hosted licensed sounds; provenance: public/game-assets/sounds/SOURCES.md. */
export const battleSoundFiles = Object.fromEntries(
  Object.keys(soundAssets).map((id) => [id, `/game-assets/sounds/${id}.wav`]),
) as Record<Preset, string>;
/** Exhaustive: adding an animation requires choosing its default sound. */
export const animationSounds: Record<SkillAnimation, Preset | null> = {
  willo_ice_shatter: "willo_ice_shatter",
  willo_zap: "willo_zap",
  oga_star_ice: "willo_ice_cast",
  oga_star_thunder: "willo_zap",
  willo_fire_impact: "willo_fire_impact",
  oga_star_fire: "willo_fire_cast",
  willo_cast: "willo_cast",
  willo_heal: "willo_heal",
  willo_impact: "willo_impact",
  none: null,
  slash: "slash",
  impact: "impact",
  fire: "fire_burst",
  lightning: "lightning",
  heal: "heal",
  ripple: "heal_2",
  buff: "magic_rise",
  debuff: "drain",
  poison: "poison",
  oga_slash_1: "slash",
  oga_slash_2: "slash_2",
  oga_slash_3: "slash_3",
  oga_slash_4: "slash_3",
  oga_slash_5: "slash_2",
  oga_spell_1: "chime",
  oga_spell_2: "fire",
  oga_spell_3: "fire_burst",
  oga_spell_4: "fire_2",
  oga_spell_5: "fire_burst_2",
  oga_spell_6: "fire_burst_3",
  oga_spell_7: "zap_2",
  oga_spell_8: "lightning",
  oga_spell_9: "water",
  oga_spell_10: "dark_3",
  oga_effect_1: "explosion",
  oga_effect_2: "explosion_2",
  oga_effect_3: "wind",
  oga_effect_4: "ice",
  oga_effect_5: "fire",
  oga_nature_1: "earth",
  oga_nature_2: "heal_3",
  oga_nature_3: "magic_rise",
  oga_nature_4: "water_2",
  oga_arcane_1: "zap",
  oga_arcane_2: "chime_2",
  oga_arcane_3: "zap_2",
  oga_arcane_4: "chime_3",
  oga_arcane_5: "lightning_2",
  oga_arcane_6: "lightning_storm",
  oga_earth_1: "earth",
  oga_earth_2: "chime_4",
  oga_earth_3: "stones",
  oga_earth_4: "earth",
  oga_earth_5: "wind",
  oga_cosmic_1: "chime_2",
  oga_cosmic_2: "chime_4",
  oga_cosmic_3: "teleport",
  oga_cosmic_4: "teleport",
  oga_cosmic_5: "dark_2",
  mochi_status_curse: "curse",
  mochi_status_buff: "magic_rise",
  mochi_status_shield: "chime_3",
  mochi_status_heal: "heal_4",
  mochi_status_speed: "wind",
};
const voices = new Set<HTMLAudioElement>();
const maxVoices = 8;

export function stopBattleSounds(): void {
  for (const audio of voices) {
    audio.pause();
    audio.onended = null;
    audio.onerror = null;
  }
  voices.clear();
}

export type SoundSkill = Pick<
  SkillDefinition,
  "sound" | "effect" | "animation"
> & {
  ailment?: "poison" | "curse" | "regen" | "refresh";
  damage_type?: "physical" | "special";
  effects?: Record<string, unknown>[];
};

/** Short licensed one-shots, followed by the skill's own impact sound/visual. */
export function skillActivation(skill: SoundSkill) {
  const primary =
    skill.effects?.find((effect) => effect.effect === "attack") ?? skill;
  return primary.effect === "attack" && primary.damage_type !== "special"
    ? { sound: "slash" as const, durationMs: 260 }
    : { sound: "magic" as const, durationMs: 600 };
}

export function resolveSkillSound(skill: SoundSkill): Preset | null {
  const sound = skill.sound ?? "auto";
  if (sound === "none") return null;
  if (sound !== "auto") return sound;
  if (skill.animation && skill.animation !== "none")
    return animationSounds[skill.animation];
  const automatic: Partial<Record<SkillDefinition["effect"], Preset>> = {
    heal_hp: "heal",
    heal_mp: "heal",
    buff: "magic_rise",
    debuff: "drain",
    ailment:
      skill.ailment === "regen" || skill.ailment === "refresh"
        ? "heal"
        : (skill.ailment ?? "poison"),
  };
  return automatic[skill.effect] ?? "impact";
}

export function playSkillSound(
  skill: SoundSkill,
  correct = true,
  impactLevel = 0,
): void {
  const sound = resolveSkillSound(skill);
  if (sound) playBattleSound(correct, impactLevel, sound);
}

export function playBattleSound(
  correct: boolean,
  impactLevel = 0,
  sound: Preset = "impact",
  onFinished?: () => void,
): (() => void) | undefined {
  if (typeof window === "undefined" || !window.Audio) return;
  try {
    if (voices.size >= maxVoices) {
      const oldest = voices.values().next().value;
      oldest?.pause();
      if (oldest) voices.delete(oldest);
    }
    const audio = new window.Audio(battleSoundFiles[sound]);
    audio.volume = correct
      ? 0.55 + Math.max(0, Math.min(3, impactLevel)) * 0.1
      : 0.7;
    const release = () => {
      voices.delete(audio);
      audio.onended = null;
      audio.onerror = null;
    };
    const finish = () => {
      release();
      onFinished?.();
    };
    audio.onended = finish;
    audio.onerror = finish;
    voices.add(audio);
    // Autoplay denial or a missing asset must never interrupt a quiz.
    void audio.play().catch(finish);
    return () => {
      audio.pause();
      release();
    };
  } catch {
    onFinished?.();
    // Audio is optional, including on browsers without media playback.
  }
}
