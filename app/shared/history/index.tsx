import { Link } from "react-router";
import { HistoryItemIcon } from "./HistoryItemIcon";
import { useHistory } from "./hooks";
import type { HistoryItemType } from "./types";

function HistoryItem({
  history,
  onSelect,
}: {
  history: HistoryItemType;
  onSelect?: () => void;
}) {
  return (
    <li className="flex items-center rounded-md hover:bg-muted">
      <HistoryItemIcon url={history.url} className="mr-2" />
      <Link
        to={history.url}
        onClick={onSelect}
        className="flex-1 truncate py-2"
      >
        {history.title}
      </Link>
    </li>
  );
}

type Props = {
  histories: readonly HistoryItemType[];
  onSelect?: () => void;
};

export function HistoryList({ histories, onSelect }: Props) {
  if (histories && histories.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">履歴なし</p>
    );
  }
  return (
    <ul>
      {histories.map((history) => (
        <HistoryItem key={history.id} history={history} onSelect={onSelect} />
      ))}
    </ul>
  );
}

export default function History() {
  const { histories } = useHistory();
  return <HistoryList histories={histories} />;
}
