import { CalendarDays } from "lucide-react";
import { useEffect, useRef } from "react";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import { useHistory } from "~/shared/history/hooks";
import type { UserProps } from "../types";
import ProfileImage from "./ProfileImage";

export default function UserProfile({ user }: UserProps) {
  const addedRootIdRef = useRef<UserReadPublic | null>(null);

  const { addHistory, getUserTitle } = useHistory();
  useEffect(() => {
    if (!user) return;
    if (addedRootIdRef.current === user) return;
    addHistory({ title: getUserTitle(user) });
    addedRootIdRef.current = user;
  }, [addHistory, getUserTitle, user]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <ProfileImage user={user} />
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight">
            {user?.display_name || "名無しさん"}
          </h1>
          <p className="break-words text-sm text-muted-foreground">
            {`@${user?.username}`}
          </p>
          {user?.created && (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {new Date(user.created).toLocaleDateString("ja-JP")}から利用
            </p>
          )}
        </div>
      </div>
      <div className="overflow-hidden whitespace-pre-line break-words text-sm leading-relaxed">
        {user?.profile || "プロフィールが設定されていません。"}
      </div>
    </div>
  );
}
