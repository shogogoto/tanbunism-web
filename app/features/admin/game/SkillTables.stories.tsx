import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { type SkillDefinition, normalizeSkill } from "~/features/game/catalog";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import SkillTables from "./SkillTables";

function Demo() {
  const [deletions, setDeletions] = useState(new Set<string>());
  const [skills, setSkills] = useState<SkillDefinition[]>([
    ...sampleCatalog.skills,
    {
      id: "bubble",
      name: "バブル",
      icon: "heart",
      enabled: true,
      effect: "buff",
      target: "self",
      amount: 100,
      amount_mode: "percent",
      stat: "maxHp",
      duration_turns: 3,
      stack_limit: 1,
      mp_cost: 3,
    },
    {
      id: "poison",
      name: "毒",
      icon: "droplet",
      enabled: true,
      effect: "ailment",
      target: "enemy",
      amount: 5,
      mp_cost: 2,
    },
  ]);
  return (
    <div className="p-4">
      <SkillTables
        deletions={deletions}
        toggleDelete={(id) =>
          setDeletions((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        skills={skills}
        add={(effect, damageType) =>
          setSkills((current) => [
            ...current,
            normalizeSkill({
              id: `skill_${current.length}`,
              name: "新しいスキル",
              icon: "sparkles",
              enabled: true,
              effect,
              damage_type: damageType,
              target: ["attack", "debuff", "ailment"].includes(effect)
                ? "enemy"
                : "self",
              amount: effect === "ailment" ? 5 : 0,
              multiplier: 1,
              mp_cost: 0,
            }),
          ])
        }
        update={(id, patch) =>
          setSkills((current) =>
            current.map((s) =>
              s.id === id ? normalizeSkill({ ...s, ...patch }) : s,
            ),
          )
        }
      />
    </div>
  );
}
export default {
  title: "Admin/SkillTables",
  component: Demo,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Demo>;
export const Types: StoryObj<typeof Demo> = {};
