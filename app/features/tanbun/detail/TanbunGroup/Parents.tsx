import type { Tanbun } from "~/shared/generated/fastAPI.schemas";
import TanbunCard from "../../components/TanbunCard";

type Props = {
  parents: Tanbun[];
  className?: string;
  borderColor?: string;
};

export default function Parents({ parents, className, borderColor }: Props) {
  const nexts = parents.slice(0, -1);
  const up = parents[parents.length - 1];
  if (up === undefined) {
    return null;
  }
  return (
    <div className={className}>
      <TanbunCard k={up} borderColor={borderColor} />
      <Parents parents={nexts} className="ml-1" borderColor={borderColor} />
    </div>
  );
}
