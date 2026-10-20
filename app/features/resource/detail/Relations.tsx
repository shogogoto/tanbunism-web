import Backbone from "./Backbone";
import { useResourceDetail } from "./Context";
import Presenter from "./Presenter";
import { toAdjacent } from "./util";

type Props = {
  startId: string;
};

export default function Relations({ startId }: Props) {
  const { graph, terms, uids } = useResourceDetail();
  const adj = toAdjacent(startId, graph, uids, terms);

  return (
    <div className="ml-2">
      {adj.premises().map((elm) => {
        return (
          <div key={elm.kn.uid}>
            <Presenter id={elm.kn.uid} prefix={<span>{"⬅ "}</span>} />
            <Backbone key={elm.kn.uid} startId={elm.kn.uid} />
          </div>
        );
      })}
      {adj.conclusions().map((elm) => {
        return (
          <div key={elm.kn.uid}>
            <Presenter id={elm.kn.uid} prefix={<span>{"➡ "}</span>} />
            <Backbone key={elm.kn.uid} startId={elm.kn.uid} />
          </div>
        );
      })}
      {adj.opposites().map((elm) => (
        <div key={`anti-${elm.kn.uid}`}>
          <Presenter
            id={elm.kn.uid}
            prefix={
              <span title="反対関係" aria-label="反対関係">
                ↔{" "}
              </span>
            }
          />
          <Backbone startId={elm.kn.uid} />
        </div>
      ))}
      {adj.downArrays().map((down) => {
        return down.map((elm) => {
          return <Backbone key={elm.kn.uid} startId={elm.kn.uid} />;
        });
      })}
    </div>
  );
}
