import { useEffect, useState } from "react";
import Loading from "~/shared/components/Loading";
import { getPublicNamespaceUserUserIdNamespaceGet } from "~/shared/generated/entry/entry";
import type {
  LearningProgress,
  NameSpace,
  UserReadPublic,
} from "~/shared/generated/fastAPI.schemas";
import { getLearningProgressUserUserIdLearningProgressGet } from "~/shared/generated/gamification/gamification";
import { userProfileUserProfileUsernameGet } from "~/shared/generated/public-user/public-user";
import { genericCache } from "~/shared/lib/indexed";
import UserDetail from ".";

type ProfileDetail = {
  user: UserReadPublic;
  namespace: NameSpace;
  learningProgress: LearningProgress;
};

export default function ProfileDetailPage({ userId }: { userId: string }) {
  const [data, setData] = useState<ProfileDetail>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    const cacheKey = `public:profile-detail:${userId}`;

    async function load() {
      const cached = await genericCache.get(cacheKey);
      if (!active) return;
      if (cached) setData(cached as ProfileDetail);

      try {
        const profileResponse = await userProfileUserProfileUsernameGet(userId);
        if (profileResponse.status !== 200 || !profileResponse.data) {
          throw new Error("プロフィールを取得できませんでした。");
        }
        const [namespaceResponse, progressResponse] = await Promise.all([
          getPublicNamespaceUserUserIdNamespaceGet(profileResponse.data.uid),
          getLearningProgressUserUserIdLearningProgressGet(
            profileResponse.data.uid,
          ),
        ]);
        if (
          namespaceResponse.status !== 200 ||
          progressResponse.status !== 200
        ) {
          throw new Error("プロフィールの学習情報を取得できませんでした。");
        }
        const fresh: ProfileDetail = {
          user: profileResponse.data,
          namespace: namespaceResponse.data,
          learningProgress: progressResponse.data,
        };
        if (!active) return;
        setData(fresh);
        setError(undefined);
        void genericCache.set(cacheKey, fresh).catch(() => undefined);
      } catch (reason) {
        if (!active) return;
        if (!cached) {
          setError(
            reason instanceof Error
              ? reason.message
              : "プロフィールを取得できませんでした。",
          );
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  if (!data && !error) return <Loading type="center-x" />;
  if (!data) {
    return <p className="p-6 text-sm text-destructive">{error}</p>;
  }
  return (
    <UserDetail
      user={data.user}
      namespace={data.namespace}
      learningProgress={data.learningProgress}
    />
  );
}
