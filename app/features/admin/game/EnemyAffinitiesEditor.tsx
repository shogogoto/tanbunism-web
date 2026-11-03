import { X } from "lucide-react";
import GameIcon from "~/features/game/GameIcon";
import type {
  ElementDefinition,
  EnemyDefinition,
} from "~/features/game/catalog";
import { Button } from "~/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/shared/components/ui/popover";

export default function EnemyAffinitiesEditor({
  enemy,
  elements,
  onChange,
}: {
  enemy: EnemyDefinition;
  elements: ElementDefinition[];
  onChange: (patch: Partial<EnemyDefinition>) => void;
}) {
  function change(id: string, state?: "weak" | "resistant") {
    onChange({
      weaknesses: [
        ...(enemy.weaknesses ?? []).filter((value) => value !== id),
        ...(state === "weak" ? [id] : []),
      ],
      resistances: [
        ...(enemy.resistances ?? []).filter((value) => value !== id),
        ...(state === "resistant" ? [id] : []),
      ],
    });
  }
  function choices(element: ElementDefinition) {
    return (
      <div className="flex items-center gap-2 text-sm" key={element.id}>
        <span style={{ color: element.color }}>
          <GameIcon icon={element.icon} className="size-4" />
        </span>
        <span className="mr-auto">{element.name}</span>
        {(["weak", "resistant"] as const).map((state) => {
          const selected =
            (state === "weak" ? enemy.weaknesses : enemy.resistances)?.includes(
              element.id,
            ) ?? false;
          return (
            <Button
              type="button"
              key={state}
              size="sm"
              variant={selected ? "default" : "outline"}
              disabled={!element.enabled}
              aria-pressed={selected}
              aria-label={`${element.name}を${state === "weak" ? "弱点" : "耐性"}にする`}
              onClick={() => change(element.id, state)}
            >
              {state === "weak" ? "弱点" : "耐性"}
            </Button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex w-max items-center gap-1">
      {elements
        .filter(
          (element) =>
            enemy.weaknesses?.includes(element.id) ||
            enemy.resistances?.includes(element.id),
        )
        .map((element) => {
          const weak = enemy.weaknesses?.includes(element.id);
          return (
            <span
              key={element.id}
              className="inline-flex shrink-0 items-center rounded-full border text-xs"
              style={{
                color: element.color,
                borderColor: `color-mix(in srgb, ${element.color} 40%, transparent)`,
              }}
            >
              <button
                type="button"
                aria-label={`${enemy.name}の${element.name}：${weak ? "弱点" : "耐性"}`}
                title={`クリックで${weak ? "耐性" : "弱点"}に切り替え`}
                disabled={!element.enabled}
                onClick={() => change(element.id, weak ? "resistant" : "weak")}
                className="inline-flex items-center gap-1 rounded-l-full px-2 py-1 hover:bg-current/10 focus-visible:outline-2 disabled:opacity-50"
              >
                <GameIcon icon={element.icon} className="size-3" />
                {element.name} {weak ? "弱点" : "耐性"}
              </button>
              <button
                type="button"
                aria-label={`${enemy.name}の${element.name}の相性を削除`}
                className="rounded-r-full p-1 hover:bg-current/10 focus-visible:outline-2"
                onClick={() => change(element.id)}
              >
                <X className="size-3" />
              </button>
            </span>
          );
        })}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`${enemy.name}の属性相性を編集`}
          >
            ＋
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 max-h-80 overflow-y-auto"
          aria-label={`${enemy.name}の属性相性`}
        >
          <div className="space-y-2">{elements.map(choices)}</div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
