export type PowerWeights = {
  sentence: number;
  term: number;
  logic: number;
  reference: number;
  abstraction: number;
};

export default function PowerBreakdown({
  counts,
  weights,
}: {
  counts: {
    sentence_count: number;
    term_count: number;
    logic_count: number;
    reference_count: number;
    abstraction_count?: number;
  };
  weights?: PowerWeights;
}) {
  if (!weights)
    return (
      <p className="text-xs text-muted-foreground">
        Powerの内訳は再取得後に表示します。
      </p>
    );
  const parts = [
    ["単文", counts.sentence_count, weights.sentence],
    ["用語", counts.term_count, weights.term],
    ["論理", counts.logic_count, weights.logic],
    ["参照", counts.reference_count, weights.reference],
    ["具体・抽象", counts.abstraction_count ?? 0, weights.abstraction ?? 2],
  ] as const;
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <dl
        className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 tabular-nums"
        aria-label="Powerの計算内訳"
      >
        {parts.map(([label, count, weight]) => (
          <div key={label} className="contents">
            <dt>{label}</dt>
            <dd>
              {count} × {weight} = {count * weight}
            </dd>
          </div>
        ))}
      </dl>
      <p>並び順・階層の関係と文字数は加点しません。</p>
    </div>
  );
}
