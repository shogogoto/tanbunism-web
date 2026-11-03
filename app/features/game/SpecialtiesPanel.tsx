import { useState } from "react";
import useSWR from "swr";
import { Button } from "~/shared/components/ui/button";
import { gameRequest } from "./battle";
import { requestGameCatalog } from "./catalog";
import type { GameSave } from "./domain";
import type { GameState } from "./state";

type View = {
  slots: number;
  next_level: number;
  available: { id: string; name: string }[];
  names: Record<string, string>;
  amounts: Record<string, number>;
};
export default function SpecialtiesPanel({
  save,
  revision,
  onSaved,
  disabled = false,
}: {
  save: GameSave;
  revision: number;
  onSaved: (state: GameState) => void;
  disabled?: boolean;
}) {
  const {
    data,
    error: loadError,
    mutate,
  } = useSWR(["specialties", revision], () => gameRequest<View>("specialties"));
  const { data: catalog } = useSWR("game-catalog", () => requestGameCatalog());
  const [resource, setResource] = useState("");
  const [skill, setSkill] = useState("");
  const [parents, setParents] = useState<string[]>([]);
  const [keep, setKeep] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const entries = save.specialties ?? [];
  const skills =
    catalog?.skills.filter(
      (s) =>
        s.enabled &&
        catalog.specialty_skills?.some((u) => u.enabled && u.skill_id === s.id),
    ) ?? [];
  async function change(operation: string, fields: object) {
    if (busy || disabled) return;
    setBusy(true);
    setError(undefined);
    try {
      onSaved(
        await gameRequest<GameState>("specialties", {
          revision,
          operation,
          ...fields,
        }),
      );
      setParents([]);
      setKeep("");
      if (operation === "create") setResource("");
      await mutate();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "保存できませんでした。",
      );
    } finally {
      setBusy(false);
    }
  }
  const selectClass =
    "h-9 min-w-0 rounded-md border bg-background px-2 text-sm";
  return (
    <section aria-label="専門分野" className="space-y-4">
      <h3 className="font-medium">専門分野</h3>
      <p>
        装備 {entries.filter((s) => s.equipped).length}/{data?.slots ?? 1}枠
        {data && ` · 次はLv.${data.next_level}`}
      </p>
      {(error || loadError) && (
        <p role="alert" className="text-destructive">
          {error ?? loadError?.message}
        </p>
      )}
      <fieldset disabled={disabled || busy || !data} className="space-y-3">
        {entries.map((s) => (
          <article
            key={s.id}
            className="rounded-lg border p-3 space-y-2"
            aria-label={s.name}
          >
            <div className="flex items-center gap-2">
              <strong className="mr-auto">{s.name}</strong>
              <span className="text-sm">
                {s.resource_ids.length}リソース · 効果量{" "}
                {data?.amounts[s.id] ?? "—"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground break-all">
              {s.resource_ids.map((id) => data?.names[id] ?? id).join(" / ")}
            </p>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.equipped}
                  onChange={(e) =>
                    void change("equip", {
                      ids: [s.id],
                      equipped: e.target.checked,
                    })
                  }
                />
                装備
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={parents.includes(s.id)}
                  disabled={!parents.includes(s.id) && parents.length === 2}
                  onChange={(e) => {
                    setParents((current) =>
                      e.target.checked
                        ? [...current, s.id]
                        : current.filter((id) => id !== s.id),
                    );
                    setKeep("");
                  }}
                />
                配合元
              </label>
            </div>
          </article>
        ))}
        {!entries.length && (
          <p className="text-sm text-muted-foreground">
            達成度5のボスを倒すと、専門分野を作成できます。
          </p>
        )}
        <div className="rounded-lg border p-3 space-y-2">
          <h3 className="font-medium">専門分野を作成</h3>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="作成元リソース"
              className={selectClass}
              value={resource}
              onChange={(e) => setResource(e.target.value)}
            >
              <option value="">リソース</option>
              {data?.available.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              aria-label="取得するスキル"
              className={selectClass}
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            >
              <option value="">スキル</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button
              disabled={!resource || !skill}
              onClick={() =>
                void change("create", {
                  resource_id: resource,
                  skill_id: skill,
                })
              }
            >
              作成
            </Button>
          </div>
          {!skills.length && (
            <p className="text-sm text-muted-foreground">
              adminのスキル表で「専門分野用」のスキルを登録してください。
            </p>
          )}
        </div>
        <div className="rounded-lg border p-3 space-y-2">
          <h3 className="font-medium">配合</h3>
          <p className="text-sm">
            2つを1つに置き換え、出題元を統合します。選ばなかったスキルは失われます。
          </p>
          <select
            aria-label="配合で残すスキル"
            className={selectClass}
            value={keep}
            onChange={(e) => setKeep(e.target.value)}
          >
            <option value="">残すスキル</option>
            {[
              ...new Set(
                entries
                  .filter((s) => parents.includes(s.id))
                  .map((s) => s.skill_id),
              ),
            ].map((id) => (
              <option key={id} value={id}>
                {catalog?.skills.find((s) => s.id === id)?.name ?? id}
              </option>
            ))}
          </select>
          <Button
            className="ml-2"
            disabled={parents.length !== 2 || !keep}
            onClick={() => {
              if (
                window.confirm(
                  "配合元の2つは失われ、選んだスキル1つを持つ未装備の専門分野になります。配合しますか？",
                )
              )
                void change("fuse", { ids: parents, skill_id: keep });
            }}
          >
            配合する
          </Button>
        </div>
      </fieldset>
    </section>
  );
}
