export function enemyLabel(
  id: string,
  labels: Record<string, string>,
  order: string[],
) {
  return (
    labels[id] ??
    (order.includes(id) ? String.fromCharCode(65 + order.indexOf(id)) : "")
  );
}
export function enemyDisplayName(name: string, label: string) {
  return label && !name.endsWith(label) ? `${name}${label}` : name;
}
