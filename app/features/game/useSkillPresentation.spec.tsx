import { act, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import {
  type SoundSkill,
  battleSoundFiles,
  stopBattleSounds,
} from "./battleSound";
import useSkillPresentation from "./useSkillPresentation";

class AudioStub {
  static instances: AudioStub[] = [];
  volume = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(async () => undefined);
  pause = vi.fn();
  constructor(public src: string) {
    AudioStub.instances.push(this);
  }
}
function Preview({
  skill,
  enabled = true,
  revision = 1,
  settings,
}: {
  skill: SoundSkill;
  enabled?: boolean;
  revision?: number;
  settings?: Parameters<typeof useSkillPresentation>[4];
}) {
  const ready = useSkillPresentation(revision, skill, enabled, false, settings);
  return <output>{ready ? "effect" : "activation"}</output>;
}
beforeEach(() => {
  vi.useFakeTimers();
  AudioStub.instances = [];
  vi.stubGlobal("Audio", AudioStub);
});
it("uses the configured startup sound and skips startup when set to none", () => {
  const view = render(
    <Preview
      skill={{
        effect: "attack",
        damage_type: "physical",
        animation: "impact",
        sound: "auto",
      }}
      settings={{ physical_activation_sound: "willo_zap" }}
    />,
  );
  expect(AudioStub.instances[0].src).toBe(battleSoundFiles.willo_zap);
  view.rerender(
    <Preview
      revision={2}
      skill={{
        effect: "attack",
        damage_type: "special",
        animation: "fire",
        sound: "auto",
      }}
      settings={{ magical_activation_sound: "none" }}
    />,
  );
  expect(screen.getByText("effect")).toBeVisible();
  expect(AudioStub.instances.at(-1)?.src).toBe(battleSoundFiles.fire_burst);
});
afterEach(() => {
  stopBattleSounds();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each([
  ["physical", "slash", 260],
  ["special", "magic", 600],
] as const)(
  "plays %s activation before the skill effect",
  (damage_type, sound, delay) => {
    render(
      <Preview
        skill={{
          effect: "attack",
          damage_type,
          animation: "fire",
          sound: "auto",
        }}
      />,
    );
    expect(screen.getByText("activation")).toBeInTheDocument();
    expect(AudioStub.instances.map((a) => a.src)).toEqual([
      battleSoundFiles[sound],
    ]);
    act(() => vi.advanceTimersByTime(delay - 1));
    expect(screen.queryByText("effect")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    act(() => AudioStub.instances[0].onended?.());
    expect(screen.getByText("effect")).toBeInTheDocument();
    expect(AudioStub.instances.map((a) => a.src)).toEqual([
      battleSoundFiles[sound],
      battleSoundFiles.fire_burst,
    ]);
  },
);

it("uses magic startup for recovery and reads the primary effect's calculation type", () => {
  const skill: SoundSkill = {
    effect: "attack",
    damage_type: "physical",
    effects: [{ effect: "attack", damage_type: "special" }],
  };
  const { rerender } = render(<Preview skill={skill} />);
  expect(AudioStub.instances[0].src).toBe(battleSoundFiles.magic);
  rerender(
    <Preview revision={2} skill={{ effect: "heal_hp", animation: "heal" }} />,
  );
  expect(AudioStub.instances[1].src).toBe(battleSoundFiles.magic);
});

it.each([true, false])(
  "silence never holds back the effect (%s)",
  (enabled) => {
    render(
      <Preview enabled={enabled} skill={{ effect: "attack", sound: "none" }} />,
    );
    expect(screen.getByText("effect")).toBeInTheDocument();
    expect(AudioStub.instances).toHaveLength(0);
  },
);

it("cancels delayed playback when the preview closes", () => {
  const { unmount } = render(
    <Preview skill={{ effect: "attack", animation: "fire" }} />,
  );
  unmount();
  act(() => vi.advanceTimersByTime(1000));
  expect(AudioStub.instances).toHaveLength(1);
  expect(AudioStub.instances[0].pause).toHaveBeenCalled();
});

it("continues if the browser rejects audio playback", async () => {
  vi.stubGlobal(
    "Audio",
    class extends AudioStub {
      play = vi.fn().mockRejectedValue(new Error("blocked"));
    },
  );
  render(<Preview skill={{ effect: "attack", animation: "impact" }} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1260);
  });
  expect(screen.getByText("effect")).toBeInTheDocument();
});
