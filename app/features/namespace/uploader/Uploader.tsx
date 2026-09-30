import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/shared/components/ui/button";
import { Progress } from "~/shared/components/ui/progress";
import {
  postTextResourceTextPost,
  previewTextUpdateResourceTextPreviewPost,
} from "~/shared/generated/entry/entry";
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
  const [previewingIndex, setPreviewingIndex] = useState<number | null>(null);
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

  async function previewFile(
    index: number,
    resolutions: IdentityResolutionBody[],
  ): Promise<PreviewState> {
    const source = files?.[index];
    if (!source) {
      return {
        status: "error",
        message: "ファイルを読み取れませんでした。",
        resolutions,
      };
    }
    const file = fileWithoutTopDirectory(source);
    try {
      const response = await previewTextUpdateResourceTextPreviewPost(
        {
          txt: await file.text(),
          path: file.name.split("/"),
          identity_resolutions: resolutions,
        },
        { credentials: "include" },
      );
      if (response.status === 200) {
        return { status: "ready", preview: response.data, resolutions };
      }
      const conflict = readIdentityConflict(response.data);
      if (conflict) {
        return { status: "conflict", conflict, resolutions };
      }
      const described = describeUploadError(
        response.status,
        responseDetail(response.data),
      );
      return { status: "error", ...described, resolutions };
    } catch (cause) {
      const described = describeUploadError(
        undefined,
        cause instanceof Error ? cause.message : undefined,
      );
      return { status: "error", ...described, resolutions };
    }
  }

  async function handlePreview() {
    if (!files || files.length === 0) {
      setError("フォルダを選択してください。");
      return;
    }
    setError(null);
    setProgress(0);
    if (sendableIndices.length === 0) {
      setError("前回から変更されたファイルはありません。");
      return;
    }
    const targetIndices = sendableIndices.filter((index) => {
      const state = previews[index];
      return !state || state.status === "error" || state.status === "checking";
    });
    if (targetIndices.length === 0) {
      const firstConflict = sendableIndices.find(
        (index) => previews[index]?.status === "conflict",
      );
      if (firstConflict !== undefined) setConflictOpenIndex(firstConflict);
      return;
    }
    let firstConflict: number | null = null;
    for (const [position, index] of targetIndices.entries()) {
      const resolutions = previews[index]?.resolutions ?? [];
      setPreviewingIndex(index);
      setPreviews((previous) => ({
        ...previous,
        [index]: { status: "checking", resolutions },
      }));
      const next = await previewFile(index, resolutions);
      setPreviews((previous) => ({ ...previous, [index]: next }));
      if (next.status === "conflict" && firstConflict === null) {
        firstConflict = index;
      }
      setProgress(((position + 1) / targetIndices.length) * 100);
    }
    setPreviewingIndex(null);
    if (firstConflict !== null) setConflictOpenIndex(firstConflict);
  }

  async function resolvePreviewConflict(
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
    const next = await previewFile(index, resolutions);
    setPreviews((previous) => ({ ...previous, [index]: next }));
    if (next.status === "ready") {
      const nextConflict = sendableIndices.find(
        (candidate) =>
          candidate !== index && previews[candidate]?.status === "conflict",
      );
      setConflictOpenIndex(nextConflict ?? null);
    }
  }

  async function importFile(index: number): Promise<UploadResult> {
    const source = files?.[index];
    const preview = previews[index];
    if (!source || preview?.status !== "ready") {
      return {
        ok: false,
        message: "取り込み前の確認結果がありません。",
        retryable: false,
      };
    }
    const file = fileWithoutTopDirectory(source);
    try {
      const response = await postTextResourceTextPost(
        {
          txt: await file.text(),
          path: file.name.split("/"),
          identity_resolutions: preview.resolutions,
        },
        { credentials: "include" },
      );
      if (response.status >= 200 && response.status < 300) {
        return {
          ok: true,
          retryable: false,
          resourceId: uploadedResourceId(response.data),
        };
      }
      const conflict = readIdentityConflict(response.data);
      if (conflict) {
        return {
          ok: false,
          message:
            "取り込み直前に内容が変わりました。もう一度確認してください。",
          details: conflict.message,
          retryable: true,
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
      const result = await importFile(index);
      handleResult(index, result);
      setProgress(((position + 1) / indices.length) * 100);
    }
    setUploadingIndex(null);
    refresh?.();
    void notifyImportComplete(indices.length);
  }

  async function handleSubmit() {
    if (!files || sendableIndices.length === 0) return;
    await runImports(
      sendableIndices.filter((index) => previews[index]?.status === "ready"),
    );
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
  const isPreviewing = previewingIndex !== null;
  const sendableCount = sendableIndices.length;
  const readyCount = sendableIndices.filter(
    (index) => previews[index]?.status === "ready",
  ).length;
  const conflictCount = sendableIndices.filter(
    (index) => previews[index]?.status === "conflict",
  ).length;
  const previewErrorCount = sendableIndices.filter(
    (index) => previews[index]?.status === "error",
  ).length;
  const activeConflict =
    conflictOpenIndex === null ? undefined : previews[conflictOpenIndex];

  function handlePrimaryAction() {
    if (readyCount > 0) {
      void handleSubmit();
      return;
    }
    const firstConflict = sendableIndices.find(
      (index) => previews[index]?.status === "conflict",
    );
    if (firstConflict !== undefined) {
      setConflictOpenIndex(firstConflict);
      return;
    }
    void handlePreview();
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-hidden p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">読書メモを取り込む</h2>
        <p className="text-sm text-muted-foreground">
          変更内容を確認してから、必要なファイルだけ更新します。
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
          setPreviews({});
          setPreviewingIndex(null);
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
      {(isUploading || isPreviewing) && (
        <Progress value={progress} className="w-full" />
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
        disabled={isUploading || isPreviewing || !files || sendableCount === 0}
      >
        {isUploading
          ? `アップロード中… (${successCount}/${files?.length})`
          : isPreviewing
            ? `変更を確認中… (${sendableIndices.indexOf(previewingIndex ?? -1) + 1}/${sendableCount})`
            : readyCount > 0
              ? `${readyCount}件を取り込む`
              : sendableCount > 0
                ? previewErrorCount > 0
                  ? `${previewErrorCount}件のエラーを再確認`
                  : conflictCount > 0
                    ? `${conflictCount}件の競合を確認してください`
                    : `${sendableCount}件の変更を確認`
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
            resolvePreviewConflict(conflictOpenIndex, resolutions)
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
