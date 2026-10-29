import { X } from "lucide-react";
import { Button } from "~/shared/components/ui/button";

export const pendingDeletionClass =
  "bg-muted text-muted-foreground [&>td:not(:last-child)]:opacity-40";

export default function DefinitionDeleteButton({
  removed,
  disabled = false,
  onClick,
}: {
  removed: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const label = removed ? "削除を取り消す" : "削除";
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={removed}
      onClick={onClick}
    >
      <X aria-hidden="true" className="size-4" />
    </Button>
  );
}
