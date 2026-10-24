import GameIcon from "./GameIcon";
import { type ElementDefinition, defaultElements } from "./catalog";

export default function Weaknesses({
  ids = [],
  resistances = [],
  elements = defaultElements,
}: { ids?: string[]; resistances?: string[]; elements?: ElementDefinition[] }) {
  return (
    <>
      {[
        { label: "弱点", ids },
        { label: "耐性", ids: resistances },
      ].map((group) => {
        const values = elements.filter(
          (element) => element.enabled && group.ids.includes(element.id),
        );
        return values.length ? (
          <span
            key={group.label}
            aria-label={`${group.label}属性`}
            className="flex flex-wrap justify-center gap-1 text-xs"
          >
            <span>{group.label}</span>
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
        ) : null;
      })}
    </>
  );
}
