import React from "react";

type HighlightProps = {
  text: string;
  query: string;
};

export function Highlight({ text, query }: HighlightProps) {
  if (!query) {
    return <span>{text}</span>;
  }

  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <span>
      {parts.map((part, i) => {
        const key = `${part}-${i}`;
        if (part.toLowerCase() === query.toLowerCase()) {
          return (
            <mark
              key={key}
              className="bg-yellow-200 dark:bg-yellow-500 rounded"
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={key}>{part}</React.Fragment>;
      })}
    </span>
  );
}
