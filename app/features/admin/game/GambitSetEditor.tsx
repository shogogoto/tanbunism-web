import {
  AdminTableAddRow,
  AdminTableSection,
} from "~/features/admin/AdminTable";
import type { GameCatalog } from "~/features/game/catalog";
import { Badge } from "~/shared/components/ui/badge";
import { Input } from "~/shared/components/ui/input";
import { NativeSelect } from "~/shared/components/ui/native-select";
import DefinitionDeleteButton from "./DefinitionDeleteButton";
import GambitRulesEditor from "./GambitRulesEditor";
import SortableAdminTable from "./SortableAdminTable";
import { RowDragHandle, SortableRow } from "./SortableRows";

export default function GambitSetEditor({
  catalog,
  onChange,
}: { catalog: GameCatalog; onChange: (catalog: GameCatalog) => void }) {
  const sets = catalog.gambit_sets ?? [];
  const update = (id: string, patch: Partial<(typeof sets)[number]>) =>
    onChange({
      ...catalog,
      gambit_sets: sets.map((group) =>
        group.id === id ? { ...group, ...patch } : group,
      ),
    });
  return (
    <AdminTableSection title="ガンビットセット" className="space-y-3">
      <SortableAdminTable
        rows={sets}
        aria-label="ガンビットセット"
        onReorder={(gambit_sets) => onChange({ ...catalog, gambit_sets })}
        value={(group, column) =>
          column === "名前" ? group.name : group.rules.length
        }
      >
        {({ sorted, header }) => (
          <>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">並べ替え</span>
                </th>
                {header("名前", "名前")}
                {header("行動", "行動")}
                <th scope="col">敵</th>
                <th scope="col">削除</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((group) => {
                const users = catalog.enemies.filter(
                  (enemy) => enemy.gambit_set_id === group.id,
                );
                return (
                  <SortableRow
                    key={group.id}
                    id={group.id}
                    aria-label={group.name}
                  >
                    <td>
                      <RowDragHandle />
                    </td>
                    <td>
                      <Input
                        aria-label="セット名"
                        className="w-40"
                        required
                        maxLength={80}
                        value={group.name}
                        onChange={(e) =>
                          update(group.id, { name: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <GambitRulesEditor
                        name={group.name}
                        rules={group.rules}
                        catalog={catalog}
                        onChange={(rules) => update(group.id, { rules })}
                      />
                    </td>
                    <td className="text-sm">
                      <div className="flex w-48 flex-wrap items-center gap-1">
                        {users.map((enemy) => (
                          <Badge
                            key={enemy.id}
                            variant="secondary"
                            className="gap-1"
                          >
                            {enemy.name}
                            <button
                              type="button"
                              aria-label={`${group.name}から${enemy.name}を解除`}
                              onClick={() =>
                                onChange({
                                  ...catalog,
                                  enemies: catalog.enemies.map((item) =>
                                    item.id === enemy.id
                                      ? { ...item, gambit_set_id: null }
                                      : item,
                                  ),
                                })
                              }
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                        <NativeSelect
                          aria-label={`${group.name}に敵を追加`}
                          className="w-full text-sm"
                          value=""
                          onChange={(e) => {
                            const id = e.target.value;
                            if (id)
                              onChange({
                                ...catalog,
                                enemies: catalog.enemies.map((enemy) =>
                                  enemy.id === id
                                    ? { ...enemy, gambit_set_id: group.id }
                                    : enemy,
                                ),
                              });
                          }}
                        >
                          <option value="">敵を追加…</option>
                          {catalog.enemies
                            .filter((enemy) => enemy.gambit_set_id !== group.id)
                            .map((enemy) => (
                              <option key={enemy.id} value={enemy.id}>
                                {enemy.name}
                                {enemy.gambit_set_id
                                  ? `（${sets.find((set) => set.id === enemy.gambit_set_id)?.name ?? "別セット"}から移動）`
                                  : ""}
                              </option>
                            ))}
                        </NativeSelect>
                      </div>
                    </td>
                    <td>
                      <DefinitionDeleteButton
                        removed={false}
                        disabled={users.length > 0}
                        onClick={() =>
                          onChange({
                            ...catalog,
                            gambit_sets: sets.filter(
                              (item) => item.id !== group.id,
                            ),
                          })
                        }
                      />
                    </td>
                  </SortableRow>
                );
              })}
            </tbody>
            <tfoot>
              <AdminTableAddRow
                colSpan={5}
                label="ガンビットセットを追加"
                onClick={() =>
                  onChange({
                    ...catalog,
                    gambit_sets: [
                      ...sets,
                      {
                        id: `gambit_${crypto.randomUUID().replaceAll("-", "")}`,
                        name: "新しいセット",
                        rules: [],
                      },
                    ],
                  })
                }
              />
            </tfoot>
          </>
        )}
      </SortableAdminTable>
    </AdminTableSection>
  );
}
