import { useEffect, useRef, useState } from "react";
import { AdminTableSection } from "~/features/admin/AdminTable";
import {
  type EnemyDefinition,
  type GameCatalog,
  type ItemDefinition,
  type SkillDefinition,
  type SkillPatch,
  normalizeSkill,
  prepareSkillCatalog,
  requestGameCatalog,
  resolveCatalogTemplates,
} from "~/features/game/catalog";
import { combinationTemplate } from "~/features/game/variantSets";
import { Button } from "~/shared/components/ui/button";
import DefinitionTables from "./DefinitionTables";
import ShopTable from "./ShopTable";
import SkillTables from "./SkillTables";
import SkillTemplateEditor from "./SkillTemplateEditor";
import {
  downloadSkillFile,
  previewSkillFile,
  readSkillFile,
} from "./skillFiles";

type Kind = "skills" | "items" | "enemies" | "shop";
const names = {
  skills: "スキル",
  items: "アイテム",
  enemies: "敵",
  shop: "ショップ",
};
export default function CatalogEditor({ kind }: { kind: Kind }) {
  const [catalog, setCatalog] = useState<GameCatalog>();
  const [deletions, setDeletions] = useState(new Set<string>());
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    void requestGameCatalog(true)
      .then((value) => {
        if (active)
          setCatalog(
            kind === "skills"
              ? prepareSkillCatalog(value)
              : resolveCatalogTemplates(value),
          );
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, [kind]);
  function change(next: GameCatalog) {
    setCatalog(
      kind === "skills"
        ? prepareSkillCatalog(next)
        : resolveCatalogTemplates(next),
    );
    setSaved(false);
    setError(undefined);
    setImportMessage(undefined);
  }
  async function importFile(file: File) {
    if (!catalog || saving || importing) return;
    setImporting(true);
    setError(undefined);
    setImportMessage(undefined);
    setSaved(false);
    try {
      const document = await readSkillFile(file);
      const next = await previewSkillFile(catalog, document);
      // The server has validated the complete document before any draft changes.
      const ids = new Set(
        (document as { skills: SkillDefinition[] }).skills.map((s) => s.id),
      );
      change(next);
      setDeletions(
        (current) => new Set([...current].filter((id) => !ids.has(id))),
      );
      setImportMessage(
        "取り込みました。表を確認して「保存」で確定してください。",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "取り込めませんでした。",
      );
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  const update = (
    id: string,
    patch: SkillPatch & Partial<ItemDefinition & EnemyDefinition>,
  ) => {
    if (!catalog || kind === "shop") return;
    change({
      ...catalog,
      ...(kind === "skills"
        ? {
            skills: catalog.skills.map((skill) =>
              skill.id === id ? normalizeSkill({ ...skill, ...patch }) : skill,
            ),
          }
        : {
            [kind]: catalog[kind].map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          }),
    });
  };
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!catalog || saving || importing) return;
    const references = [
      ...catalog.items
        .filter((i) => deletions.has(i.skill_id))
        .map((i) => `アイテム「${i.name}」`),
      ...catalog.enemies
        .filter(
          (e) =>
            (e.attack_skill_id && deletions.has(e.attack_skill_id)) ||
            (e.on_hit_skill_id && deletions.has(e.on_hit_skill_id)),
        )
        .map((e) => `敵「${e.name}」`),
    ];
    if (references.length) {
      setError(
        `削除するスキルを${references.join("、")}が使用しています。先に参照を変更してください。`,
      );
      return;
    }
    setSaving(true);
    setError(undefined);
    setSaved(false);
    try {
      const next = deletions.size
        ? {
            ...catalog,
            skills: catalog.skills.filter((s) => !deletions.has(s.id)),
            player_skills: catalog.player_skills?.filter(
              (u) => !deletions.has(u.skill_id),
            ),
            specialty_skills: catalog.specialty_skills?.filter(
              (u) => !deletions.has(u.skill_id),
            ),
          }
        : catalog;
      setCatalog(await requestGameCatalog(true, next));
      setDeletions(new Set());
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "保存できませんでした。",
      );
    } finally {
      setSaving(false);
    }
  }
  function add(
    effect: SkillDefinition["effect"] = "attack",
    damageType?: "physical" | "special",
  ) {
    if (!catalog || kind === "shop") return;
    const id = `${kind.slice(0, -1)}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
    const base = {
      id,
      name: `新しい${names[kind]}`,
      icon: "sparkles",
      enabled: true,
    };
    const item =
      kind === "skills"
        ? normalizeSkill({
            ...base,
            effect,
            damage_type: damageType,
            target: ["attack", "debuff", "ailment"].includes(effect)
              ? "enemy"
              : "self",
            amount: effect === "ailment" ? 5 : 0,
            multiplier: 1,
            mp_cost: 0,
            animation: "none",
          })
        : kind === "items"
          ? {
              ...base,
              skill_id:
                catalog.skills.find((s) => s.effect !== "equip_attack")?.id ??
                "",
              kind: "consumable",
              max_uses: 1,
            }
          : {
              ...base,
              icon: "ghost",
              boss: false,
              attack_skill_id: null,
              on_hit_skill_id: null,
            };
    change({ ...catalog, [kind]: [...catalog[kind], item] });
  }
  return (
    <AdminTableSection
      className="space-y-4 p-4 sm:p-6"
      aria-label={`${names[kind]}定義`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{names[kind]}</h2>
        {kind === "skills" && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              aria-label="スキルJSONファイル"
              className="sr-only"
              tabIndex={-1}
              disabled={!catalog || saving || importing}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!catalog || saving || importing}
              onClick={() => fileInput.current?.click()}
            >
              {importing ? "取り込み中…" : "JSONを取り込む"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!catalog || saving || importing}
              onClick={() => {
                if (catalog)
                  downloadSkillFile(
                    catalog.skills.filter((s) => !deletions.has(s.id)),
                    catalog.skill_templates,
                    catalog.elements,
                    catalog.variant_sets,
                  );
              }}
            >
              JSONを書き出す
            </Button>
          </div>
        )}
        {kind !== "skills" && kind !== "shop" && (
          <Button
            type="button"
            disabled={
              !catalog || saving || (kind === "items" && !catalog.skills.length)
            }
            onClick={() => add()}
          >
            追加
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="whitespace-pre-line text-destructive">
          {error}
        </p>
      )}
      {!catalog && !error && <p>読み込み中…</p>}
      {importMessage && (
        <output className="block text-sm text-muted-foreground">
          {importMessage}
        </output>
      )}
      {catalog && (
        <form onSubmit={save} className="space-y-4">
          <fieldset
            disabled={saving || importing}
            className="min-w-0 space-y-4"
          >
            {kind === "skills" && (
              <SkillTemplateEditor catalog={catalog} onChange={change} />
            )}
            {kind === "skills" && (
              <SkillTables
                skills={catalog.skills}
                reorder={(skills) => change({ ...catalog, skills })}
                templates={catalog.skill_templates}
                elements={catalog.elements}
                variantSets={catalog.variant_sets}
                onCombine={(skillId, index, baseId, selections) => {
                  const templates = catalog.skill_templates ?? [];
                  const combined = selections.length
                    ? combinationTemplate(templates, baseId, selections)
                    : templates.find((t) => t.id === baseId);
                  if (!combined) return;
                  if (
                    catalog.skills
                      .find((s) => s.id === skillId)
                      ?.template_ids?.some(
                        (id, i) => i !== index && id === combined.id,
                      )
                  )
                    throw new Error(
                      "同じ効果テンプレートを重複して指定できません。",
                    );
                  change({
                    ...catalog,
                    skill_templates: templates.some((t) => t.id === combined.id)
                      ? templates
                      : [...templates, combined],
                    skills: catalog.skills.map((skill) =>
                      skill.id === skillId
                        ? {
                            ...skill,
                            template_ids: (skill.template_ids ?? []).map(
                              (id, i) => (i === index ? combined.id : id),
                            ),
                          }
                        : skill,
                    ),
                  });
                }}
                update={update}
                add={add}
                deletions={deletions}
                toggleDelete={(id) => {
                  setDeletions((current) => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                  setSaved(false);
                  setError(undefined);
                }}
              />
            )}
            {(kind === "items" || kind === "enemies") && (
              <DefinitionTables kind={kind} catalog={catalog} update={update} />
            )}
            {kind === "shop" && (
              <ShopTable
                catalog={catalog}
                onChange={(shop) => change({ ...catalog, shop })}
              />
            )}
          </fieldset>
          {deletions.size > 0 && (
            <output className="block text-sm text-muted-foreground">
              削除予約 {deletions.size}件 · 保存で確定します。
            </output>
          )}
          <div className="flex justify-center">
            <Button type="submit" disabled={saving || importing}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </div>
          {saved && <output className="block text-center">保存しました</output>}
        </form>
      )}
    </AdminTableSection>
  );
}
