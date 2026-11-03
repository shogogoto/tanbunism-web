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
  return (
    <div className="flex w-36 flex-wrap items-center gap-1">
      {elements
        .filter(
          (element) =>
            enemy.weaknesses?.includes(element.id) ||
            enemy.resistances?.includes(element.id),
        )
        .map((element) => {
          const weak = enemy.weaknesses?.includes(element.id);
          return (
            <button
              type="button"
              key={element.id}
              aria-label={`${enemy.name}の${element.name}：${weak ? "弱点" : "耐性"}`}
              title="クリックで削除"
              onClick={() => change(element.id)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${weak ? "border-rose-500/40 text-rose-500" : "border-sky-500/40 text-sky-500"}`}
            >
              <GameIcon icon={element.icon} className="size-3" />
              {element.name} {weak ? "弱点" : "耐性"} ×
            </button>
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
          <div className="space-y-2">
            {elements.map((element) => (
              <div key={element.id} className="flex items-center gap-2 text-sm">
                <GameIcon icon={element.icon} className="size-4" />
                <span className="mr-auto">{element.name}</span>
                {(["weak", "resistant"] as const).map((state) => {
                  const selected =
                    (state === "weak"
                      ? enemy.weaknesses
                      : enemy.resistances
                    )?.includes(element.id) ?? false;
                  return (
                    <Button
                      type="button"
                      key={state}
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      disabled={!element.enabled}
                      aria-pressed={selected}
                      aria-label={`${element.name}を${state === "weak" ? "弱点" : "耐性"}にする`}
                      onClick={() =>
                        change(element.id, selected ? undefined : state)
                      }
                    >
                      {state === "weak" ? "弱点" : "耐性"}
                    </Button>
                  );
                })}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
