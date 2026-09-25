import { type ChangeEvent, useCallback, useState } from "react";

type Props = {
  acceptExt?: string[];
  setFiles: (files: File[] | null) => void;
};

// デフォルトのinput要素ではフィルタ前のfiles数が表示されてしまう
export default function CustomFileUploader({ acceptExt, setFiles }: Props) {
  const [filteredFileCount, setFilteredFileCount] = useState(0);
  const [directoryName, setDirectoryName] = useState(
    "フォルダを選択してください",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [originalFiles, setOriginalFiles] = useState<File[] | null>(null);

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
      <div className="relative w-full h-10 border rounded-md overflow-hidden">
        <input
          id="directory-upload"
          type="file"
          // @ts-ignore
          webkitdirectory=""
          onChange={handleFileChange}
          // 🚨 スタイルで input を完全に透明にし、上の要素をクリック可能にする
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          accept={acceptExt?.join(",")}
        />
        <div className="absolute inset-0 flex items-center bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition duration-150 z-10 px-3">
          <span className="truncate text-sm">{displayLabel}</span>
        </div>
      </div>
      <input
        type="text"
        placeholder="ファイルパスを絞り込む文字列"
        value={searchTerm}
        onChange={handleSearchChange}
        disabled={!originalFiles || originalFiles.length === 0}
        className="w-full h-10 border rounded-md px-3 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
    </div>
  );
}
