import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/shared/components/ui/button";
import { Progress } from "~/shared/components/ui/progress";
import type { IdentityResolutionBody } from "~/shared/generated/fastAPI.schemas";
import AcceptExtensions from "./AcceptExtensions";
import CustomFileUploader from "./CustomFileUploader";
import { IdentityConflictDialog } from "./IdentityConflictDialog";
import { ImportPreviewRow, type PreviewState } from "./ImportPreviewRow";
import {
  describeUploadError,
  readIdentityConflict,
  uploadedResourceId,
} from "./UploadUnit";
import {
  type UploadHistoryRecord,
  type UploadResult,
  loadUploadHistory,
  saveUploadResult,
} from "./history";
import { saveResourceText } from "./uploadApi";
import { fileWithoutTopDirectory } from "./utils";

type Props = {
  refresh?: () => void;
};

function responseDetail(value: unknown): string {
  if (!value || typeof value !== "object") return String(value ?? "");
  if (!("detail" in value)) return JSON.stringify(value);
  const detail = (value as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message?: unknown }).message ?? "");
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        item && typeof item === "object" && "msg" in item
          ? String(item.msg)
          : JSON.stringify(item),
      )
      .join("\n");
  }
  return JSON.stringify(detail);
}

function mergeResolutions(
  current: IdentityResolutionBody[],
  incoming: IdentityResolutionBody[],
): IdentityResolutionBody[] {
  const keys = new Set(
    incoming.map(
      (resolution) => `${resolution.kind ?? "sentence"}:${resolution.original}`,
    ),
  );
  return [
    ...current.filter(
      (resolution) =>
        !keys.has(`${resolution.kind ?? "sentence"}:${resolution.original}`),
    ),
    ...incoming,
  ];
}

