import { useLoaderData } from "react-router";
import UserDetail from "~/features/user/UserDetail";
import useUserDetail from "~/features/user/UserDetail/hooks";
import { getPublicNamespaceUserUserIdNamespaceGet } from "~/shared/generated/entry/entry";
import { getLearningProgressUserUserIdLearningProgressGet } from "~/shared/generated/gamification/gamification";
import { userProfileUserProfileUsernameGet } from "~/shared/generated/public-user/public-user";
import type { Route } from "./+types/detail";

export async function loader({ params }: Route.LoaderArgs) {
  const { userId } = params;

  const response = await userProfileUserProfileUsernameGet(userId);

  if (response.status !== 200 || !response.data) {
    throw new Response("Error fetching user data", { status: response.status });
  }

  const [namespaceResponse, learningProgressResponse] = await Promise.all([
    getPublicNamespaceUserUserIdNamespaceGet(response.data.uid),
    getLearningProgressUserUserIdLearningProgressGet(response.data.uid),
  ]);
  if (namespaceResponse.status !== 200) {
    throw new Response("Error fetching user namespace", {
      status: namespaceResponse.status,
    });
  }
  if (learningProgressResponse.status !== 200) {
    throw new Response("Error fetching user learning progress", {
      status: learningProgressResponse.status,
    });
  }

  return {
    user: response.data,
    namespace: namespaceResponse.data,
    learningProgress: learningProgressResponse.data,
  };
}

export default function _() {
  const data = useLoaderData<typeof loader>();
  const props = useUserDetail({ user: data.user });
  return (
    <UserDetail
      user={data.user}
      namespace={data.namespace}
      learningProgress={data.learningProgress}
      {...props}
    />
  );
}
