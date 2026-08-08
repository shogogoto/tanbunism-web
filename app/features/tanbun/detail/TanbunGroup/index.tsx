import type { DirectedGraph } from "graphology";
import type { Tanbun } from "~/shared/generated/fastAPI.schemas";
import { eqEdgeType, pathsToEnd, succ } from "~/shared/lib/network";
import TanbunCard from "../../components/TanbunCard";

type Props = {
  startId: string;
  kn: (id: string) => Tanbun;
  g: DirectedGraph;
  className?: string;
  borderColor?: string;
};

export default function DetailNested({
  startId,
  kn,
  g,
  className,
  borderColor,
}: Props) {
  const sibls = pathsToEnd(g, startId, eqEdgeType("sibling"), succ);

  return (
    <div className={className}>
      {sibls.length === 0 ? (
        <TanbunCard k={kn(startId)} key={startId} borderColor={borderColor} />
      ) : (
        sibls.map((path) => {
          return path.map((id) => {
            const belows = succ(g, id, eqEdgeType("below"));
            if (belows.length === 0) {
              return (
                <TanbunCard k={kn(id)} key={id} borderColor={borderColor} />
              );
            }

            return belows.map((bid) => {
              return (
                <div key={bid}>
                  <TanbunCard k={kn(id)} key={id} borderColor={borderColor} />
                  <DetailNested
                    startId={bid}
                    kn={kn}
                    g={g}
                    key={bid}
                    className="ml-1"
                    borderColor={borderColor}
                  />
                </div>
              );
            });
          });
        })
      )}
    </div>
  );
}

// Tree と stream
