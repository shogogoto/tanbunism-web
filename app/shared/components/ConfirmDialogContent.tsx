import { useRef } from "react";
import { Button } from "~/shared/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";

type Props = {
  title: string;
  handleClick: () => void;
  keyboardNavigation?: boolean;
};

export default function ConfirmDialogContent({
  title,
  handleClick,
  keyboardNavigation = false,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  return (
    <DialogContent
      onOpenAutoFocus={
        keyboardNavigation
          ? (event) => {
              event.preventDefault();
              cancelRef.current?.focus();
            }
          : undefined
      }
      onKeyDown={(event) => {
        if (
          !keyboardNavigation ||
          event.nativeEvent.isComposing ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        )
          return;
        if (
          event.target !== cancelRef.current &&
          event.target !== confirmRef.current
        )
          return;
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        event.stopPropagation();
        (event.key === "ArrowRight" ? confirmRef : cancelRef).current?.focus();
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}の確認</DialogTitle>
        <DialogDescription>本当に{title}しますか？</DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 sm:gap-0">
        <DialogClose asChild>
          <Button ref={cancelRef} variant="outline">
            キャンセル
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button ref={confirmRef} type="button" onClick={handleClick}>
            {title}
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
