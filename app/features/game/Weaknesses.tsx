import GameIcon from "./GameIcon";
import { type ElementDefinition, defaultElements } from "./catalog";

export default function Weaknesses({
  ids = [],
  elements = defaultElements,
}: { ids?: string[]; elements?: ElementDefinition[] }) {
  const values = elements.filter(
    (element) => element.enabled && ids.includes(element.id),
  );
  if (!values.length) return null;
  return (
    <span
      aria-label="弱点属性"
      className="flex flex-wrap justify-center gap-1 text-xs"
    >
      <span>弱点</span>
      {values.map((element) => (
        <span
          key={element.id}
          className="inline-flex items-center gap-0.5"
          style={{ color: element.color }}
        >
          <GameIcon icon={element.icon} className="size-3" />
          {element.name}
        </span>
      ))}
    </span>
  );
}
