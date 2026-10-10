import { Swords } from "lucide-react";
import { useState } from "react";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import EnemyAvatar from "./EnemyAvatar";
import type { DungeonContent, RegionEnemy } from "./api";

const types = {
  sent2term: "単文 → 用語",
  term2sent: "用語 → 単文",
  pair2rel: "単文組 → 関係",
  rel2pair: "関係 → 単文組",
};
export default function RegionEnemies({
  enemies,
  quizzes,
  currentRegion,
}: {
  enemies: Record<string, RegionEnemy[]>;
  quizzes: DungeonContent["quizzes"];
  currentRegion?: number;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const regions = Object.keys(enemies)
    .map(Number)
    .sort((a, b) => a - b);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={!regions.length}
        onClick={() => {
          setSelected(currentRegion ?? regions[0]);
          setOpen(true);
        }}
      >
        <Swords className="size-4" />
        領域の敵
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[85dvh] overflow-y-auto"
          data-dashboard-swipe-ignore
        >
          <DialogHeader>
            <DialogTitle>領域の敵一覧</DialogTitle>
            <DialogDescription>
              開拓済みの領域で遭遇する敵です。同じ敵は同じクイズで攻撃します。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2" aria-label="領域選択">
            {regions.map((region) => (
              <Button
                key={region}
                size="sm"
                variant={selected === region ? "default" : "outline"}
                aria-pressed={selected === region}
                onClick={() => setSelected(region)}
              >
                領域 {region + 1}
                {region === currentRegion ? " · 現在地" : ""}
              </Button>
            ))}
          </div>
          <ul className="space-y-2">
            {(enemies[selected] ?? []).map((enemy) => (
              <li
                key={enemy.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <EnemyAvatar identity={enemy.id} />
                <div className="min-w-0">
                  <h3 className="text-sm font-medium">{enemy.name}</h3>
                  <p className="text-sm tabular-nums">
                    HP {enemy.hp} · 攻 {enemy.attack}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {types[
                      quizzes[enemy.quizIndex]?.quiz_type as keyof typeof types
                    ] ?? "クイズ準備中"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {!enemies[selected]?.length && (
            <p className="text-sm text-muted-foreground">
              この領域の敵は準備されていません。
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
