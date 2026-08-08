import TanbunChainView from "~/features/tanbun/detail";
import type { Route } from "./+types";

export async function clientLoader({ params }: Route.LoaderArgs) {
  return { id: params.id };
}

export default function _f({ loaderData }: Route.ComponentProps) {
  const { id } = loaderData;
  return <TanbunChainView key={id} id={id} />;
}
