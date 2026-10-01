import ProfileDetailPage from "~/features/user/UserDetail/ProfileDetailPage";
import type { Route } from "./+types/detail";

export async function clientLoader({ params }: Route.LoaderArgs) {
  return { userId: params.userId };
}

export default function ProfileRoute({ loaderData }: Route.ComponentProps) {
  return <ProfileDetailPage userId={loaderData.userId} />;
}
