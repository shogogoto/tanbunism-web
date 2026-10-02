import { FolderOpen, RefreshCw } from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "~/shared/components/ui/button";
import {
  type StoredDirectoryHandle,
  filesFromDirectory,
  loadDirectoryHandle,
  saveDirectoryHandle,
} from "./directoryHandleStore";

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<StoredDirectoryHandle>;
};

type Props = {
  acceptExt?: string[];
  recentPaths?: string[];
  setFiles: (files: File[] | null) => void;
  autoOpen?: boolean;
};

// デフォルトのinput要素ではフィルタ前のfiles数が表示されてしまう
export default function CustomFileUploader({
  acceptExt,
  recentPaths = [],
  setFiles,
  autoOpen = false,
}: Props) {
  const nativePickerRef = useRef<HTMLInputElement>(null);
  const didAutoOpen = useRef(false);
  const [filteredFileCount, setFilteredFileCount] = useState(0);
  const [directoryName, setDirectoryName] = useState(
    "フォルダを選択してください",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [originalFiles, setOriginalFiles] = useState<File[] | null>(null);
  const [directoryHandle, setDirectoryHandle] =
    useState<StoredDirectoryHandle>();
  const [isReading, setIsReading] = useState(false);
  const supportsDirectoryHandle =
    typeof window !== "undefined" &&
    typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function";

  const applyFilters = useCallback(
    (files: File[] | null, term: string) => {
      if (!files) {
        setFiles(null);
        setFilteredFileCount(0);
        return;
      }

      let currentFilteredFiles = Array.from(files).filter((file) => {
        if (acceptExt?.length === 0) return true;
        return acceptExt?.some((ext) => file.name.endsWith(ext));
      });

      if (term) {
        currentFilteredFiles = currentFilteredFiles.filter((file) =>
          file.webkitRelativePath.toLowerCase().includes(term.toLowerCase()),
        );
      }

      setFiles(currentFilteredFiles);
      setFilteredFileCount(currentFilteredFiles.length);
    },
    [acceptExt, setFiles],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const filesArray = Array.from(files);
        setOriginalFiles(filesArray);
        applyFilters(filesArray, searchTerm);
        const pathParts = files[0].webkitRelativePath.split("/");
        setDirectoryName(pathParts[0]); // 絶対パスの取得は制限されているらしい
      } else {
        setOriginalFiles(null);
        setFilteredFileCount(0);
        setDirectoryName("フォルダを選択してください");
        setSearchTerm(""); // フォルダ選択が解除されたら検索語もリセット
      }
      // 💡 注意点: ユーザーが同じフォルダを連続で選択できるように
      // inputの値をリセットしておくと便利です。
      e.target.value = "";
    },
    [searchTerm, applyFilters],
  );

  const readDirectory = useCallback(
    async (handle: StoredDirectoryHandle, requestPermission: boolean) => {
      setIsReading(true);
      try {
        let permission = await handle.queryPermission?.({ mode: "read" });
        if (permission !== "granted" && requestPermission) {
          permission = await handle.requestPermission?.({ mode: "read" });
        }
        if (permission !== undefined && permission !== "granted") return;
        const files = await filesFromDirectory(handle);
        setDirectoryHandle(handle);
        setDirectoryName(handle.name);
        setOriginalFiles(files);
        setSearchTerm("");
        applyFilters(files, "");
      } finally {
        setIsReading(false);
      }
    },
    [applyFilters],
  );

  useEffect(() => {
    if (!supportsDirectoryHandle) return;
    let active = true;
    loadDirectoryHandle()
      .then(async (handle) => {
        if (!active || !handle) return;
        setDirectoryHandle(handle);
        setDirectoryName(handle.name);
        if ((await handle.queryPermission?.({ mode: "read" })) === "granted") {
          await readDirectory(handle, false);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [readDirectory, supportsDirectoryHandle]);

  useEffect(() => {
    if (!autoOpen || didAutoOpen.current) return;
    didAutoOpen.current = true;
    const frame = requestAnimationFrame(() => nativePickerRef.current?.click());
    return () => cancelAnimationFrame(frame);
  }, [autoOpen]);

  async function chooseDirectory() {
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
    if (!picker) return;
    try {
      const handle = await picker();
      await saveDirectoryHandle(handle);
      await readDirectory(handle, false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      throw error;
    }
  }

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value;
      setSearchTerm(term);
      applyFilters(originalFiles, term);
    },
    [originalFiles, applyFilters],
  );

  // 表示するテキストを決定
  const displayLabel =
    filteredFileCount > 0
      ? `${directoryName} 内の ${filteredFileCount} 個の対象ファイル`
      : directoryName;

  return (
    <div className="flex flex-col gap-2 w-full max-w-md">
      {supportsDirectoryHandle ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-w-0 flex-1 justify-start"
            disabled={isReading}
            onClick={() =>
              directoryHandle
                ? void readDirectory(directoryHandle, true)
                : void chooseDirectory()
            }
          >
            {directoryHandle ? (
              <RefreshCw className="size-4 shrink-0" />
            ) : (
              <FolderOpen className="size-4 shrink-0" />
            )}
            <span className="truncate">
              {isReading ? "フォルダを読み込み中…" : displayLabel}
            </span>
          </Button>
          {directoryHandle && (
            <Button
              type="button"
              variant="ghost"
              disabled={isReading}
              onClick={() => void chooseDirectory()}
            >
              変更
            </Button>
          )}
        </div>
      ) : (
        <div className="relative h-10 w-full overflow-hidden rounded-md border">
          <input
            ref={nativePickerRef}
            id="directory-upload"
            type="file"
            // @ts-ignore: webkitdirectory is not included in React's input types.
            webkitdirectory=""
            onChange={handleFileChange}
            className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
            accept={acceptExt?.join(",")}
          />
          <div className="absolute inset-0 z-10 flex items-center bg-background px-3 text-muted-foreground transition duration-150 hover:bg-accent hover:text-accent-foreground">
            <span className="truncate text-sm">{displayLabel}</span>
          </div>
        </div>
      )}
      {supportsDirectoryHandle && (
        <input
          ref={nativePickerRef}
          type="file"
          // @ts-ignore: webkitdirectory is not included in React's input types.
          webkitdirectory=""
          onChange={handleFileChange}
          accept={acceptExt?.join(",")}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
      <input
        type="text"
        data-page-input-priority
        aria-label="ファイルパスを絞り込む"
        placeholder="ファイルパスを絞り込む文字列"
        value={searchTerm}
        onChange={handleSearchChange}
        disabled={!originalFiles || originalFiles.length === 0}
        className="w-full h-10 border rounded-md px-3 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
      {recentPaths.length > 0 && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          最近の取り込み先: {recentPaths.slice(0, 3).join(" / ")}
          {!supportsDirectoryHandle && (
            <span className="ml-1">
              （同じフォルダを選ぶと前回の履歴を利用できます）
            </span>
          )}
        </p>
      )}
    </div>
  );
}
