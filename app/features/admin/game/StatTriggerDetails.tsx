import type { TriggerDefinition } from "~/features/game/catalog";
import { statCondition } from "~/features/game/triggerConditions";
import {
  triggerBasisLabels,
  triggerComparisonLabels,
} from "~/features/game/triggerVariants";
import { Input } from "~/shared/components/ui/input";

export default function StatTriggerDetails({
  trigger,
  onChange,
}: {
  trigger: TriggerDefinition;
  onChange: (patch: Partial<TriggerDefinition>) => void;
}) {
  const details = statCondition(trigger);
  const resource = ["hp", "mp"].includes(details.stat);
  const rank = ["lowest", "highest"].includes(details.comparison);
  function update(patch: Partial<typeof details>) {
    const next = { ...details, ...patch };
    const percentage = resource && next.stat_basis === "percent";
    const legacy =
      percentage && !["lowest", "highest"].includes(next.comparison);
    onChange({
      ...next,
      condition: legacy
        ? (`${next.stat}_${next.comparison}` as TriggerDefinition["condition"])
        : "stat",
      threshold: percentage
        ? Math.min(trigger.threshold, 100)
        : trigger.threshold,
    });
  }
  return (
    <>
      {resource && (
        <select
          aria-label="値の基準"
          className="h-9 rounded-md border bg-background px-2"
          value={details.stat_basis}
          onChange={(e) =>
            update({ stat_basis: e.target.value as typeof details.stat_basis })
          }
        >
          {Object.entries(triggerBasisLabels).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      )}
      {!rank && (
        <Input
          aria-label="しきい値"
          type="number"
          required
          min={0}
          max={details.stat_basis === "percent" ? 100 : 100000}
          className="w-24"
          value={Number.isFinite(trigger.threshold) ? trigger.threshold : ""}
          onChange={(e) => onChange({ threshold: e.target.valueAsNumber })}
        />
      )}
      {!rank && details.stat_basis === "percent" && <span>%</span>}
      <select
        aria-label="比較"
        className="h-9 rounded-md border bg-background px-2"
        value={details.comparison}
        onChange={(e) =>
          update({ comparison: e.target.value as typeof details.comparison })
        }
      >
        {Object.entries(triggerComparisonLabels).map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </>
  );
}
