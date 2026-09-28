import { useEffect, useState } from "react";
import { Link } from "react-router";
import ActivityBoard from "~/features/user/Activity";
import { Button } from "~/shared/components/ui/button";
import type { UserActivity } from "~/shared/generated/fastAPI.schemas";
import { useGetUserActivityUserActivityPost } from "~/shared/generated/public-user/public-user";

type Props = {
  userId?: string;
  userPath?: string;
};

export default function DashboardActivity({ userId, userPath }: Props) {
  const { trigger } = useGetUserActivityUserActivityPost({
    fetch: { credentials: "include" },
  });
  const [activity, setActivity] = useState<UserActivity>();
  const [isLoading, setIsLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    trigger({ user_ids: [userId] })
      .then((response) => {
        if (active && response.status === 200) {
          setActivity(response.data[0]);
        }
      })
      .catch(() => {
        if (active) setActivity(undefined);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [trigger, userId]);

  if (!userId || isLoading) {
    return (
      <section className="rounded-lg border p-4 text-sm text-muted-foreground">
        学習アクティビティを読み込み中…
      </section>
    );
  }

  return (
    <section className="rounded-lg border">
      {activity ? (
        <ActivityBoard activity={activity} />
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          学習アクティビティはまだありません。
        </p>
      )}
      <div className="px-4 pb-4 text-right">
        <Button asChild variant="link" size="sm">
          <Link to={userPath ? `/user/${userPath}` : "/dashboard"}>
            活動の詳細を見る
          </Link>
        </Button>
      </div>
    </section>
  );
}
