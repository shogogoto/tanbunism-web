import type { Tanbun } from "~/shared/generated/fastAPI.schemas";
import TanbunCard from "../../components/TanbunCard";

type Props = {
  startId: string;
  kn: (id: string) => Tanbun;
  getGroup: (id: string) => string[];
  className?: string;
  borderColor?: string;
};

export default function TanbunGroup2({
  startId,
  kn,
  getGroup,
  className,
  borderColor,
}: Props) {
  const nexts = getGroup(startId);

  return (
    <div className={className}>
      <TanbunCard k={kn(startId)} key={startId} borderColor={borderColor} />
      {nexts.map((id) => {
        return (
          <TanbunGroup2
            startId={id}
            kn={kn}
            key={id}
            getGroup={getGroup}
            className="ml-1"
            borderColor={borderColor}
          />
        );
      })}
    </div>
  );
}
