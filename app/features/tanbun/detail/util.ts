import type { TanbunChain } from "~/shared/generated/fastAPI.schemas";
import { toGraph } from "~/shared/lib/network";

export function graphForView(kd: TanbunChain) {
  const id = kd.uid.replaceAll(/-/g, "");
  return {
    g: toGraph(kd.g),
    rootId: id,
    knowdes: kd.knowdes,
    exceptedRoot: Object.keys(kd.knowdes).filter((v) => v !== kd.uid),
    root: kd.knowdes[id],
    location: kd.location,
    kn: (id: string) => kd.knowdes[id],
  };
}
