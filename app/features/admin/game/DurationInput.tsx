import { Input } from "~/shared/components/ui/input";
import { NativeSelect } from "~/shared/components/ui/native-select";

/** Keep the same finite/infinite editor in templates and both variation editors. */
export default function DurationInput({
  value,
  onChange,
  label,
  min = 1,
}: {
  value: number | "infinite";
  onChange: (value: number | "infinite") => void;
  label: string;
  min?: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <NativeSelect
        aria-label={`${label}の指定`}
        className="min-w-0 text-sm"
        value={value === "infinite" ? "infinite" : "finite"}
        onChange={(e) =>
          onChange(e.target.value === "infinite" ? "infinite" : 3)
        }
      >
        <option value="finite">指定</option>
        <option value="infinite">無限</option>
      </NativeSelect>
      {value !== "infinite" && (
        <Input
          aria-label={label}
          type="number"
          required
          className="w-20 min-w-0"
          min={min}
          max={20}
          step={1}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
      )}
    </div>
  );
}
