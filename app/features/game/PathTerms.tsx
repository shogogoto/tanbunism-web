import type { PathKnowledge } from "./api";

export default function PathTerms({
  knowledge,
}: { knowledge?: PathKnowledge }) {
  const names = Array.from(
    new Set(knowledge?.term?.names?.map((name) => name.trim()).filter(Boolean)),
  );
  if (!names.length) return null;
  return (
    <span className="flex flex-wrap gap-1 text-xs font-semibold">
      {names.map((name) => (
        <span
          key={name}
          className="max-w-full rounded-sm bg-blue-500/12 px-1.5 py-0.5 break-words text-blue-700 dark:bg-blue-400/15 dark:text-blue-300"
        >
          {name}
        </span>
      ))}
    </span>
  );
}
