import {
  type EnemyDefinition,
  type EnemyStat,
  enemyStatLabels,
} from "~/features/game/catalog";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";

export default function EnemyMultipliersEditor({
  enemy,
  onChange,
}: {
  enemy: EnemyDefinition;
  onChange: (patch: Partial<EnemyDefinition>) => void;
}) {
  const changed = Object.values(enemy.multipliers ?? {}).filter(
    (value) => value !== 1,
  ).length;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${enemy.name}の能力倍率`}
        >
          {changed ? `${changed}能力を補正` : "すべて等倍"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{enemy.name}の能力倍率</DialogTitle>
          <DialogDescription>
            基礎能力に掛ける、この敵だけの倍率です。ボスもここだけで設定します。保存で確定します。
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {(Object.entries(enemyStatLabels) as [EnemyStat, string][]).map(
            ([stat, label]) => (
              <div key={stat} className="space-y-2">
                <Label htmlFor={`enemy-${enemy.id}-${stat}`}>{label}</Label>
                <Input
                  id={`enemy-${enemy.id}-${stat}`}
                  type="number"
                  min={0.01}
                  max={400}
                  step="any"
                  value={enemy.multipliers?.[stat] ?? 1}
                  onChange={(event) =>
                    onChange({
                      multipliers: {
                        ...enemy.multipliers,
                        [stat]: Number(event.target.value),
                      },
                    })
                  }
                />
              </div>
            ),
          )}
        </div>
        {enemy.speed != null && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span>旧設定の固定速さ: {enemy.speed}（倍率適用前）</span>
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange({ speed: null })}
            >
              共通値に戻す
            </Button>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange({ multipliers: {} })}
        >
          倍率を等倍に戻す
        </Button>
      </DialogContent>
    </Dialog>
  );
}
