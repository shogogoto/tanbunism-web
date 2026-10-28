import type { GameCatalog } from "~/features/game/catalog";
import {
  resolveTriggerVariantSets,
  triggerVariantFields,
} from "~/features/game/triggerVariants";
import TriggerVariantValueInput, {
  initialTriggerValue,
} from "./TriggerVariantValueInput";
import VariantSetManager from "./VariantSetManager";

export default function TriggerVariantSetEditor({
  catalog,
  stateSkills,
  onChange,
}: {
  catalog: GameCatalog;
  stateSkills: { id: string; name: string }[];
  onChange: (next: GameCatalog) => void;
}) {
  return (
    <VariantSetManager
      title="ガンビットの変型セット"
      sets={catalog.trigger_variant_sets ?? []}
      fields={
        Object.fromEntries(
          Object.entries(triggerVariantFields).map(([id, name]) => [
            id,
            { name },
          ]),
        ) as Record<keyof typeof triggerVariantFields, { name: string }>
      }
      defaultField="threshold"
      initialValue={(field) => initialTriggerValue(field, stateSkills)}
      renderValue={(field, value, onValue) => (
        <TriggerVariantValueInput
          field={field}
          value={value}
          onChange={onValue}
          skills={stateSkills}
          label="セットの値"
        />
      )}
      canRemove={(id) =>
        !catalog.triggers?.some(
          (t) =>
            t.variant_set_id === id ||
            t.variant_set_ids?.includes(id) ||
            t.variants?.some((v) => v.variant_set_ids?.includes(id)),
        )
      }
      onCommit={(sets) =>
        onChange(
          resolveTriggerVariantSets({ ...catalog, trigger_variant_sets: sets }),
        )
      }
    />
  );
}
