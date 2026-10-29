import type { ReactNode } from "react";
import type { GameSave } from "./domain";

export default function BattleResultMessages({
  quiz,
  battle,
  children,
  details,
}: {
  quiz?: string | null;
  battle?: string | null;
  children?: ReactNode;
  details?: GameSave["battleActionDetails"];
}) {
  return (
    <div className="space-y-3" data-battle-result>
      {(quiz || children) && (
        <section
          aria-label="クイズ結果"
          className="space-y-2 rounded-md border p-3"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-xs text-muted-foreground">クイズ</h3>
            {quiz && <p className="font-medium">{quiz}</p>}
          </div>
          {children}
        </section>
      )}
      {battle && (
        <section
          aria-label="戦闘結果"
          className="space-y-1 rounded-md border p-3"
        >
          <h3 className="text-xs text-muted-foreground">戦闘</h3>
          <p>{battle}</p>
          {details && (details.trigger || details.targets.length > 0) && (
            <p
              aria-label="行動の詳細"
              className="break-words text-xs text-muted-foreground"
            >
              {details.trigger && (
                <>
                  発動条件：{details.trigger}
                  {details.targets.length > 0 && " → "}
                </>
              )}
              {details.targets.length > 0 && (
                <>対象：{details.targets.join("、")}</>
              )}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
