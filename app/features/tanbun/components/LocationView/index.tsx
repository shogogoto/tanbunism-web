import EntryBreadcrumb from "~/features/resource/EntryBreadcrumb";
import type {
  Tanbun,
  TanbunLocation,
} from "~/shared/generated/fastAPI.schemas";

type Props = {
  loc: TanbunLocation;
  tanbunId: string;
  current: Tanbun;
};

function tanbunLabel(tanbun: Tanbun) {
  return (
    tanbun.term?.names?.[0] ??
    (tanbun.sentence === "<<<not defined>>>" ? "名称未設定" : tanbun.sentence)
  );
}

export default function LocationView({ loc, tanbunId, current }: Props) {
  return (
    <EntryBreadcrumb
      user={loc.user}
      folders={loc.folders}
      resource={loc.resource}
      currentLabel={tanbunLabel(current)}
      resourceHref={`/resource/${loc.resource.uid}#${tanbunId}`}
    />
  );
}
