import { useCallback, useEffect, useRef, useState } from "react";
import { Progress } from "~/shared/components/ui/progress";
import { usePostFilesResourcePost } from "~/shared/generated/entry/entry";

type Props = {
  file: File;
  path?: string;
  isUploading: boolean;
  onResult: (result: {
    ok: boolean;
    message?: string;
    retryable: boolean;
  }) => void;
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
    return { message: `${advice}\n${message}`, retryable: false };
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
    message: `アップロードできませんでした。内容を確認してから再送してください。\n${message}`,
    retryable: false,
  };
}

// Uploaderで選択された１ファイルから生成されるコンポーネント
export default function UploadUnit({
  file,
  path,
  isUploading,
  onResult,
  onComplete,
}: Props) {
  const { data, trigger, isMutating, error } = usePostFilesResourcePost({
    fetch: { credentials: "include" },
  });
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(
    null,
  );
  const uploadStarted = useRef(false);

  const handleUpload = useCallback(async () => {
    setUploadErrorMessage(null); // Reset error message on new upload
    try {
      const result = await trigger({ files: [file] });
      if (result && result.status >= 200 && result.status < 300) {
        onResult({ ok: true, retryable: false });
      } else if (result && result.status >= 400) {
        // @ts-expect-error generated response types vary by status code.
        const detail = result.data?.detail?.message ?? result.data?.detail;
        const described = describeUploadError(result.status, detail);
        setUploadErrorMessage(described.message);
        onResult({ ok: false, ...described });
      } else {
        const described = describeUploadError(
          result?.status,
          "応答を解釈できませんでした",
        );
        setUploadErrorMessage(described.message);
        onResult({ ok: false, ...described });
      }
    } catch (e) {
      console.error(e);
      const described = describeUploadError(
        undefined,
        e instanceof Error ? e.message : undefined,
      );
      setUploadErrorMessage(described.message);
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
    <div className="p-1">
      <p className="truncate" title={path ?? file.name}>
        {path ?? file.name}
      </p>
      <UploadingProgress isUploading={isMutating} isFinished={!!data} />
      {(error || uploadErrorMessage) && (
        <p className="text-sm text-red-500 break-words overflow-x-auto whitespace-pre-wrap">
          {uploadErrorMessage ||
            (error instanceof Error
              ? error.message
              : "不明なエラーが発生しました")}
        </p>
      )}
      {data && !error && !isMutating && !uploadErrorMessage && (
        <p className="text-sm text-green-500">✓ アップロードに成功しました</p>
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
