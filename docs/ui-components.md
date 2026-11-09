# UI部品とTailwindの使い分け

Tailwindのクラスが各画面にあること自体は問題ではない。同じ見た目や操作を
複数箇所で再実装し、修正先が分散することを避ける。

## 部品の境界

- `app/shared/components/ui/`: 業務知識を持たない基本部品。
  `Button`、`Input`、`NativeSelect`など。値の選択肢やAPI通信は持たせない。
- `app/features/admin/`: admin全体で共有する部品。
  `AdminTableSection`、`AdminTableFrame`、`AdminTableAddRow`、`adminFeedback`など。
- 各feature内: 業務上の意味が同じ場合に再利用する部品。
  例: `DurationInput`、`GambitRulesEditor`、`DefinitionDeleteButton`。

見た目が似ているだけの入力を、巨大な条件分岐付きコンポーネントへ統合しない。

## スタイルの配置

- 枠、背景、フォーカス、無効状態など、部品の見た目はその部品に集める。
- 幅、配置、間隔、レスポンシブ対応など、利用場所のレイアウトは利用側に残す。
- `className`は`cn(共通クラス, className)`で結合し、上書き可能にする。
- 入力を共通部品へ移しても、`id`、`htmlFor`、`aria-*`、`ref`、
  `name`、`required`、`disabled`、ネイティブなイベントを保持する。
- 全画面に効くCSSセレクターで、特定画面の幅や見た目を修正しない。

## 利用する部品

通常のプルダウンには`NativeSelect`を使う。ブラウザ標準の選択操作とフォーム送信を
維持し、幅や文字サイズだけを必要に応じて指定する。

```tsx
<NativeSelect aria-label="属性" className="w-32 text-sm" value={element} onChange={onChange}>
  <option value="fire">炎</option>
</NativeSelect>
```

透明なselectを重ねる`SkillTemplateBadges`は、通常の入力欄と外観が違うため例外。
基本部品のスタイルを大量に打ち消すより、その用途固有の実装を維持する。

編集可能なadmin表は`AdminTableSection`と既存の`AdminTable`系を使う。
ソート・D&Dが必要なら`SortableAdminTable`を使う。追加行は`tbody`または`tfoot`内に
`AdminTableAddRow`を置き、列数、ラベル、追加処理、必要なら無効状態を渡す。
`compact`はアイコン幅、それ以外は行幅の追加ボタンになる。

## 検証

共通部品にはフォーム送信、ラベル、値変更、無効状態、refなどのテストを置く。
利用側の既存テストも実行し、操作や保存データが変わらないことを確認する。
見た目に関わる変更はStorybookでPC幅とスマホ幅、フォーカスやスクロールも確認する。
