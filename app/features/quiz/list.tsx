import { Navigate, useSearchParams } from "react-router";

export default function QuizListPage() {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  next.set("view", "quiz-management");
  return <Navigate replace to={`/dashboard?${next.toString()}`} />;
}
