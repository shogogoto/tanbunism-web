import { useEffect, useState } from "react";
import {
  type SoundSkill,
  playBattleSound,
  playSkillSound,
  skillActivation,
} from "./battleSound";
import { musicPreferences } from "./music";

/** Presentation only: resolving a quiz and advancing turns never await audio. */
export default function useSkillPresentation(
  key: string | number | undefined,
  skill: SoundSkill | undefined,
  enabled: boolean,
  respectMusicPreference = false,
) {
  const [readyKey, setReadyKey] = useState<string | number>();
  const animation = skill?.animation;
  const sound = skill?.sound;
  const effect = skill?.effect;
  const ailment = skill?.ailment;
  const activation = skill && skillActivation(skill);
  const activationSound = activation?.sound;
  const delay = enabled && sound !== "none" ? (activation?.durationMs ?? 0) : 0;
  useEffect(() => {
    if (key === undefined || !effect || !activationSound) {
      setReadyKey(undefined);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      setReadyKey(key);
      if (enabled && (!respectMusicPreference || musicPreferences().enabled))
        playSkillSound({ effect, animation, sound, ailment });
    };
    const stop = delay
      ? playBattleSound(true, 0, activationSound, finish)
      : undefined;
    // Prefer the clip's real end; a broken media element must not hide effects forever.
    if (delay && stop && !finished) timer = setTimeout(finish, delay + 1000);
    else finish();
    return () => {
      clearTimeout(timer);
      stop?.();
    };
  }, [
    key,
    effect,
    animation,
    sound,
    ailment,
    activationSound,
    delay,
    enabled,
    respectMusicPreference,
  ]);
  return key !== undefined && readyKey === key;
}
