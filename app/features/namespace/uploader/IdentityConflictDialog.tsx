import { GitCompareArrows, Link2, Unlink } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import type {
  IdentityConflictResponse,
  IdentityResolutionBody,
} from "~/shared/generated/fastAPI.schemas";
import { cn } from "~/shared/lib/utils";

type Props = {
  conflict: IdentityConflictResponse;
  filePath: string;
  open: boolean;
  isSubmitting?: boolean;
  submitError?: string;
  onOpenChange: (open: boolean) => void;
  onResolve: (resolutions: IdentityResolutionBody[]) => void | Promise<void>;
};

const KEEP_SEPARATE = "__keep-separate__";

export function IdentityConflictDialog({
  conflict,
  filePath,
  open,
  isSubmitting = false,
  submitError,
  onOpenChange,
  onResolve,
}: Props) {
  const [choices, setChoices] = useState<Record<string, string>>({});

  const unresolvedCount = useMemo(
    () =>
      conflict.conflicts.filter((item) => choices[item.original] === undefined)
        .length,
    [choices, conflict.conflicts],
  );

  function submit() {
    if (unresolvedCount > 0) return;
    void onResolve(
      conflict.conflicts.map((item) => ({
        kind: conflict.kind,
        original: item.original,
        replacement:
          choices[item.original] === KEEP_SEPARATE
            ? null
            : choices[item.original],
      })),
    );
  }

  const itemLabel = conflict.kind === "term" ? "用語" : "単文";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[min(96vw,72rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="border-b px-5 py-5 pr-12 sm:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <GitCompareArrows aria-hidden="true" />
              更新の競合
            </Badge>
            <span className="text-xs text-muted-foreground">
              {conflict.conflicts.length}件
            </span>
          </div>
          <DialogTitle className="text-xl leading-tight">
            どの{itemLabel}を引き継ぐか確認してください
          </DialogTitle>
          <DialogDescription className="max-w-3xl leading-relaxed">
            内容が近い{itemLabel}
            を見つけました。引き継ぐと、既存のクイズや履歴とのつながりを維持できます。
            自動判定せず、ここで選んだ内容だけを更新します。
          </DialogDescription>
          <p
            className="truncate rounded-md bg-muted/60 px-3 py-2 font-mono text-xs"
            title={filePath}
          >
            {filePath}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-muted/20 px-4 py-5 sm:px-7">
          {conflict.conflicts.map((item, index) => {
            const selected = choices[item.original];
            return (
              <fieldset
                key={`${item.original}-${index}`}
                className="overflow-hidden rounded-xl border bg-background shadow-sm"
              >
                <legend className="sr-only">
                  競合{index + 1}: {item.original}
                </legend>
                <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
                  <p className="text-sm font-semibold">競合 {index + 1}</p>
                  <Badge variant={selected ? "secondary" : "destructive"}>
                    {selected ? "選択済み" : "要確認"}
                  </Badge>
                </div>

                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:p-5">
                  <div>
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
                      これまでの{itemLabel}（今回消える内容）
                    </p>
                    <div className="min-h-24 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm leading-relaxed">
                      {item.original}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground">
                      今回のファイルにある候補
                    </p>
                    {item.candidates.map((candidate, candidateIndex) => {
                      const id = `identity-${index}-${candidateIndex}`;
                      const checked = selected === candidate.value;
                      return (
                        <label
                          key={`${candidate.value}-${candidateIndex}`}
                          htmlFor={id}
                          className={cn(
                            "flex cursor-pointer gap-3 rounded-lg border p-3.5 transition-colors hover:bg-accent/50",
                            checked &&
                              "border-primary bg-primary/5 ring-1 ring-primary/30",
                          )}
                        >
                          <input
                            id={id}
                            type="radio"
                            name={`identity-${index}`}
                            value={candidate.value}
                            checked={checked}
                            onChange={() =>
                              setChoices((previous) => ({
                                ...previous,
                                [item.original]: candidate.value,
                              }))
                            }
                            className="mt-1 size-4 accent-primary"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                                <Link2
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                この候補へ引き継ぐ
                              </span>
                              <Badge variant="outline">
                                類似度 {Math.round(candidate.similarity * 100)}%
                              </Badge>
                            </span>
                            <span className="block break-words text-sm leading-relaxed">
                              {candidate.value}
                            </span>
                          </span>
                        </label>
                      );
                    })}

                    <label
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-lg border p-3.5 transition-colors hover:bg-accent/50",
                        selected === KEEP_SEPARATE &&
                          "border-primary bg-primary/5 ring-1 ring-primary/30",
                      )}
                    >
                      <input
                        type="radio"
                        name={`identity-${index}`}
                        value={KEEP_SEPARATE}
                        checked={selected === KEEP_SEPARATE}
                        onChange={() =>
                          setChoices((previous) => ({
                            ...previous,
                            [item.original]: KEEP_SEPARATE,
                          }))
                        }
                        className="mt-1 size-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                          <Unlink aria-hidden="true" className="size-4" />
                          別の{itemLabel}として扱う
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          旧{itemLabel}
                          は退役させ、今回の候補は新しく追加します。既存のクイズは自動で付け替えません。
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              </fieldset>
            );
          })}
        </div>

        <DialogFooter className="items-center border-t bg-background px-5 py-4 sm:px-7">
          <div className="mr-auto text-sm text-muted-foreground">
            {unresolvedCount > 0
              ? `あと${unresolvedCount}件の選択が必要です`
              : "すべての競合を確認しました"}
            {submitError && (
              <p className="mt-1 text-destructive">{submitError}</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            あとで確認
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={unresolvedCount > 0 || isSubmitting}
          >
            {isSubmitting ? "更新しています…" : "選択内容で更新"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
