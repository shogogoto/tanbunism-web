export type GameArtwork = {
  label: string;
  src: string;
  category: "enemy" | "boss" | "item" | "equipment" | "magic" | "scenery";
  pixelated?: boolean;
  equipmentPart?: "arm" | "body" | "feet" | "head" | "accessory";
};

/** Unmodified CC0 sprites; paths preserve their names in the upstream archive. */
const sprite = (
  label: string,
  category: GameArtwork["category"],
  file: string,
  equipmentPart?: GameArtwork["equipmentPart"],
): GameArtwork => ({
  label,
  category,
  src: `/game-assets/crawl/${file}`,
  pixelated: true,
  equipmentPart,
});

export const crawlAssets = {
  crawl_goblin: sprite("ゴブリン", "enemy", "dc-mon/goblin.png"),
  crawl_kobold: sprite("コボルト", "enemy", "dc-mon/kobold.png"),
  crawl_orc: sprite("オーク", "enemy", "dc-mon/orc.png"),
  crawl_orc_wizard: sprite("オークの魔術師", "enemy", "dc-mon/orc_wizard.png"),
  crawl_ogre: sprite("オーガ", "enemy", "dc-mon/ogre.png"),
  crawl_troll: sprite("トロール", "enemy", "dc-mon/troll.png"),
  crawl_jelly: sprite("ジェリー", "enemy", "dc-mon/jelly.png"),
  crawl_bat: sprite("コウモリ", "enemy", "dc-mon/animals/giant_bat.png"),
  crawl_wolf: sprite("オオカミ", "enemy", "dc-mon/animals/wolf.png"),
  crawl_snake: sprite("ヘビ", "enemy", "dc-mon/animals/snake.png"),
  crawl_scorpion: sprite("サソリ", "enemy", "dc-mon/animals/scorpion.png"),
  crawl_mummy: sprite("ミイラ", "enemy", "dc-mon/undead/mummy.png"),
  crawl_wraith: sprite("レイス", "enemy", "dc-mon/undead/wraith.png"),
  crawl_fire_elemental: sprite(
    "炎の精霊",
    "enemy",
    "dc-mon/nonliving/fire_elemental.png",
  ),
  crawl_dragon: sprite("ドラゴン", "boss", "dc-mon/dragon.png"),
  crawl_ice_dragon: sprite("氷竜", "boss", "dc-mon/ice_dragon.png"),
  crawl_golden_dragon: sprite("黄金竜", "boss", "dc-mon/golden_dragon.png"),
  crawl_hydra: sprite("ヒドラ", "boss", "dc-mon/hydra5.png"),
  crawl_ancient_lich: sprite(
    "古代のリッチ",
    "boss",
    "dc-mon/undead/ancient_lich.png",
  ),
  crawl_stone_golem: sprite(
    "石のゴーレム",
    "boss",
    "dc-mon/nonliving/stone_golem.png",
  ),
  crawl_orc_warlord: sprite("オークの将軍", "boss", "dc-mon/orc_warlord.png"),
  crawl_griffon: sprite("グリフォン", "boss", "dc-mon/griffon.png"),
  crawl_sword: sprite("長剣", "equipment", "item/weapon/long_sword1.png"),
  crawl_dagger: sprite("短剣", "equipment", "item/weapon/short_sword1.png"),
  crawl_axe: sprite("戦斧", "equipment", "item/weapon/battle_axe1.png"),
  crawl_bow: sprite("弓", "equipment", "item/weapon/ranged/bow1.png"),
  crawl_staff: sprite("魔法の杖", "equipment", "item/staff/staff01.png"),
  crawl_shield: sprite(
    "騎士の盾",
    "equipment",
    "item/armour/shields/shield2_kite.png",
  ),
  crawl_buckler: sprite(
    "小盾",
    "equipment",
    "item/armour/shields/buckler1.png",
  ),
  crawl_spellbook: sprite(
    "魔導書",
    "equipment",
    "item/book/book_of_the_dead.png",
  ),
  crawl_leather_armour: sprite(
    "革の鎧",
    "equipment",
    "item/armour/leather_armour1.png",
    "body",
  ),
  crawl_chain_mail: sprite(
    "鎖の鎧",
    "equipment",
    "item/armour/chain_mail1.png",
    "body",
  ),
  crawl_plate_mail: sprite(
    "板金の鎧",
    "equipment",
    "item/armour/plate_mail1.png",
    "body",
  ),
  crawl_robe: sprite(
    "魔術師のローブ",
    "equipment",
    "item/armour/robe1.png",
    "body",
  ),
  crawl_leather_helm: sprite(
    "革の兜",
    "equipment",
    "item/armour/headgear/elven_leather_helm.png",
    "head",
  ),
  crawl_visored_helm: sprite(
    "面頬付きの兜",
    "equipment",
    "item/armour/headgear/helmet1_visored.png",
    "head",
  ),
  crawl_etched_helm: sprite(
    "紋様の兜",
    "equipment",
    "item/armour/headgear/helmet2_etched.png",
    "head",
  ),
  crawl_wizard_hat: sprite(
    "魔術師の帽子",
    "equipment",
    "item/armour/headgear/wizard_hat1.png",
    "head",
  ),
  crawl_leather_boots: sprite(
    "革のブーツ",
    "equipment",
    "item/armour/boots1_brown.png",
    "feet",
  ),
  crawl_jackboots: sprite(
    "軍用ブーツ",
    "equipment",
    "item/armour/boots2_jackboots.png",
    "feet",
  ),
  crawl_striped_boots: sprite(
    "縞のブーツ",
    "equipment",
    "item/armour/boots3_stripe.png",
    "feet",
  ),
  crawl_gloves: sprite(
    "革の手袋",
    "equipment",
    "item/armour/glove1.png",
    "accessory",
  ),
  crawl_gauntlets: sprite(
    "金属の籠手",
    "equipment",
    "item/armour/glove4_gauntlets.png",
    "accessory",
  ),
  crawl_leather_cloak: sprite(
    "革のマント",
    "equipment",
    "item/armour/cloak1_leather.png",
    "accessory",
  ),
  crawl_cloak: sprite(
    "旅人のマント",
    "equipment",
    "item/armour/cloak3.png",
    "accessory",
  ),
  crawl_red_potion: sprite("赤い薬", "item", "item/potion/ruby.png"),
  crawl_blue_potion: sprite("青い薬", "item", "item/potion/brilliant_blue.png"),
  crawl_green_potion: sprite("緑の薬", "item", "item/potion/emerald.png"),
  crawl_orange_potion: sprite("橙の薬", "item", "item/potion/orange.png"),
  crawl_scroll: sprite("巻物", "item", "item/scroll/scroll.png"),
  crawl_apple: sprite("リンゴ", "item", "item/food/apple.png"),
  crawl_bread: sprite("パン", "item", "item/food/bread_ration.png"),
  crawl_honey: sprite("ハチミツ", "item", "item/food/honeycomb.png"),
  crawl_fireball: sprite("火球", "magic", "spells/fire/fireball.png"),
  crawl_freeze: sprite("凍結", "magic", "spells/ice/freeze.png"),
  crawl_regeneration: sprite(
    "再生",
    "magic",
    "spells/necromancy/regeneration.png",
  ),
  crawl_blink: sprite("瞬間移動", "magic", "spells/translocation/blink.png"),
  crawl_chest_closed: sprite(
    "閉じた宝箱",
    "scenery",
    "UNUSED/other/chest2_closed.png",
  ),
  crawl_chest_open: sprite(
    "開いた宝箱",
    "scenery",
    "UNUSED/other/chest2_open.png",
  ),
  crawl_fountain: sprite(
    "回復の泉",
    "scenery",
    "dc-dngn/dngn_blue_fountain.png",
  ),
} as const;
