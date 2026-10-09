import { Bug, Ghost, Skull } from "lucide-react";

// Stable appearance for the same resource and encounter, without remote assets.
export default function EnemyAvatar({ identity }: { identity: string }) {
  const seed = [...identity].reduce(
    (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
  const Icon = [Ghost, Bug, Skull][seed % 3];
  const color = [
    "text-rose-400 bg-rose-500/10",
    "text-violet-400 bg-violet-500/10",
    "text-amber-400 bg-amber-500/10",
  ][Math.floor(seed / 3) % 3];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-10 items-center justify-center rounded-xl ${color}`}
    >
      <Icon className="size-7" />
    </span>
  );
}
