import EntryDetail from "~/features/entry/detail";
import type { Route } from "./+types/detail";

export async function clientLoader({ params }: Route.LoaderArgs) {
  return { id: params.id };
}

export default function EntryDetailRoute({ loaderData }: Route.ComponentProps) {
  return <EntryDetail id={loaderData.id} />;
}
