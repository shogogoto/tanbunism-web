# スキル一覧のJSON入出力

admin → ゲーム → スキルから、編集中の一覧を書き出し、編集したJSONを取り込めます。
削除予約した行は書き出しに含みません。取り込みは同じIDを更新し、新しいIDを追加します。
ファイルにない既存スキルは残ります。表を確認して「保存」を押すまで反映されません。
アイテム・敵・専門分野などの利用設定は、このファイルでは変更しません。

## 共有する変型セット（バージョン6）

現在の書き出しはバージョン6です。1〜5のファイルも引き続き取り込めます。
「変型」→「変型セットを管理」で、変更する一項目と副名・値の候補を定義します。
テンプレートの「使用する変型セット」で紐づけ、スキルのバッジ横の「変型」から
各セットの候補を組み合わせます。同じ項目のセットは併用できません。
セットや候補の名前・値は参照先すべてへ反映され、使用中の参照を壊す削除は拒否します。

```json
{
  "format": "tanbunism.skills",
  "version": 6,
  "variant_sets": [
    { "id": "tier", "name": "威力段階", "field": "multiplier", "values": [
      { "id": "low", "name": "初級", "value": 1.2 },
      { "id": "mid", "name": "中級", "value": 1.8 }
    ] },
    { "id": "range", "name": "対象範囲", "field": "target_count", "values": [
      { "id": "single", "name": "単体", "value": 1 },
      { "id": "area", "name": "範囲", "value": 3 }
    ] }
  ],
  "skill_templates": [
    { "id": "magic", "name": "魔法攻撃", "effect": "attack", "damage_type": "special", "variant_set_ids": ["tier", "range"] },
    { "id": "magic_mid_area", "name": "魔法攻撃（中級, 範囲）", "base_template_id": "magic", "variant_selections": [
      { "set_id": "tier", "value_id": "mid" },
      { "set_id": "range", "value_id": "area" }
    ] }
  ],
  "skills": [
    { "id": "fire", "name": "ファイア", "mp_cost": 3, "template_ids": ["magic_mid_area"], "element": "fire", "animation": "fire" }
  ]
}
```

全組み合わせを行として展開せず、選んだ組み合わせだけを参照として保持します。
組み合わせ行には効果量をコピーせず、親と候補から再計算します。
個別の変型（`base_template_id` / `override_fields`）も引き続き利用できます。
上限は100セット・1セット40候補・1テンプレート8セットです。

## 旧形式の直接定義例（バージョン3）

```json
{
  "format": "tanbunism.skills",
  "version": 3,
  "skills": [
    {
      "id": "heal",
      "name": "ケアル",
      "effect": "heal_hp",
      "target": "self",
      "amount": 20,
      "amount_mode": "fixed",
      "on_wrong": { "type": "reduced", "amount": 10 },
      "mp_cost": 3,
      "animation": "heal",
      "sound": "heal"
    }
  ]
}
```

| 項目 | 値 |
|---|---|
| `effect` | `attack`, `heal_hp`, `heal_mp`, `recover_moves`, `equip_attack`, `buff`, `debuff`, `ailment` |
| `target` | `enemy`（敵・人数は `target_count`）, `all_enemies`（敵全体）, `self`（自分） |
| `amount_mode` | `fixed`（固定値）, `percent`（対象能力に対する割合） |
| `stat` | `attack`, `defense`, `specialAttack`, `specialDefense`, `maxHp`（最大HPはバフのみ） |
| `enabled` | `true`, `false` |
| `sound` | `auto`, `none`, `impact`, `slash` / `slash_2` / `slash_3`, `fire` / `fire_2` … `fire_7`, `lightning` / `lightning_2` / `lightning_storm`, `heal` / `heal_2` … `heal_7`, `buff`, `debuff`, `poison` / `poison_2` … `poison_4`, `curse`, `magic`, `metal` / `metal_2`, `coins`, `stones` |

