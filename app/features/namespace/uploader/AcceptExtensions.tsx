import { X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Input } from "~/shared/components/ui/input";

type Props = {
  exts?: string[];
  setExts: Dispatch<SetStateAction<string[]>>;
  compact?: boolean;
};

export default function AcceptExtensions({
  exts = [],
  setExts,
  compact = false,
}: Props) {
  const [customExt, setCustomExt] = useState("");

  function handleAddCustomExt() {
    if (customExt && !exts.includes(customExt) && customExt.startsWith(".")) {
      setExts((prev) => [...prev, customExt]);
      setCustomExt("");
    } else {
      // ユーザーフレンドリなエラー表示を検討
      alert("'.' で始まる有効な拡張子を入力してください (例: .txt)");
    }
  }

  function handleRemoveExt(ext: string) {
    setExts((prev) => prev.filter((e) => e !== ext));
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-2 rounded-md border p-4"}>
      {!compact && (
        <p className="text-base font-semibold">拡張子を選択してください</p>
      )}
      <div className="flex min-h-[2.5rem] flex-wrap items-center gap-2 rounded-md border bg-muted p-2">
        {exts.map((ext) => (
          <div
            key={ext}
            className="flex items-center gap-x-1.5 rounded-md bg-secondary px-2 py-1 text-sm font-medium text-secondary-foreground"
          >
            <span>{ext}</span>
            <button
              type="button"
              aria-label={`Remove ${ext}`}
              onClick={() => {
                handleRemoveExt(ext);
              }}
              className="rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddCustomExt();
          }}
        >
          <Input
            type="text"
            placeholder={exts.length > 0 ? ".ext" : "Add extension..."}
            value={customExt}
            onChange={(e) => {
              setCustomExt(e.target.value);
            }}
            className="h-7 w-28 rounded-md px-2 text-sm"
          />
        </form>
      </div>
    </div>
  );
}
