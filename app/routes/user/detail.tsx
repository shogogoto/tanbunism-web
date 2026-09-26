import { useLoaderData } from "react-router";
import UserDetail from "~/features/user/UserDetail";
import useUserDetail from "~/features/user/UserDetail/hooks";
import { getPublicNamespaceUserUserIdNamespaceGet } from "~/shared/generated/entry/entry";
import { userProfileUserProfileUsernameGet } from "~/shared/generated/public-user/public-user";
import type { Route } from "./+types/detail";

export async function loader({ params }: Route.LoaderArgs) {
  const { userId } = params;

  const response = await userProfileUserProfileUsernameGet(userId);

  if (response.status !== 200 || !response.data) {
    throw new Response("Error fetching user data", { status: response.status });
  }

  const namespaceResponse = await getPublicNamespaceUserUserIdNamespaceGet(
    response.data.uid,
  );
  if (namespaceResponse.status !== 200) {
    throw new Response("Error fetching user namespace", {
      status: namespaceResponse.status,
    });
  }

  return { user: response.data, namespace: namespaceResponse.data };
}

export default function _() {
  const data = useLoaderData<typeof loader>();
  const props = useUserDetail({ user: data.user });
  return <UserDetail user={data.user} namespace={data.namespace} {...props} />;
}
