import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { SkillSound } from "~/features/game/catalog";
import ActivationSoundSettings from "./ActivationSoundSettings";

function Demo() {
  const [sounds, setSounds] = useState({
    physical_activation_sound: "slash" as SkillSound,
    magical_activation_sound: "magic" as SkillSound,
  });
  return (
    <ActivationSoundSettings
      physical={sounds.physical_activation_sound}
      magical={sounds.magical_activation_sound}
      onChange={(key, value) => setSounds({ ...sounds, [key]: value })}
    />
  );
}
export default {
  title: "Admin/ActivationSounds",
  component: Demo,
} satisfies Meta<typeof Demo>;
export const Default: StoryObj<typeof Demo> = {};
