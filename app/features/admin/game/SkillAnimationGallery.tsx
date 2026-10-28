import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import SkillEffect from "~/features/game/SkillEffect";
import {
  playSkillSound,
  resolveSkillSound,
  stopBattleSounds,
} from "~/features/game/battleSound";
import {
  type SkillAnimation,
  type SkillDefinition,
  type SkillSound,
  animationLabels,
  soundLabels,
} from "~/features/game/catalog";
import { spriteAsset } from "~/features/game/effectAssets";
import { soundAssets } from "~/features/game/soundAssets";
import useSkillPresentation from "~/features/game/useSkillPresentation";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";

function Poster({ animation }: { animation: SkillAnimation }) {
  const sprite = spriteAsset(animation);
  return sprite ? (
    <img
      src={sprite.poster}
      alt=""
      loading="lazy"
      className="size-full object-contain"
    />
  ) : animation === "none" ? (
    <span className="text-slate-400">—</span>
  ) : (
    <SkillEffect animation={animation} preview still />
  );
}

export default function SkillAnimationGallery({
  skill,
  onChange,
  disabled = false,
}: {
  skill: SkillDefinition;
  onChange: (selection: {
    animation: SkillAnimation;
    sound: SkillSound;
  }) => void;
  disabled?: boolean;
}) {
  const value = skill.animation ?? "none";
  const soundValue = skill.sound ?? "auto";
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SkillAnimation>("none");
  const [sound, setSound] = useState<SkillSound>("auto");
  const [playing, setPlaying] = useState<{ id: SkillAnimation; key: number }>();
  const [audition, setAudition] = useState(false);
  const presentationReady = useSkillPresentation(
    audition ? undefined : playing?.key,
    { ...skill, animation: selected, sound },
    true,
  );
  const resolved = resolveSkillSound({ ...skill, animation: selected, sound });
  useEffect(() => stopBattleSounds, []);
  const changeOpen = (next: boolean) => {
    stopBattleSounds();
    setPlaying(undefined);
    if (next) {
      setSelected(value);
      setSound(soundValue);
      setPlaying(undefined);
    }
    setOpen(next);
  };
  const preview = (
    animation: SkillAnimation,
    nextSound: SkillSound,
    soundOnly = false,
  ) => {
    stopBattleSounds();
    setAudition(soundOnly);
    setPlaying((p) => ({ id: animation, key: (p?.key ?? 0) + 1 }));
    if (soundOnly) playSkillSound({ ...skill, animation, sound: nextSound });
  };
  const soundTile = (id: SkillSound) => (
    <button
      key={id}
      type="button"
      aria-label={`${soundLabels[id]}のSEを試聴`}
      aria-pressed={sound === id}
      className="flex min-w-0 items-center gap-2 rounded-lg border p-2 text-left text-sm hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/10"
      onClick={() => {
        setSound(id);
        preview(selected, id, true);
      }}
    >
      <Volume2 className="size-4 shrink-0" aria-hidden="true" />
      <span>{soundLabels[id]}</span>
    </button>
  );
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={`${skill.name}の演出を選ぶ`}
        >
          {animationLabels[value]} · {soundLabels[soundValue]}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[min(56rem,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] w-[min(80rem,calc(100vw-2rem))] max-w-none flex-col sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{skill.name}の演出</DialogTitle>
          <DialogDescription>
            映像とSEを選び、組み合わせて再生できます。
          </DialogDescription>
        </DialogHeader>
        <div className="flex shrink-0 items-center gap-4 rounded-lg border p-2">
          <div
            aria-label="組み合わせプレビュー"
            className="relative isolate flex size-24 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-950"
          >
            {playing &&
            (audition || presentationReady) &&
            selected !== "none" ? (
              <SkillEffect key={playing.key} animation={selected} preview />
            ) : (
              <Poster animation={selected} />
            )}
          </div>
          <div className="min-w-0 space-y-2 text-sm">
            <p className="break-words">
              {animationLabels[selected]} · SE：
              {sound === "auto"
                ? `自動（${resolved ? soundLabels[resolved] : "なし"}）`
                : soundLabels[sound]}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => preview(selected, sound)}
            >
              組み合わせを再生
            </Button>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-rows-2 gap-4 md:grid-cols-[2fr_1fr] md:grid-rows-1">
          <section className="flex min-h-0 min-w-0 flex-col gap-2">
            <h3 className="text-sm font-semibold">映像</h3>
            <div
              className="grid min-h-0 flex-1 auto-rows-max grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4"
              aria-label="演出素材一覧"
            >
              {Object.entries(animationLabels).map(([key, label]) => {
                const id = key as SkillAnimation;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-label={`${label}をプレビュー`}
                    aria-pressed={selected === id}
                    title={
                      spriteAsset(id)
                        ? `${spriteAsset(id)?.author} / ${spriteAsset(id)?.license}`
                        : undefined
                    }
                    className="flex min-w-0 flex-col items-center gap-2 rounded-lg border p-2 text-sm hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/10"
                    onClick={() => {
                      setSelected(id);
                      preview(id, sound);
                    }}
                  >
                    <div
                      className="relative isolate flex size-24 max-w-full shrink-0 items-center justify-center overflow-hidden rounded bg-slate-950"
                      onAnimationEnd={() =>
                        setPlaying((p) => (p?.id === id ? undefined : p))
                      }
                    >
                      {playing?.id === id &&
                      (audition || presentationReady) &&
                      id !== "none" ? (
                        <SkillEffect key={playing.key} animation={id} preview />
                      ) : (
                        <Poster animation={id} />
                      )}
                    </div>
                    <span className="max-w-full truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="flex min-h-0 min-w-0 flex-col gap-2">
            <h3 className="text-sm font-semibold">
              SE（{Object.keys(soundAssets).length}種類）
            </h3>
            <div
              className="min-h-0 flex-1 space-y-4 overflow-y-auto"
              aria-label="SE素材一覧"
            >
              <div className="grid grid-cols-2 gap-2">
                {soundTile("auto")}
                {soundTile("none")}
              </div>
              {[...new Set(Object.values(soundAssets).map((a) => a.group))].map(
                (group) => (
                  <section key={group} className="space-y-2" aria-label={group}>
                    <h4 className="text-xs text-muted-foreground">{group}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(soundAssets)
                        .filter(([, asset]) => asset.group === group)
                        .map(([id]) => soundTile(id as SkillSound))}
                    </div>
                  </section>
                ),
              )}
            </div>
          </section>
        </div>
        <DialogFooter className="items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => changeOpen(false)}
          >
            閉じる
          </Button>
          <Button
            type="button"
            onClick={() => {
              onChange({ animation: selected, sound });
              changeOpen(false);
            }}
          >
            この演出を使う
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
