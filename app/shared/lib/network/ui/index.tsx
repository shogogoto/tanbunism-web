import "@react-sigma/core/lib/style.css";
import "@react-sigma/graph-search/lib/style.css";
import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import { useEffect } from "react";

const Fa2 = () => {
  const { start, kill } = useWorkerLayoutForceAtlas2({
    settings: { slowDown: 10 },
  });
  useEffect(() => {
    start();
    return () => kill();
  }, [start, kill]);
  return null;
};

// type Props = {
//   detail: TanbunChain;
// };
//
// function DisplayGraphComponent({ detail }: Props) {
//   return (
//     <SigmaContainer
//       graph={graph}
//       //style={{ height: "100vh", width: "100%" }}
//       className="border"
//       settings={{
//         renderEdgeLabels: true,
//         defaultEdgeType: "arrow",
//         allowInvalidContainer: true,
//       }}
//     >
//       {/* <Fa2 /> */}
//       <ControlsContainer
//         position={"bottom-right"}
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//         }}
//       >
//         <ZoomControl />
//         <FullScreenControl />
//         <LayoutForceAtlas2Control />
//       </ControlsContainer>
//       <ControlsContainer position={"bottom-left"}>
//         <MiniMap width="100px" height="100px" />
//       </ControlsContainer>
//     </SigmaContainer>
//   );
// }
//
// export default function DisplayGraph(props: Props) {
//   return <ClientOnly>{() => <DisplayGraphComponent {...props} />}</ClientOnly>;
// }
