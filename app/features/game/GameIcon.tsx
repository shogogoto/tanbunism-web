import {
  Apple,
  Axe,
  Backpack,
  BatteryCharging,
  Bird,
  Bomb,
  Bone,
  BookOpen,
  Bug,
  Castle,
  Cat,
  CircleHelp,
  Clover,
  Coins,
  Compass,
  Crown,
  Dices,
  Dog,
  Droplet,
  Eye,
  Feather,
  Fish,
  Flame,
  FlaskConical,
  Flower2,
  Footprints,
  Gem,
  Ghost,
  Hand,
  Heart,
  HeartPulse,
  Hourglass,
  KeyRound,
  Leaf,
  Moon,
  Mountain,
  Rabbit,
  Rat,
  Scroll,
  Shell,
  Shield,
  Skull,
  Snail,
  Snowflake,
  Sparkles,
  Sun,
  Sword,
  Swords,
  Target,
  Tent,
  Trees,
  Turtle,
  WandSparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";
import { characterAsset, characterAssets } from "./characterAssets";
import {
  type IconFilters,
  defaultIconFilters,
  readIconFilters,
  readRecentIcons,
  rememberIcon,
  writeIconFilters,
} from "./iconPickerPreferences";

export const gameIcons = {
  apple: { label: "りんご", Icon: Apple },
  axe: { label: "斧", Icon: Axe },
  backpack: { label: "かばん", Icon: Backpack },
  battery: { label: "充填", Icon: BatteryCharging },
  bone: { label: "骨", Icon: Bone },
  bomb: { label: "爆弾", Icon: Bomb },
  castle: { label: "城", Icon: Castle },
  mystery: { label: "謎", Icon: CircleHelp },
  clover: { label: "クローバー", Icon: Clover },
  compass: { label: "コンパス", Icon: Compass },
  dice: { label: "サイコロ", Icon: Dices },
  dog: { label: "犬", Icon: Dog },
  eye: { label: "目", Icon: Eye },
  feather: { label: "羽", Icon: Feather },
  fish: { label: "魚", Icon: Fish },
  flower: { label: "花", Icon: Flower2 },
  hand: { label: "手", Icon: Hand },
  pulse: { label: "生命", Icon: HeartPulse },
  hourglass: { label: "砂時計", Icon: Hourglass },
  key: { label: "鍵", Icon: KeyRound },
  leaf: { label: "葉", Icon: Leaf },
  moon: { label: "月", Icon: Moon },
  mountain: { label: "山", Icon: Mountain },
  rabbit: { label: "うさぎ", Icon: Rabbit },
  rat: { label: "ねずみ", Icon: Rat },
  shell: { label: "貝", Icon: Shell },
  snail: { label: "かたつむり", Icon: Snail },
  sun: { label: "太陽", Icon: Sun },
  target: { label: "標的", Icon: Target },
  tent: { label: "テント", Icon: Tent },
  trees: { label: "森", Icon: Trees },
  turtle: { label: "亀", Icon: Turtle },
  sword: { label: "剣", Icon: Sword },
  swords: { label: "双剣", Icon: Swords },
  flame: { label: "炎", Icon: Flame },
  snowflake: { label: "氷", Icon: Snowflake },
  zap: { label: "雷", Icon: Zap },
  sparkles: { label: "光", Icon: Sparkles },
  wand: { label: "魔法の杖", Icon: WandSparkles },
  heart: { label: "ハート", Icon: Heart },
  shield: { label: "盾", Icon: Shield },
  droplet: { label: "しずく", Icon: Droplet },
  flask: { label: "薬瓶", Icon: FlaskConical },
  footprints: { label: "足跡", Icon: Footprints },
  coins: { label: "ゴールド", Icon: Coins },
  gem: { label: "宝石", Icon: Gem },
  scroll: { label: "巻物", Icon: Scroll },
  book: { label: "本", Icon: BookOpen },
  ghost: { label: "ゴースト", Icon: Ghost },
  bug: { label: "虫", Icon: Bug },
  skull: { label: "ドクロ", Icon: Skull },
  crown: { label: "王冠", Icon: Crown },
  bird: { label: "鳥", Icon: Bird },
  cat: { label: "猫", Icon: Cat },
};
export default function GameIcon({
  icon,
  className = "size-5",
}: { icon?: string | null; className?: string }) {
  const art = characterAsset(icon);
  if (art)
    return (
      <img
        src={art.src}
        alt=""
        aria-hidden="true"
        draggable={false}
        loading="lazy"
        width={art.pixelated ? 32 : 512}
        height={art.pixelated ? 32 : 512}
        style={art.pixelated ? { imageRendering: "pixelated" } : undefined}
        className={`${className} object-contain`}
      />
    );
  const { Icon } =
    gameIcons[icon as keyof typeof gameIcons] ?? gameIcons.sparkles;
  return <Icon aria-hidden="true" className={className} />;
}
export function IconPicker({
  value,
  onChange,
  label = "素材",
  iconOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(readIconFilters);
  const [recent, setRecent] = useState<string[]>(readRecentIcons);
  const { query, category, style } = filters;
  function filter(patch: Partial<IconFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    writeIconFilters(next);
  }
  function select(id: string) {
    setRecent(rememberIcon(id));
    onChange(id);
    setOpen(false);
  }
  const choices = [
    ...Object.entries(characterAssets).map(([id, item]) => ({
      id,
      label: item.label,
      category: item.category,
      style: characterAsset(id)?.pixelated ? "pixel" : "illustration",
      keywords: {
        body: "体 鎧 防具 ローブ",
        head: "頭 兜 帽子 ヘルム",
        feet: "足 靴 ブーツ",
        accessory: "手 マント アクセサリ",
        arm: "腕 武器 盾",
        none: "",
      }[characterAsset(id)?.equipmentPart ?? "none"],
    })),
    ...Object.entries(gameIcons).map(([id, item]) => ({
      id,
      label: item.label,
      category: "icon",
      style: "line",
      keywords: "",
    })),
  ];
  const filtered = choices.filter(
    (item) =>
      (category === "all" || category === item.category) &&
      (style === "all" || style === item.style) &&
      `${item.id} ${item.label} ${item.keywords}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setFilters(readIconFilters());
          setRecent(readRecentIcons());
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={iconOnly ? "icon" : "default"}
          title={label}
          aria-label={`${label}を選ぶ`}
        >
          <GameIcon icon={value} className={iconOnly ? "size-6" : "size-4"} />
          {!iconOnly &&
            (characterAsset(value)?.label ??
              gameIcons[value as keyof typeof gameIcons]?.label ??
              "選択")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ゲーム素材一覧</DialogTitle>
          <DialogDescription className="sr-only">
            名前で絞り込んで素材を選択してください。
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            aria-label="素材を検索"
            placeholder="素材を検索"
            value={query}
            maxLength={200}
            onChange={(e) => filter({ query: e.target.value })}
          />
          <Button
            type="button"
            variant="outline"
            aria-label="絞り込みをリセット"
            onClick={() => filter(defaultIconFilters)}
          >
            リセット
          </Button>
        </div>
        {recent.some((id) => choices.some((choice) => choice.id === id)) && (
          <section aria-label="最近使った素材" className="space-y-2">
            <h3 className="text-sm font-medium">最近使った素材</h3>
            <div className="grid grid-cols-4 gap-2">
              {recent
                .map((id) => choices.find((choice) => choice.id === id))
                .filter((choice) => choice !== undefined)
                .map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    aria-label={`最近使った${choice.label}を選ぶ`}
                    title={choice.label}
                    className="flex min-w-0 flex-col items-center gap-1 rounded border p-2 text-xs hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => select(choice.id)}
                  >
                    <GameIcon icon={choice.id} className="size-10" />
                    <span className="w-full truncate">{choice.label}</span>
                  </button>
                ))}
            </div>
          </section>
        )}
        <fieldset aria-label="素材の種類" className="flex flex-wrap gap-2">
          {[
            ["all", "すべて"],
            ["enemy", "通常敵"],
            ["boss", "ボス"],
            ["equipment", "装備"],
            ["item", "道具・食べ物"],
            ["magic", "魔法"],
            ["scenery", "施設・宝箱"],
            ["icon", "アイコン"],
          ].map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={category === id ? "default" : "outline"}
              aria-pressed={category === id}
              onClick={() => filter({ category: id })}
            >
              {label}
            </Button>
          ))}
        </fieldset>
        <fieldset aria-label="絵柄" className="flex flex-wrap gap-2">
          {[
            ["all", "全絵柄"],
            ["illustration", "イラスト"],
            ["pixel", "ドット絵"],
            ["line", "線画"],
          ].map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={style === id ? "default" : "outline"}
              aria-pressed={style === id}
              onClick={() => filter({ style: id })}
            >
              {label}
            </Button>
          ))}
        </fieldset>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={value === item.id}
              onClick={() => {
                select(item.id);
              }}
              className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border p-2 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary"
            >
              <GameIcon
                icon={item.id}
                className={item.category === "icon" ? "size-8" : "size-20"}
              />
              {item.label}
            </button>
          ))}
        </div>
        {!filtered.length && (
          <p className="text-sm text-muted-foreground">
            該当する素材がありません。絞り込みをリセットしてください。
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          ドット絵：
          <a
            href="https://opengameart.org/content/dungeon-crawl-32x32-tiles"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Dungeon Crawl（CC0）
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
