import type { GameCatalog, SkillTemplate } from "~/features/game/catalog";
import TemplateVariantPanel from "./TemplateVariantPanel";

export default function TemplateVariantControls({
  template,
  catalog,
  onChange,
}: {
  template: SkillTemplate;
  catalog: GameCatalog;
  onChange: (catalog: GameCatalog) => void;
}) {
  return (
    <TemplateVariantPanel
      template={template}
      catalog={catalog}
      onChange={onChange}
    />
  );
}
