import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { prepareSkillCatalog } from "~/features/game/catalog";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import SkillTemplateEditor from "./SkillTemplateEditor";

function Demo() {
  const [catalog, setCatalog] = useState(() =>
    prepareSkillCatalog(sampleCatalog),
  );
  return (
    <div className="p-4">
      <SkillTemplateEditor catalog={catalog} onChange={setCatalog} />
    </div>
  );
}
export default {
  title: "Admin/SkillTemplateEditor",
  component: Demo,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Demo>;
export const Compact: StoryObj<typeof Demo> = {};
