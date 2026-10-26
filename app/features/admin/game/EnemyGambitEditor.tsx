import { useState } from "react";
import { AdminNativeTable, AdminTableFrame } from "~/features/admin/AdminTable";
import type {
  EnemyDefinition,
  EnemyGambitRule,
  GameCatalog,
} from "~/features/game/catalog";
import {
  triggerTargets,
  triggerVariant,
} from "~/features/game/triggerVariants";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";

export default function EnemyGambitEditor({
  enemy,
  catalog,
  onChange,
}: {
  enemy: EnemyDefinition;
  catalog: GameCatalog;
  onChange: (rules: EnemyGambitRule[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rules = enemy.gambits ?? [];
  const triggers = catalog.triggers ?? [];
  const skills = catalog.skills.filter(
    (s) =>
      s.enabled &&
      !(s.effects?.length ? s.effects : [s]).some((e) =>
        ["recover_moves", "equip_attack"].includes(String(e.effect)),
      ),
  );
  const patch = (index: number, value: Partial<EnemyGambitRule>) =>
    onChange(rules.map((r, i) => (i === index ? { ...r, ...value } : r)));
  const move = (index: number, step: number) => {
    const next = [...rules];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    onChange(next);
  };
  const select = "h-9 min-w-0 rounded-md border bg-background px-2 text-sm";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          ガンビット {rules.length}
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[85dvh] overflow-y-auto sm:max-w-4xl"
      >
        <DialogTitle>{enemy.name}のガンビット</DialogTitle>
        <AdminTableFrame layout="content">
          <AdminNativeTable
            layout="content"
            aria-label="敵のガンビット"
            className="whitespace-nowrap text-sm"
          >
            <thead>
              <tr>
                {[
                  "優先",
                  "トリガー",
                  "変型",
                  "対象",
                  "スキル",
                  "有効",
                  "削除",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, index) => {
                const root = triggers.find((t) => t.id === rule.trigger_id);
                const resolved = root
                  ? triggerVariant(root, rule.trigger_variant_id)
                  : undefined;
                return (
                  <tr
                    key={`${index}:${rule.trigger_id}`}
                    aria-label={`ガンビット ${index + 1}`}
                  >
                    <td>
                      <div className="flex items-center gap-1">
                        {index + 1}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`${index + 1}番を上へ`}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`${index + 1}番を下へ`}
                          disabled={index === rules.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          ↓
                        </Button>
                      </div>
                    </td>
                    <td>
                      <select
                        className={select}
                        aria-label="トリガー"
                        value={rule.trigger_id}
                        onChange={(e) =>
                          patch(index, {
                            trigger_id: e.target.value,
                            trigger_variant_id: null,
                          })
                        }
                      >
                        {!root && (
                          <option value={rule.trigger_id}>利用不可</option>
                        )}
                        {triggers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                            {!t.enabled && "（無効）"}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className={select}
                        aria-label="変型"
                        value={rule.trigger_variant_id ?? ""}
                        onChange={(e) =>
                          patch(index, {
                            trigger_variant_id: e.target.value || null,
                          })
                        }
                      >
                        <option value="">基本</option>
                        {rule.trigger_variant_id && !resolved && (
                          <option value={rule.trigger_variant_id}>
                            利用不可
                          </option>
                        )}
                        {root?.variants?.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {resolved
                        ? triggerTargets[resolved.target ?? "enemy"]
                        : "—"}
                    </td>
                    <td>
                      <select
                        className={select}
                        aria-label="使用スキル"
                        value={rule.skill_id}
                        onChange={(e) =>
                          patch(index, { skill_id: e.target.value })
                        }
                      >
                        {!skills.some((s) => s.id === rule.skill_id) && (
                          <option value={rule.skill_id}>利用不可</option>
                        )}
                        {skills.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} · MP {s.mp_cost}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        aria-label="有効"
                        checked={rule.enabled}
                        onChange={(e) =>
                          patch(index, { enabled: e.target.checked })
                        }
                      />
                    </td>
                    <td>
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`${index + 1}番を削除`}
                        onClick={() =>
                          onChange(rules.filter((_, i) => i !== index))
                        }
                      >
                        ×
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminNativeTable>
        </AdminTableFrame>
        <Button
          type="button"
          variant="outline"
          disabled={
            rules.length >= 20 ||
            !triggers.some((t) => t.enabled) ||
            !skills.length
          }
          onClick={() =>
            onChange([
              ...rules,
              {
                trigger_id: triggers.find((t) => t.enabled)?.id ?? "",
                skill_id: skills[0]?.id ?? "",
                enabled: true,
              },
            ])
          }
        >
          条件を追加
        </Button>
        <p className="text-xs text-muted-foreground">
          味方はこの敵自身も含みます。実行できる最初の1件を使い、未設定・条件不一致・MP不足なら攻撃スキルに戻ります。変更は表の保存で確定します。
        </p>
        <Button type="button" onClick={() => setOpen(false)}>
          閉じる
        </Button>
      </DialogContent>
    </Dialog>
  );
}
