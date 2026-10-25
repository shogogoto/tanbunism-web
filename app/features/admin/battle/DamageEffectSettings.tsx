import { AdminTable as Table } from "~/features/admin/AdminTable";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/shared/components/ui/table";
import type { BattleSettings } from "./api";

export const effectLabelKeys = [
  "damage_effect_label_1",
  "damage_effect_label_2",
  "damage_effect_label_3",
  "damage_effect_label_4",
] as const;
export const effectThresholdKeys = [
  "damage_effect_threshold_1",
  "damage_effect_threshold_2",
  "damage_effect_threshold_3",
] as const;

export default function DamageEffectSettings({
  settings,
  disabled,
  onChange,
}: {
  settings: BattleSettings;
  disabled: boolean;
  onChange: (settings: BattleSettings) => void;
}) {
  const bounds = [
    -100,
    ...effectThresholdKeys.map((key) => settings[key]),
    100,
  ];
  const signed = (value: number) =>
    `${value > 0 ? "+" : ""}${Number(value.toFixed(2))}%`;
  return (
    <section aria-label="ダメージ演出" className="space-y-2 border-t px-4 py-3">
      <h4 className="font-medium">ダメージ演出</h4>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>文言</TableHead>
              <TableHead>範囲（乱数幅比）</TableHead>
              <TableHead>ダメージ増減</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {effectLabelKeys.map((key, index) => {
              const upper = effectThresholdKeys[index];
              return (
                <TableRow key={key}>
                  <TableCell>
                    <Label className="sr-only" htmlFor={key}>
                      演出{index + 1}の文言
                    </Label>
                    <Input
                      id={key}
                      form="game-settings"
                      className="w-28"
                      value={settings[key]}
                      required
                      maxLength={24}
                      disabled={disabled}
                      onChange={(event) =>
                        onChange({ ...settings, [key]: event.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 whitespace-nowrap tabular-nums">
                      <span>{bounds[index]}%〜</span>
                      {upper ? (
                        <>
                          <Label className="sr-only" htmlFor={upper}>
                            演出{index + 1}の上端（乱数幅比%）
                          </Label>
                          <Input
                            id={upper}
                            form="game-settings"
                            className="w-20"
                            type="number"
                            value={settings[upper]}
                            required
                            min={-99}
                            max={99}
                            step={1}
                            disabled={disabled}
                            onChange={(event) =>
                              onChange({
                                ...settings,
                                [upper]: Number(event.target.value),
                              })
                            }
                          />
                          <span>%未満</span>
                        </>
                      ) : (
                        <span>100%</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {signed(
                      (bounds[index] * settings.damage_variance_percent) / 100,
                    )}
                    〜
                    {signed(
                      (bounds[index + 1] * settings.damage_variance_percent) /
                        100,
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
