import { KeyRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import { usersPatchCurrentUserUserMePatch } from "~/shared/generated/user/user";

const MIN_PASSWORD_LENGTH = 3;

export default function PasswordChangeForm() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirmation("");
    setError(undefined);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError("パスワードは3文字以上で入力してください。");
      return;
    }
    if (password !== confirmation) {
      setError("確認用パスワードが一致しません。");
      return;
    }

    setIsSubmitting(true);
    setError(undefined);
    try {
      const response = await usersPatchCurrentUserUserMePatch(
        { password },
        { credentials: "include" },
      );
      if (response.status !== 200) {
        setError("パスワードを変更できませんでした。");
        return;
      }
      setOpen(false);
      reset();
      toast.success("パスワードを変更しました。");
    } catch {
      setError("パスワードを変更できませんでした。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && !isSubmitting) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full">
          <KeyRound className="size-4" aria-hidden="true" />
          パスワードを変更
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>パスワードを変更</DialogTitle>
          <DialogDescription>
            次回のログインから新しいパスワードを使用します。
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">新しいパスワード</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={100}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "変更中..." : "変更する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
