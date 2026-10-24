import { type ReactNode, useState } from "react";
import {
  type GameCatalog,
  type SkillTemplate,
  resolveCatalogTemplates,
} from "~/features/game/catalog";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";

export default function TemplateVariantPanel({
  template,
  catalog,
  onChange,
  renderVariant,
}: {
  template: SkillTemplate;
  catalog: GameCatalog;
  onChange: (catalog: GameCatalog) => void;
  renderVariant: (id: string) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const templates = catalog.skill_templates ?? [];
  const variants = templates.filter(
    (row) => row.base_template_id === template.id,
  );
  const selected = variants.find((row) => row.id === selectedId) ?? variants[0];
  function add(rows: SkillTemplate[]) {
    if (!rows.length) return;
    onChange(
      resolveCatalogTemplates({
        ...catalog,
        skill_templates: [...templates, ...rows],
      }),
    );
    setSelectedId(rows[0].id);
  }
  function variant(name: string, source = template): SkillTemplate {
    return {
      ...source,
      id: `variant_${crypto.randomUUID().replaceAll("-", "")}`,
      name: name.slice(0, 80),
      base_template_id: template.id,
      override_fields: source.base_template_id
        ? [...(source.override_fields ?? [])]
        : [],
    };
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 justify-start px-1 text-xs"
        onClick={() => setOpen(true)}
      >
        バリエーション {variants.length}件
      </Button>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-[96rem]"
        data-dashboard-swipe-ignore
      >
        <DialogHeader>
          <DialogTitle>{template.name}のバリエーション</DialogTitle>
          <DialogDescription>
            共通値を引き継ぎ、変更した項目だけ上書きします。↶で共通値へ戻せます。最後に一覧の「保存」で確定します。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="編集するバリエーション"
            className="h-9 min-w-40 max-w-full rounded-md border bg-background px-2"
            value={selected?.id ?? ""}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {!variants.length && <option value="">未登録</option>}
            {variants.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            aria-label="バリエーションを追加"
            onClick={() => add([variant(`${template.name}（新規）`)])}
          >
            追加
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selected}
            aria-label="選択中のバリエーションを複製"
            onClick={() => {
              if (selected)
                add([variant(`${selected.name}（コピー）`, selected)]);
            }}
          >
            複製
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              add(
                ["初級", "中級", "上級"]
                  .map((level) => `${template.name.slice(0, 72)}（${level}）`)
                  .filter((name) => !variants.some((row) => row.name === name))
                  .map((name) => variant(name)),
              )
            }
          >
            初級・中級・上級を作成
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              add(
                ([1, 3, 5, "all"] as const)
                  .filter(
                    (count) =>
                      !variants.some((row) => row.target_count === count),
                  )
                  .map((count) => ({
                    ...variant(
                      `${template.name.slice(0, 72)}（${count === "all" ? "全体" : `${count}体`}）`,
                    ),
                    target_count: count,
                    override_fields: ["target_count"],
                  })),
              )
            }
          >
            対象数別に作成
          </Button>
        </div>
        {selected ? (
          renderVariant(selected.id)
        ) : (
          <p className="text-sm text-muted-foreground">
            「追加」または一括作成からバリエーションを作成できます。
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
