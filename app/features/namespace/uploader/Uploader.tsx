import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "~/shared/components/ui/button";
import { Progress } from "~/shared/components/ui/progress";
import AcceptExtensions from "./AcceptExtensions";
import CustomFileUploader from "./CustomFileUploader";
import UploadUnit from "./UploadUnit";
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
  const [results, setResults] = useState<
    Record<number, { ok: boolean; retryable: boolean }>
  >({});
  const [rememberedFailures, setRememberedFailures] = useState<string[]>([]);

  const [exts, setExts] = useState<string[]>([".txt", ".md", ".kn"]);

  const paths = useMemo(
    () => files?.map((file) => file.webkitRelativePath || file.name) ?? [],
    [files],
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("tanbunism.upload-failures") ?? "[]",
      );
      if (Array.isArray(saved))
        setRememberedFailures(
          saved.filter((path): path is string => typeof path === "string"),
        );
    } catch {
      // localStorage is optional; uploading must still work in private browsing.
    }
  }, []);

  const rememberFailure = useCallback((path: string, failed: boolean) => {
    setRememberedFailures((previous) => {
      const next = failed
        ? [path, ...previous.filter((item) => item !== path)].slice(0, 100)
        : previous.filter((item) => item !== path);
      try {
        localStorage.setItem("tanbunism.upload-failures", JSON.stringify(next));
      } catch {
        /* optional */
      }
      return next;
    });
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
    (index: number, result: { ok: boolean; retryable: boolean }) => {
      setResults((previous) => ({ ...previous, [index]: result }));
      if (result.ok) setSuccessCount((previous) => previous + 1);
      const path = paths[index];
      if (path) rememberFailure(path, !result.ok);
    },
    [paths, rememberFailure],
  );

  async function handleSubmit() {
    if (!files || files.length === 0) {
      setError("Please select a directory.");
      return;
    }
    setError(null);
    setSuccessCount(0);
    setProgress(0);
    setResults({});
    const nextQueue = files.map((_, index) => index);
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

  return (
    <div className="space-y-4 p-4 w-full max-w-2xl">
      <AcceptExtensions exts={exts} setExts={setExts} />
      <CustomFileUploader
        acceptExt={exts}
        setFiles={(files) => {
          setFiles(files);
          setError(null);
          setSuccessCount(0);
          setProgress(0);
          setUploadingIndex(null);
        }}
      />
      {files && files.length > 0 && (
        <div>
          <ul className="overflow-auto rounded-md border p-2 text-sm">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="truncate">
                <UploadUnit
                  file={fileWithoutTopDirectory(file)}
                  path={paths[index]}
                  isUploading={uploadingIndex === index}
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
          {successCount} / {files.length} files uploaded successfully.
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
      {rememberedFailures.length > 0 && !files && (
        <p className="text-sm text-muted-foreground">
          前回失敗したパス（フォルダを選び直すと再送できます）:{" "}
          {rememberedFailures.join(", ")}
        </p>
      )}
      <Button onClick={handleSubmit} disabled={isUploading || !files}>
        {isUploading
          ? `Uploading... (${successCount}/${files?.length})`
          : "Upload"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