export default function Uploader({ refresh }: Props) {
  const [files, setFiles] = useState<File[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, UploadResult>>({});
  const [history, setHistory] = useState<UploadHistoryRecord[]>([]);
  const [previews, setPreviews] = useState<Record<number, PreviewState>>({});
  const [processing, setProcessing] = useState<{
    position: number;
    total: number;
  } | null>(null);
  const [conflictOpenIndex, setConflictOpenIndex] = useState<number | null>(
    null,
  );

  const [exts, setExts] = useState<string[]>([".txt", ".md", ".kn", ".tb"]);

  const paths = useMemo(
    () => files?.map((file) => file.webkitRelativePath || file.name) ?? [],
    [files],
  );

  const recentPaths = useMemo(() => {
    const roots = history
      .filter((record) => record.ok)
      .map((record) => record.path.split("/")[0])
      .filter(Boolean);
    return [...new Set(roots)];
  }, [history]);

  useEffect(() => {
    setHistory(loadUploadHistory());
  }, []);

  const handleResult = useCallback(
    (index: number, result: UploadResult) => {
      setResults((previous) => ({ ...previous, [index]: result }));
      if (result.ok) setSuccessCount((previous) => previous + 1);
      const path = paths[index];
      const file = files?.[index];
      if (path && file) {
        setHistory((previous) =>
          saveUploadResult(previous, file, path, result),
        );
      }
    },
    [files, paths],
  );

  const sendableIndices = useMemo(
    () =>
      files
        ?.map((_, index) => index)
        .filter((index) => !results[index] || results[index].retryable) ?? [],
    [files, results],
  );

  async function resolveImportConflict(
    index: number,
    incoming: IdentityResolutionBody[],
  ) {
    const current = previews[index];
    if (!current || current.status !== "conflict") return;
    const resolutions = mergeResolutions(current.resolutions, incoming);
    setPreviews((previous) => ({
      ...previous,
      [index]: { ...current, isResolving: true, error: undefined },
    }));
    const result = await importFile(index, resolutions);
    if (result.ok) {
      handleResult(index, result);
      setPreviews((previous) => {
        const next = { ...previous };
        delete next[index];
        return next;
      });
      setConflictOpenIndex(null);
      refresh?.();
      return;
    }
    handleResult(index, result);
    setPreviews((previous) => {
      const next = previous[index];
      if (next?.status === "conflict") return previous;
      return {
        ...previous,
        [index]: {
          status: "error",
          message: result.message ?? "取り込みに失敗しました。",
          details: result.details,
          resolutions,
        },
      };
    });
  }

  async function importFile(
    index: number,
    resolutions: IdentityResolutionBody[] = [],
  ): Promise<UploadResult> {
    const source = files?.[index];
    if (!source) {
      return {
        ok: false,
        message: "ファイルを読み取れませんでした。",
        retryable: false,
      };
    }
    const file = fileWithoutTopDirectory(source);
    try {
      const response = await saveResourceText(
        {
          txt: await file.text(),
          path: file.name.split("/"),
          identity_resolutions: resolutions,
        },
        { credentials: "include" },
      );
      if (response.status === 200) {
        return {
          ok: true,
          retryable: false,
          skipped: !response.data.changed,
          resourceId: uploadedResourceId(response.data),
        };
      }
      const conflict = readIdentityConflict(response.data);
      if (conflict) {
        setPreviews((previous) => ({
          ...previous,
          [index]: { status: "conflict", conflict, resolutions },
        }));
        setConflictOpenIndex((current) => current ?? index);
        return {
          ok: false,
          message: "更新内容の確認が必要です。",
          details: conflict.message,
          retryable: false,
        };
      }
      const detail = responseDetail(response.data);
      return { ok: false, ...describeUploadError(response.status, detail) };
    } catch (cause) {
      return {
        ok: false,
        ...describeUploadError(
          undefined,
          cause instanceof Error ? cause.message : undefined,
        ),
      };
    }
  }

  async function runImports(indices: number[]) {
    if (indices.length === 0) return;
    setError(null);
    setProgress(0);
    for (const [position, index] of indices.entries()) {
      setUploadingIndex(index);
      setProcessing({ position: position + 1, total: indices.length });
      const resolutions = previews[index]?.resolutions ?? [];
      setPreviews((previous) => ({
        ...previous,
        [index]: { status: "checking", resolutions },
      }));
      const result = await importFile(index, resolutions);
      handleResult(index, result);
      setProgress(((position + 1) / indices.length) * 100);
    }
    setUploadingIndex(null);
    setProcessing(null);
    refresh?.();
    void notifyImportComplete(indices.length);
  }

  async function handleSubmit() {
    if (!files || sendableIndices.length === 0) return;
    await runImports(sendableIndices);
  }

  function retryFailed() {
    const failed =
      files
        ?.map((_, index) => index)
        .filter((index) => results[index]?.retryable) ?? [];
    if (failed.length === 0) return;
    void runImports(failed);
  }

  const isUploading = uploadingIndex !== null;
  const sendableCount = sendableIndices.length;
  const conflictCount = sendableIndices.filter(
    (index) => previews[index]?.status === "conflict",
  ).length;
  const activeConflict =
    conflictOpenIndex === null ? undefined : previews[conflictOpenIndex];

  function handlePrimaryAction() {
    const firstConflict = sendableIndices.find(
      (index) => previews[index]?.status === "conflict",
    );
    if (firstConflict !== undefined) {
      setConflictOpenIndex(firstConflict);
      return;
    }
    void handleSubmit();
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-hidden p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">読書メモimport</h2>
        <p className="text-sm text-muted-foreground">
          解析に成功したファイルは、そのまま取り込みます。競合だけ確認が必要です。
        </p>
      </div>
      <details className="group rounded-md border px-4 py-3 text-sm">
        <summary className="cursor-pointer select-none font-medium">
          対象: {exts.join(" / ")}
        </summary>
        <div className="pt-3">
          <AcceptExtensions exts={exts} setExts={setExts} compact />
        </div>
      </details>
      <CustomFileUploader
        acceptExt={exts}
        recentPaths={recentPaths}
        setFiles={(selectedFiles) => {
          setFiles(selectedFiles);
          setError(null);
          setProgress(0);
          setUploadingIndex(null);
          setProcessing(null);
          setPreviews({});
          setConflictOpenIndex(null);
          // DBの状態を正とし、ブラウザの過去履歴だけで送信を省略しない。
          setResults({});
          setSuccessCount(0);
        }}
      />
      {files && files.length > 0 && (
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
          <ul className="h-full overflow-y-auto divide-y text-sm">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                <ImportPreviewRow
                  path={paths[index] ?? file.name}
                  state={previews[index]}
                  result={results[index]}
                  onOpenConflict={() => setConflictOpenIndex(index)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      {isUploading && processing && uploadingIndex !== null && (
        <output
          className="space-y-2"
          aria-live="polite"
          aria-label={`取り込み中: ${paths[uploadingIndex]}`}
        >
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <p
              className="min-w-0 truncate font-medium"
              title={paths[uploadingIndex]}
            >
              {paths[uploadingIndex]}
            </p>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {processing.position} / {processing.total}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </output>
      )}
      {files && !isUploading && successCount > 0 && (
        <p>
          取り込み済み {successCount} / {files.length}
        </p>
      )}
      {files &&
        !isUploading &&
        Object.values(results).some((result) => !result.ok) && (
          <div className="space-y-2 rounded-md border border-destructive/40 p-3 text-sm">
            <p className="font-medium">失敗したファイルがあります</p>
            <p>
              ファイルパスを確認し、内容を修正したファイルを同じ場所から選び直してください。通信エラーだけは再送できます。
            </p>
            {Object.values(results).some((result) => result.retryable) && (
              <Button variant="outline" onClick={retryFailed}>
                通信エラーのファイルだけ再送
              </Button>
            )}
          </div>
        )}
      {history.some((record) => !record.ok) && !files && (
        <p className="text-sm text-muted-foreground">
          前回失敗したパス（フォルダを選び直すと再送できます）:{" "}
          {history
            .filter((record) => !record.ok)
            .map((record) => record.path)
            .join(", ")}
        </p>
      )}
      <Button
        onClick={handlePrimaryAction}
        disabled={isUploading || !files || sendableCount === 0}
      >
        {isUploading
          ? "取り込み中…"
          : sendableCount > 0
            ? conflictCount > 0
              ? `${conflictCount}件の競合を確認してください`
              : `${sendableCount}件を解析して取り込む`
            : "送信対象はありません"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {conflictOpenIndex !== null && activeConflict?.status === "conflict" && (
        <IdentityConflictDialog
          key={JSON.stringify(activeConflict.conflict.conflicts)}
          conflict={activeConflict.conflict}
          filePath={paths[conflictOpenIndex] ?? ""}
          open
          isSubmitting={activeConflict.isResolving}
          submitError={activeConflict.error}
          onOpenChange={(open) => {
            if (!open) setConflictOpenIndex(null);
          }}
          onResolve={(resolutions) =>
            resolveImportConflict(conflictOpenIndex, resolutions)
          }
        />
      )}
    </div>
  );
}

export async function notifyImportComplete(count: number) {
  const body = `${count}件の読書メモの処理が完了しました。`;
  toast.success(body);
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    document.visibilityState === "visible" ||
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.showNotification("読書メモの取り込みが完了しました", {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "tanbunism-resource-import",
      data: { url: "/import" },
    });
  } catch {
    // トーストは表示済みなので、OS通知の失敗は取り込み結果に影響させない。
  }
}
