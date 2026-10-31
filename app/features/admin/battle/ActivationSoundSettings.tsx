import { memo, useEffect, useRef } from "react";
import { playBattleSound } from "~/features/game/battleSound";
import type { SkillSound } from "~/features/game/catalog";
import { soundLabels } from "~/features/game/soundAssets";
import { Button } from "~/shared/components/ui/button";

export type ActivationSoundKey =
  | "physical_activation_sound"
  | "magical_activation_sound";
const options = Object.entries(soundLabels)
  .filter(([id]) => id !== "auto")
  .map(([id, name]) => (
    <option key={id} value={id}>
      {name}
    </option>
  ));

export default memo(function ActivationSoundSettings({
  physical,
  magical,
  onChange,
}: {
  physical?: SkillSound;
  magical?: SkillSound;
  onChange: (key: ActivationSoundKey, value: SkillSound) => void;
}) {
  const stop = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => stop.current?.(), []);
  return (
    <section aria-label="スキルの発動前SE" className="rounded-lg border p-4">
      <h3 className="mb-3 font-medium">スキルの発動前SE</h3>
      <div className="flex flex-wrap gap-6">
        {(
          [
            ["physical_activation_sound", "物理", "slash"],
            ["magical_activation_sound", "魔法", "magic"],
          ] as const
        ).map(([key, label, fallback]) => {
          const value =
            (key === "physical_activation_sound" ? physical : magical) ??
            fallback;
          return (
            <div key={key} className="space-y-2">
              <label htmlFor={key} className="block text-sm">
                {label}
              </label>
              <div className="flex gap-2">
                <select
                  form="game-settings"
                  id={key}
                  value={value}
                  className="h-9 max-w-52 rounded-md border bg-background px-2 text-sm"
                  onChange={(event) =>
                    onChange(key, event.target.value as SkillSound)
                  }
                >
                  {options}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={`${label}の発動前SEを試聴`}
                  disabled={value === "none" || value === "auto"}
                  onClick={() => {
                    stop.current?.();
                    if (value !== "none" && value !== "auto")
                      stop.current = playBattleSound(true, 0, value);
                  }}
                >
                  試聴
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});
