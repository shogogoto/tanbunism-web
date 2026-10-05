import { Navigate, useSearchParams } from "react-router";

export function meta() {
  return [
    { title: "クイズ | Tanbunism" },
    {
      name: "description",
      content: "みんなが作成したクイズを解く",
    },
  ];
}

export default function QuizRedirect() {
  const [params] = useSearchParams();
  const plan = params.get("plan");
  return (
    <Navigate
      replace
      to={
        plan
          ? `/review?view=quiz&plan=${encodeURIComponent(plan)}`
          : "/search?type=quiz"
      }
    />
  );
}
