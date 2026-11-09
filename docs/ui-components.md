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

新しいUIを作る前に、下表から候補を探し、その部品の利用例を`rg`で確認する。
同じ用途の部品があれば既存のpropsで組み合わせ、足りない場合だけ互換性を保って拡張する。

| 用途 | 既存部品・実装 |
| --- | --- |
| ボタン・入力・通常の選択欄 | [Button](../app/shared/components/ui/button.tsx)、[Input](../app/shared/components/ui/input.tsx)、[NativeSelect](../app/shared/components/ui/native-select.tsx) |
| モーダル・タブ | [Dialog](../app/shared/components/ui/dialog.tsx)、[Tabs](../app/shared/components/ui/tabs.tsx) |
| admin表の見出し・枠・縦罫線・末尾の追加行 | [AdminTable](../app/features/admin/AdminTable.tsx)の`AdminTableSection`・`AdminTableFrame`・`AdminNativeTable`・`AdminTableAddRow` |
| admin表の列ソートとD&D | [SortableAdminTable](../app/features/admin/game/SortableAdminTable.tsx)。行だけのD&Dなら[SortableRows](../app/features/admin/game/SortableRows.tsx) |
| 保存時に確定する削除・行のグレーアウト | [DefinitionDeleteButton](../app/features/admin/game/DefinitionDeleteButton.tsx)と`pendingDeletionClass`。即時削除とは区別する |
| admin操作の通知 | [adminFeedback](../app/features/admin/AdminFeedback.tsx)。各画面で別のtoastを実装しない |
| 有限・無限の持続数 | [DurationInput](../app/features/admin/game/DurationInput.tsx) |
| アイコン・素材の選択 | [GameIcon](../app/features/game/GameIcon.tsx)の`IconPicker` |

`features/admin/game`の部品はゲーム設定用。一般画面へ再利用する必要が実際に生じたら、
業務依存を確認して適切な階層へ移す。将来使うかもしれないという理由だけで`shared`へ移さない。

新規・変更時の確認事項:

- 表の見出しと枠を同じ`AdminTableSection`内に置く。内容幅ならframeとtableの両方を`layout="content"`に揃える。
- D&D、列ソート、追加・削除を個別に再実装しない。永続的な並び順と一時的な列ソートは区別する。
- 保存の二重送信、失敗時の入力保持、削除の確定タイミングを既存画面と揃える。
- 新しい基本部品や再利用パターンを追加したら、この一覧も更新する。

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
