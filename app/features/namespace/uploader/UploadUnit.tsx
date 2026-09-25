import { useCallback, useEffect, useRef, useState } from "react";
import { Progress } from "~/shared/components/ui/progress";
import { usePostFilesResourcePost } from "~/shared/generated/entry/entry";

type Props = {
  file: File;
  isUploading: boolean;
  onSuccess: () => void;
  onComplete: () => void;
};

// Uploaderで選択された１ファイルから生成されるコンポーネント
export default function UploadUnit({
  file,
  isUploading,
  onSuccess,
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
        onSuccess();
      } else if (result && result.status >= 400) {
        setUploadErrorMessage(
          // @ts-ignore
          `[${result.status}]${result.data?.detail?.message}`,
        );
      }
    } catch (e) {
      console.error(e);
      setUploadErrorMessage(
        e instanceof Error ? e.message : "不明なエラーが発生しました",
      );
    } finally {
      onComplete();
    }
  }, [file, trigger, onSuccess, onComplete]);

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
      <p className="truncate">{file.name}</p>
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
