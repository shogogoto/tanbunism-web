import { type LoaderFunctionArgs, redirect } from "react-router";
import Game from "~/features/game";
import { isGamePanel } from "~/features/game/menu";

export function loader({ params }: Pick<LoaderFunctionArgs, "params">) {
  if (params.menu && !isGamePanel(params.menu)) {
    return redirect("/game");
  }
  return null;
}

export function meta() {
  return [{ title: "ゲーム | Tanbunism" }];
}
export default Game;
