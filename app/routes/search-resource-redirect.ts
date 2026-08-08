import { type LoaderFunctionArgs, redirect } from "react-router";

export function loader({ request }: LoaderFunctionArgs) {
  const source = new URL(request.url);
  source.searchParams.set("types", "resource");
  return redirect(`/search?${source.searchParams.toString()}`);
}
