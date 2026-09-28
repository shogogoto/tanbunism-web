import { Link } from "react-router";
import { Button } from "~/shared/components/ui/button";

export const documents = [
  {
    title: "ランディングページ",
    to: "/",
  },
  {
    title: "目次",
    to: "/docs/toc",
  },
  {
    title: "コンセプト",
    to: "/docs/concept",
  },

  {
    title: "始めよう",
    to: "/docs/get-started",
  },
  {
    title: "CLI",
    to: "/docs/cli",
  },

  {
    title: "機能一覧",
    to: "/docs/features",
  },
];

export default function Docs() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ol className="space-y-4">
        {" "}
        {/* リストの項目間にスペースを追加 */}
        {documents.map((doc) => (
          <li key={doc.title}>
            <Button
              asChild
              variant="link"
              className="text-lg text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 p-0 h-auto"
            >
              <Link to={doc.to}>{doc.title}</Link>
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}
