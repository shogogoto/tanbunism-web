import type { ReactNode } from "react";

export default function BattleResultMessages({
  quiz,
  battle,
  children,
}: {
  quiz?: string | null;
  battle?: string | null;
  children?: ReactNode;
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
        </section>
      )}
    </div>
  );
}
