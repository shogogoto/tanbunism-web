import manifest from "./effectSpriteManifest.json";

/** Stable IDs shared with the server allow-list; existing CSS IDs stay valid. */
export const spriteAnimationLabels = {
  willo_ice_shatter: "氷の粉砕",
  willo_zap: "稲妻の着弾",
  oga_star_ice: "氷の槍",
  oga_star_thunder: "弾ける雷球",
  willo_fire_impact: "火炎の炸裂",
  oga_star_fire: "飛翔する火球",
  willo_cast: "魔法の詠唱",
  willo_heal: "回復の粒子",
  willo_impact: "魔力の着弾",
  oga_slash_1: "弧の斬撃",
  oga_slash_2: "回転斬撃",
  oga_slash_3: "残像斬撃",
  oga_slash_4: "突き",
  oga_slash_5: "一閃",
  oga_spell_1: "蒼い光柱",
  oga_spell_2: "炎の刃",
  oga_spell_3: "火球",
  oga_spell_4: "炎の紋章",
  oga_spell_5: "交差する炎",
  oga_spell_6: "炎の奔流",
  oga_spell_7: "エネルギー球",
  oga_spell_8: "雷球",
  oga_spell_9: "雨滴",
  oga_spell_10: "黒煙",
  oga_effect_1: "爆発",
  oga_effect_2: "大爆発",
  oga_effect_3: "緑の衝撃波",
  oga_effect_4: "氷の噴出",
  oga_effect_5: "炎のオーラ",
  oga_nature_1: "樹木の加護",
  oga_nature_2: "癒しの蔦",
  oga_nature_3: "双葉の祝福",
  oga_nature_4: "生命の雫",
  oga_arcane_1: "魔力の彗星",
  oga_arcane_2: "魔力の波紋",
  oga_arcane_3: "魔力の光弾",
  oga_arcane_4: "魔力の結界",
  oga_arcane_5: "魔力の放電",
  oga_arcane_6: "魔力の嵐",
  oga_earth_1: "大地の衝撃",
  oga_earth_2: "岩の魔法陣",
  oga_earth_3: "岩砕き",
  oga_earth_4: "岩石の奔流",
  oga_earth_5: "石つぶての輪",
  oga_cosmic_1: "星の軌道",
  oga_cosmic_2: "時の魔法陣",
  oga_cosmic_3: "時空の渦",
  oga_cosmic_4: "転移の門",
  oga_cosmic_5: "虚空の渦",
  mochi_status_curse: "呪いのドクロ",
  mochi_status_buff: "攻撃力アップ",
  mochi_status_shield: "守りの盾",
  mochi_status_heal: "再生の光",
  mochi_status_speed: "加速の羽根",
} as const satisfies Record<keyof typeof manifest, string>;
export type SpriteAnimation = keyof typeof spriteAnimationLabels;
export function spriteAsset(animation: string) {
  if (!Object.hasOwn(manifest, animation)) return undefined;
  const id = animation as SpriteAnimation;
  return {
    ...manifest[id],
    src: `/game-assets/effects/${id}.webp`,
    poster: `/game-assets/effects/${id}-poster.webp`,
    label: spriteAnimationLabels[id],
    license:
      id.startsWith("willo_") || id.startsWith("mochi_")
        ? "Royalty-free"
        : "CC0",
  };
}
