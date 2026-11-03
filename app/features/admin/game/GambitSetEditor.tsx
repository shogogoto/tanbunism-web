import { AdminTableSection } from "~/features/admin/AdminTable";
import type { GameCatalog } from "~/features/game/catalog";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
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
                <th scope="col">使用する敵</th>
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
                    <td className="max-w-64 text-sm">
                      {users.map((enemy) => enemy.name).join("、") || "—"}
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
              <tr>
                <td colSpan={5}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    aria-label="ガンビットセットを追加"
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
                  >
                    ＋
                  </Button>
                </td>
              </tr>
            </tfoot>
          </>
        )}
      </SortableAdminTable>
    </AdminTableSection>
  );
}