`id` は英小文字から始まる英小文字・数字・アンダースコアで64文字以内。
`name` は1〜80文字。`id`・`name`・`effect` は必須です。
攻撃・debuff・状態異常は敵、それ以外は自分を対象にします。
`amount`・`mp_cost` は0〜10000、`multiplier` は0〜10、
`duration_turns` は1〜20、`stack_limit` は1〜10です。
バブルは `effect: "buff"`, `stat: "maxHp"`, `amount_mode: "percent"` で定義します。
`animation` は演出一覧で選んだものを書き出すとIDを確認できます。
`sound` はローカル配信する効果音素材の選択です。省略時は `auto`（全映像演出に設定済みのデフォルトSE。映像が「なし」のときだけ効果種別で補完）、`none` で無音です。明示的に選んだSEは映像を変更しても保持します。
`willo_ice_shatter`（氷の粉砕）、`willo_zap`（短い放電）、`willo_thunder`（雷鳴）など、Willosunaの素材も選択できます。この追加分はCC0ではなく、商用ゲーム利用可能なroyalty-free素材です。元の利用条件は `public/game-assets/sounds/WILLOSUNA-LICENSE.txt` に保存しています。
氷 `ice`〜`ice_5`、水 `water`〜`water_5`、炎の着弾 `fire_burst`〜`fire_burst_3`、大地 `earth`、風 `wind`、爆発 `explosion` / `explosion_2`、暗黒 `dark_2` / `dark_3`、吸収 `drain`、転移 `teleport`、魔法の響き `chime`〜`chime_4`、魔力弾 `zap` / `zap_2`、魔力上昇 `magic_rise` も選択できます。雷の3種類は音程付きのZapではなく、電気のクラックル／スナップ素材を使います。
素材の出典・ライセンスは `public/game-assets/sounds/SOURCES.md` に記載しています。
adminの「演出」パネルで映像とSEを一緒に選択し、組み合わせて試聴できます。確定前に閉じると両方の選択を破棄します。戦闘中は音楽OFFにするとSEも再生しません。

効果種別ごとにキーの組み合わせが異なります。共通項目は
`id`, `name`, `icon`, `enabled`, `effect`, `target`, `amount`, `mp_cost`, `animation`, `sound` です。

| 効果種別 | 種別ごとの項目 |
|---|---|
| 攻撃 | `amount_mode`, `multiplier`, `damage_type`, `target_count`, `on_wrong` |
| HP・MP回復 | `amount_mode`, `on_wrong` |
| バフ・デバフ | `amount_mode`, `stat`, `duration_turns`, `stack_limit`, `on_wrong`（デバフは `target_count` も） |
| 状態異常 | `amount_mode`, `ailment`, `duration_turns`, `stack_limit`, `target_count`, `on_wrong` |
| 歩数回復・装備効果 | なし（常に固定値） |

バージョン3では正誤の効果と物理・特殊を定義できます。`damage_type` は `physical`（攻・守）か
`special`（特攻・特守）。管理画面では各表で分類するため、別の計算系統欄はありません。
既存の攻撃は省略時に物理として扱います。`target_count` は1〜5で、`all_enemies` では全員が対象です。

`amount` と `multiplier` は正答時の指定。誤答時は `on_wrong` で定義します。

| タイプ | `on_wrong` の例 | 対応カテゴリ |
|---|---|---|
| 反撃 | `{ "type": "counter" }` | 攻撃のみ。対象一体から通常攻撃で反撃 |
| 不発 | `{ "type": "fizzle" }` | 全戦闘カテゴリ。省略時の初期値 |
| 軽減（攻撃） | `{ "type": "reduced", "amount": 0, "multiplier": 0.5 }` | 攻撃 |
| 軽減（数値効果） | `{ "type": "reduced", "amount": 10 }` | 回復・バフ・デバフ |
| 軽減（状態異常） | `{ "type": "reduced", "apply": false }` | 状態異常。正答では常に付与 |

軽減でも対象・単位・持続・重複上限・演出は共通です。発動した行動は誤答でもMPやアイテムを消費します。
敵の行動では成否を反転し、正答が常にプレイヤーに有利になります。1行動につきクイズは1問です。
ガンビットを実行できないときは、枠・MPを消費しない最下位の「戦う」（反撃・物理・1体）を使います。

種類に合わないキーはエラーにします。以前のバージョン1・2も取り込み可能で、
旧形式に含まれていた無関係な既知項目は読み込み時に除去します。

未知の項目・IDの重複・不正な値・既存アイテムや敵の参照を壊す変更は取り込めません。
上限は200スキル、1ファイル1MBです。効果種別などの値はサーバーのStrEnumで定義され、
JSONには上記の文字列のまま保存されます。
