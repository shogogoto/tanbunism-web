import { Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { invalidateQuizCache } from "~/features/quiz/cache";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/shared/components/ui/alert-dialog";
import { Button } from "~/shared/components/ui/button";
import { useDeleteEntryApiEntryEntryIdDelete } from "~/shared/generated/entry/entry";

type Props = {
  entryId: string;
  name: string;
  refresh?: () => void;
};

export default function EntryDeleteButton({ entryId, name, refresh }: Props) {
  const [open, setOpen] = useState(false);

  const { trigger } = useDeleteEntryApiEntryEntryIdDelete(entryId, {
    fetch: { credentials: "include" },
  });

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setOpen(true);
  }

  async function handleConfirmDelete() {
    const result = await trigger();
    if (result && result.status >= 200 && result.status < 300) {
      await invalidateQuizCache("study-resources");
      setOpen(false);
      refresh?.();
      toast.success(`"${name}"の削除に成功しました.`);
    } else {
      const message = JSON.stringify(result?.data?.detail) || "不明なエラー";
      toast.error(`"${name}"の削除に失敗しました. ${message}}`);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" onClick={handleClick}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>エントリ削除</AlertDialogTitle>
          <AlertDialogDescription>
            "{name}"を削除しますか？
            <p>id: {entryId}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete}>
            確定
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
