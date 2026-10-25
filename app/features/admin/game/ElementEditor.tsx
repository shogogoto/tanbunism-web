import { useEffect, useState } from "react";
import {
  AdminNativeTable,
  AdminTableFrame,
  AdminTableSection,
} from "~/features/admin/AdminTable";
import { IconPicker } from "~/features/game/GameIcon";
import {
  type ElementDefinition,
  type GameCatalog,
  defaultElements,
  requestGameCatalog,
} from "~/features/game/catalog";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";

export default function ElementEditor() {
  const [catalog, setCatalog] = useState<GameCatalog>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    requestGameCatalog(true)
      .then((value) => {
        if (active)
          setCatalog({ ...value, elements: value.elements ?? defaultElements });
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, []);
  function update(id: string, patch: Partial<ElementDefinition>) {
    setSaved(false);
    setCatalog((current) =>
      current
        ? {
            ...current,
            elements: current.elements?.map((element) =>
              element.id === id ? { ...element, ...patch } : element,
            ),
          }
        : current,
    );
  }
  return (
    <AdminTableSection aria-label="属性定義" className="space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">属性</h2>
      <p className="w-0 min-w-full text-sm text-muted-foreground">
        スキルの属性と、敵の弱点・状態効果の補正対象として使います。無属性は未設定です。無効にすると相性計算から外れ、参照は保持されます。
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {!catalog && !error && <p>読み込み中…</p>}
      {catalog && (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError(undefined);
            setSaved(false);
            try {
              setCatalog(await requestGameCatalog(true, catalog));
              setSaved(true);
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "保存できませんでした。",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy} className="min-w-0">
            <AdminTableFrame layout="content">
              <AdminNativeTable
                aria-label="属性一覧"
                layout="content"
                className="text-sm"
              >
                <thead className="bg-muted/40">
                  <tr>
                    {["名前", "アイコン", "表示色", "有効"].map((label) => (
                      <th key={label} className="p-2 text-left">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalog.elements?.map((element) => (
                    <tr
                      key={element.id}
                      aria-label={element.name}
                      className="border-t [&>td]:p-2"
                    >
                      <td>
                        <Input
                          aria-label="属性名"
                          className="w-40"
                          value={element.name}
                          required
                          maxLength={40}
                          onChange={(event) =>
                            update(element.id, { name: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <IconPicker
                          label={`${element.name}のアイコン`}
                          value={element.icon}
                          onChange={(icon) => update(element.id, { icon })}
                        />
                      </td>
                      <td>
                        <input
                          type="color"
                          aria-label="表示色"
                          value={element.color}
                          onChange={(event) =>
                            update(element.id, { color: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          aria-label="有効"
                          checked={element.enabled}
                          onChange={(event) =>
                            update(element.id, {
                              enabled: event.target.checked,
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t">
                    <td colSpan={4} className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label="属性を追加"
                        onClick={() => {
                          setSaved(false);
                          setCatalog({
                            ...catalog,
                            elements: [
                              ...(catalog.elements ?? []),
                              {
                                id: `element_${crypto.randomUUID().replaceAll("-", "")}`,
                                name: "新しい属性",
                                icon: "sparkles",
                                color: "#94a3b8",
                                enabled: true,
                              },
                            ],
                          });
                        }}
                      >
                        ＋
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </AdminNativeTable>
            </AdminTableFrame>
            <div className="mt-4 flex justify-center">
              <Button type="submit">{busy ? "保存中…" : "保存"}</Button>
            </div>
          </fieldset>
          {saved && <output className="block text-center">保存しました</output>}
        </form>
      )}
    </AdminTableSection>
  );
}
