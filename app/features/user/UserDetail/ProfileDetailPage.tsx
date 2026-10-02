import Loading from "~/shared/components/Loading";
import { getPublicNamespaceUserUserIdNamespaceGet } from "~/shared/generated/entry/entry";
import type {
  LearningProgress,
  NameSpace,
  UserReadPublic,
} from "~/shared/generated/fastAPI.schemas";
import { getLearningProgressUserUserIdLearningProgressGet } from "~/shared/generated/gamification/gamification";
import { userProfileUserProfileUsernameGet } from "~/shared/generated/public-user/public-user";
import { usePersistentSWR } from "~/shared/hooks/swr/useCache";
import { genericCache } from "~/shared/lib/indexed";
import UserDetail from ".";

type ProfileDetail = {
  user: UserReadPublic;
  namespace: NameSpace;
  learningProgress: LearningProgress;
};

export default function ProfileDetailPage({ userId }: { userId: string }) {
  const cacheKey = `public:profile-detail:${userId}`;
  const { data, error, isLoading } = usePersistentSWR<ProfileDetail>(
    ["profile-detail", userId],
    async () => {
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
      if (namespaceResponse.status !== 200 || progressResponse.status !== 200) {
        throw new Error("プロフィールの学習情報を取得できませんでした。");
      }
      return {
        user: profileResponse.data,
        namespace: namespaceResponse.data,
        learningProgress: progressResponse.data,
      };
    },
    {
      cacheKey,
      getCache: async (key) =>
        (await genericCache.get(key)) as ProfileDetail | undefined,
      setCache: (key, fresh) =>
        genericCache.set(key, fresh, 7 * 24 * 60 * 60_000),
      swr: {
        dedupingInterval: 30_000,
        keepPreviousData: true,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
      },
    },
  );

  if (isLoading) return <Loading type="center-x" />;
  if (!data) {
    return (
      <p className="p-6 text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "プロフィールを取得できませんでした。"}
      </p>
    );
  }
  return (
    <UserDetail
      user={data.user}
      namespace={data.namespace}
      learningProgress={data.learningProgress}
    />
  );
}
