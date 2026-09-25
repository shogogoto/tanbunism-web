import { useCallback, useEffect, useRef, useState } from "react";
import { Progress } from "~/shared/components/ui/progress";
import { usePostFilesResourcePost } from "~/shared/generated/entry/entry";
import type { UploadResult } from "./history";

type Props = {
  file: File;
  path?: string;
  isUploading: boolean;
  result?: UploadResult;
  onResult: (result: UploadResult) => void;
  onComplete: () => void;
};

export function describeUploadError(
  status: number | undefined,
  detail: unknown,
) {
  const raw = typeof detail === "string" ? detail : "";
  const message = raw || (status ? `HTTP ${status}` : "通信に失敗しました");
  if (status === 409 || /重複|already exists|duplicate/i.test(message)) {
    return {
      message: "このファイルは既に取り込まれています。再送は不要です。",
      retryable: false,
    };
  }
  if (
    status === 422 ||
    /UnexpectedToken|MarkUncontained|EDTF|Alias|SentenceConflict|domain error/i.test(
      message,
    )
  ) {
    let advice = "内容を修正してから再送してください。";
    if (/UnexpectedToken/i.test(message))
      advice =
        "現在の記法で読めない行があります。見出しは # / ## など、対応している .kn の記法に直してください。";
    else if (/MarkUncontained/i.test(message))
      advice =
        "文中の {用語} が未登録です。先に用語を定義するか、マークを外してください。";
    else if (/EDTF/i.test(message))
      advice =
        "日付の値がEDTF形式ではありません。例: 2020-01-01 のように直してください。";
    else if (/SentenceConflict/i.test(message))
      advice = "同じ単文が既に登録されています。再送は不要です。";
    else if (/Alias/i.test(message))
      advice =
        "aliasに予約済みのマーク文字が含まれています。aliasを修正してください。";
    return { message: advice, details: message, retryable: false };
  }
  if (
    !status ||
    status >= 500 ||
    /network|fetch|timeout|connection/i.test(message)
  ) {
    return {
      message:
        "一時的な通信・サーバーエラーです。時間を置いて、このファイルだけ再送してください。",
      retryable: true,
    };
  }
  return {
    message:
      "アップロードできませんでした。内容を確認してから再送してください。",
    details: message,
    retryable: false,
  };
}

// Uploaderで選択された１ファイルから生成されるコンポーネント
export default function UploadUnit({
  file,
  path,
  isUploading,
  result,
  onResult,
  onComplete,
}: Props) {
  const { data, trigger, isMutating, error } = usePostFilesResourcePost({
    fetch: { credentials: "include" },
  });
  const [uploadError, setUploadError] = useState<{
    message: string;
    details?: string;
  } | null>(null);
  const uploadStarted = useRef(false);

  const handleUpload = useCallback(async () => {
    setUploadError(null);
    try {
      const result = await trigger({ files: [file] });
      if (result && result.status >= 200 && result.status < 300) {
        onResult({ ok: true, retryable: false });
      } else if (result && result.status >= 400) {
        // @ts-expect-error generated response types vary by status code.
        const detail = result.data?.detail?.message ?? result.data?.detail;
        const described = describeUploadError(result.status, detail);
        setUploadError(described);
        onResult({ ok: false, ...described });
      } else {
        const described = describeUploadError(
          result?.status,
          "応答を解釈できませんでした",
        );
        setUploadError(described);
        onResult({ ok: false, ...described });
      }
    } catch (e) {
      console.error(e);
      const described = describeUploadError(
        undefined,
        e instanceof Error ? e.message : undefined,
      );
      setUploadError(described);
      onResult({ ok: false, ...described });
    } finally {
      onComplete();
    }
  }, [file, trigger, onResult, onComplete]);

  useEffect(() => {
    if (!isUploading) {
      uploadStarted.current = false;
      return;
    }
    if (uploadStarted.current) return;

    uploadStarted.current = true;
    void handleUpload();
  }, [isUploading, handleUpload]);

  return (
    <div className="space-y-2 px-3 py-3 sm:px-4">
      <p className="truncate font-medium" title={path ?? file.name}>
        {path ?? file.name}
      </p>
      <UploadingProgress isUploading={isMutating} isFinished={!!data} />
      {(error || uploadError || (result && !result.ok)) && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm">
          <p className="text-destructive">
            {uploadError?.message ??
              result?.message ??
              (error instanceof Error
                ? error.message
                : "不明なエラーが発生しました")}
          </p>
          {(uploadError?.details ?? result?.details) && (
            <details className="mt-2 text-muted-foreground">
              <summary className="cursor-pointer select-none">
                エラー詳細
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-background/60 p-2 text-xs">
                {uploadError?.details ?? result?.details}
              </pre>
            </details>
          )}
        </div>
      )}
      {(data || result?.ok) && !error && !isMutating && !uploadError && (
        <p className="text-sm text-green-500">
          {result?.skipped
            ? "✓ 前回から変更がないため送信を省略しました"
            : "✓ アップロードに成功しました"}
        </p>
      )}
    </div>
  );
}

function UploadingProgress({
  isUploading,
  isFinished,
}: { isUploading: boolean; isFinished: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isUploading) {
      setProgress(0); // Reset progress on new upload
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(timer);
            return 90;
          }
          return prev + 10;
        });
      }, 100);
    }
    return () => {
      clearInterval(timer);
    };
  }, [isUploading]);

  useEffect(() => {
    if (isFinished) {
      setProgress(100);
    }
  }, [isFinished]);

  return (
    <>{isUploading && <Progress value={progress} className="w-full h-1" />}</>
  );
}
