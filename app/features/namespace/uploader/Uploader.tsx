import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "~/shared/components/ui/button";
import { Progress } from "~/shared/components/ui/progress";
import AcceptExtensions from "./AcceptExtensions";
import CustomFileUploader from "./CustomFileUploader";
import UploadUnit from "./UploadUnit";
import {
  type UploadHistoryRecord,
  type UploadResult,
  loadUploadHistory,
  previousResult,
  saveUploadResult,
} from "./history";
import { fileWithoutTopDirectory } from "./utils";

type Props = {
  refresh?: () => void;
};

export default function Uploader({ refresh }: Props) {
  const [files, setFiles] = useState<File[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [queue, setQueue] = useState<number[]>([]);
  const [results, setResults] = useState<Record<number, UploadResult>>({});
  const [history, setHistory] = useState<UploadHistoryRecord[]>([]);

  const [exts, setExts] = useState<string[]>([".txt", ".md", ".kn"]);

  const paths = useMemo(
    () => files?.map((file) => file.webkitRelativePath || file.name) ?? [],
    [files],
  );

  useEffect(() => {
    setHistory(loadUploadHistory());
  }, []);

  const handleComplete = useCallback(() => {
    if (!files) return;
    const position = queue.findIndex((index) => index === uploadingIndex);
    const nextPosition = position + 1;
    setProgress(
      ((files.length - queue.length + nextPosition) / files.length) * 100,
    );
    if (nextPosition < queue.length) {
      setUploadingIndex(queue[nextPosition]);
    } else {
      setUploadingIndex(null); // 全て完了
      refresh?.();
    }
  }, [files, queue, refresh, uploadingIndex]);

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

  async function handleSubmit() {
    if (!files || files.length === 0) {
      setError("Please select a directory.");
      return;
    }
    setError(null);
    setProgress(0);
    const nextQueue = files
      .map((_, index) => index)
      .filter((index) => !results[index] || results[index].retryable);
    if (nextQueue.length === 0) {
      setError("前回から変更されたファイルはありません。");
      return;
    }
    setQueue(nextQueue);
    setUploadingIndex(nextQueue[0] ?? null);
  }

  function retryFailed() {
    const failed =
      files
        ?.map((_, index) => index)
        .filter((index) => results[index]?.retryable) ?? [];
    if (failed.length === 0) return;
    setProgress(0);
    setQueue(failed);
    setUploadingIndex(failed[0]);
  }

  const isUploading = uploadingIndex !== null;
  const skippedCount = Object.values(results).filter(
    (result) => result.skipped,
  ).length;
  const sendableCount =
    files?.filter((_, index) => !results[index] || results[index].retryable)
      .length ?? 0;

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-hidden p-5 sm:p-6">
      <AcceptExtensions exts={exts} setExts={setExts} />
      <CustomFileUploader
        acceptExt={exts}
        setFiles={(selectedFiles) => {
          setFiles(selectedFiles);
          setError(null);
          setProgress(0);
          setUploadingIndex(null);
          setQueue([]);
          const previousResults: Record<number, UploadResult> = {};
          selectedFiles?.forEach((file, index) => {
            const path = file.webkitRelativePath || file.name;
            const result = previousResult(history, file, path);
            if (result) previousResults[index] = result;
          });
          setResults(previousResults);
          setSuccessCount(
            Object.values(previousResults).filter((result) => result.ok).length,
          );
        }}
      />
      {files && files.length > 0 && (
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
          <ul className="h-full overflow-y-auto divide-y text-sm">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                <UploadUnit
                  file={fileWithoutTopDirectory(file)}
                  path={paths[index]}
                  isUploading={uploadingIndex === index}
                  result={results[index]}
                  onResult={(result) => handleResult(index, result)}
                  onComplete={handleComplete}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      {isUploading && <Progress value={progress} className="w-full" />}
      {files && !isUploading && successCount > 0 && (
        <p>
          処理済み {successCount} / {files.length}
          {skippedCount > 0 && `（変更なし ${skippedCount}件）`}
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
        onClick={handleSubmit}
        disabled={isUploading || !files || sendableCount === 0}
      >
        {isUploading
          ? `アップロード中… (${successCount}/${files?.length})`
          : sendableCount > 0
            ? `${sendableCount}件をアップロード`
            : "送信対象はありません"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
