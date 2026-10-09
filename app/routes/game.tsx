import { type LoaderFunctionArgs, redirect } from "react-router";
import Game from "~/features/game";

export function loader({ params }: Pick<LoaderFunctionArgs, "params">) {
  if (params.menu && !["adventure", "status", "item"].includes(params.menu)) {
    return redirect("/game");
  }
  return null;
}

export function meta() {
  return [{ title: "ゲーム | Tanbunism" }];
}
export default Game;
