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
    <li className="rounded-md hover:bg-muted">
      <Link
        to={history.url}
        onClick={onSelect}
        data-history-item
        data-hotkey-item
        className="flex min-w-0 items-center rounded-md px-2 py-2 outline-none data-[hotkey-active=true]:bg-accent data-[hotkey-active=true]:ring-2 data-[hotkey-active=true]:ring-inset data-[hotkey-active=true]:ring-ring"
      >
        <HistoryItemIcon url={history.url} className="mr-2 shrink-0" />
        <span className="truncate">{history.title}</span>
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
