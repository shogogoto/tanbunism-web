import { Settings } from "lucide-react";
import { Link } from "react-router";
import UserAvatar from "~/features/user/UserAvatar";
import { LearningLevel } from "~/features/user/UserDetail";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent } from "~/shared/components/ui/card";
import type { UserRead } from "~/shared/generated/fastAPI.schemas";
import { useGetLearningProgressUserUserIdLearningProgressGet } from "~/shared/generated/gamification/gamification";
import DashboardAchievement from "./DashboardAchievement";

export default function DashboardProfile({ user }: { user?: UserRead }) {
  const progress = useGetLearningProgressUserUserIdLearningProgressGet(
    user?.uid ?? "",
    {
      fetch: { credentials: "include" },
      swr: { enabled: Boolean(user?.uid) },
    },
  );
  const learningProgress =
    progress.data?.status === 200 ? progress.data.data : undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <UserAvatar user={user} className="size-14" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">
                  {user?.display_name || "名無しさん"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  @{user?.username}
                </p>
              </div>
              <Button asChild variant="ghost" size="icon">
                <Link to="/user/edit" aria-label="プロフィールを編集">
                  <Settings className="size-4" />
                </Link>
              </Button>
            </div>
            {user?.profile && (
              <p className="mt-4 whitespace-pre-line break-words border-t pt-4 text-sm leading-relaxed">
                {user.profile}
              </p>
            )}
          </CardContent>
        </Card>

        {learningProgress ? (
          <LearningLevel progress={learningProgress} />
        ) : (
          <Card>
            <CardContent className="flex h-full min-h-24 items-center p-4 text-sm text-muted-foreground sm:p-6">
              {progress.error
                ? "学習レベルを取得できませんでした。"
                : "学習レベルを読み込み中…"}
            </CardContent>
          </Card>
        )}
      </div>

      <DashboardAchievement />
    </div>
  );
}
