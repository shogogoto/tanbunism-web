# Battle sound effects

These are third-party audio assets, not our former runtime oscillator/noise
presets. The original packs below are CC0; the Willosuna additions have their
own royalty-free license. Credits and per-pack terms are retained here.

## Willosuna spell sounds (2026-10-25, royalty-free, not CC0)

- Source: [Magic Spells SFX Lite](https://willosuna.itch.io/magic-spells-sfx-lite),
  `magic-spells-sfx-lite.zip`, version 2.0. Original mono 44.1kHz 16-bit WAVs.
- IDs `willo_<name>` map to `wav/<name>_01.wav` in the original archive.
  Selected names: `cast`, `impact`, `fire_cast`, `fire_impact`, `ice_cast`,
  `ice_shatter`, `zap`, `thunder`, `water_cast`, `water_impact`, `wind`, `poison`,
  `shadow`, `heal`, `buff`, `debuff`, `mana`, `dispel`, `arcane_blast`, `rune`.
- Original license is preserved in `WILLOSUNA-LICENSE.txt`. Commercial/personal
  game use and processing are allowed; redistribution as a sound pack/library
  and Content ID registration are prohibited. No original ZIP or full library
  is distributed; selected converted sounds are embedded in this game.
- The author describes these as procedural audio, not recordings or AI output.
  This project did not synthesize or pitch-shift them.
- Run the existing importer with sources extracted under `sfx/` and only the
  `willo_*` IDs as its third argument. It preserves all other sound files.
- Preserve each complete non-silent one-shot; normalize to 85% peak, apply 5ms
  edge fades and convert to 32kHz mono 16-bit WAV. No forced mid-phrase cuts.
  The short discharge is about 0.67s; thunder is about 1.17s after boundary trim.
- The six new `willo_*` visuals default to their same-name sounds. Starsteel's
  ice/fire projectiles use the corresponding casts, and its thunder sphere uses
  the short discharge. Existing visuals and their defaults remain unchanged.

## Original CC0 sounds

Downloaded 2026-10-17; lightning replacements downloaded 2026-10-18. These works
allow use under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

| Local file | Original file | Author / source |
| --- | --- | --- |
| impact.wav | punch_1.ogg (downloaded as punch.ogg) | Delta12 Studio, [Rpg Sound Effect Pack](https://opengameart.org/content/rpg-sound-effect-pack) |
| slash.wav | blade_01.ogg | rubberduck, [80 CC0 RPG SFX](https://opengameart.org/node/86018) |
| fire.wav | spell_fire_01.ogg | rubberduck, same pack |
| debuff.wav | spell_02.ogg | rubberduck, same pack |
| poison.wav | creature_slime_01.ogg | rubberduck, same pack (slime sound used for poison) |
| curse.wav | dark_magic/fout-02.flac | qubodup, [3 dark magic spells](https://opengameart.org/content/3-dark-magic-spells) |
| heal.wav | Cure1.wav | Someoneman, [Cure Magic](https://opengameart.org/content/cure-magic) |
| buff.wav | Cure2.wav | Someoneman, same pack |
| lightning.wav | crackleelectricityloop.wav, 0–0.7 s (or source end), 25 ms fades | faxcorp, [Electricity Game Sound Pack](https://opengameart.org/content/electricity-game-sound-pack) |
| lightning_2.wav | snaploop.wav, 0–0.55 s, 30 ms fades | faxcorp, same source |
| lightning_storm.wav | snaploop.wav, 0.55–1.5 s (or source end), 40 ms fades | faxcorp, same source |
| slash_2.wav, slash_3.wav | blade_02.ogg, blade_03.ogg | rubberduck, same RPG pack |
| fire_2.wav … fire_7.wav | spell_fire_02.ogg … spell_fire_07.ogg | rubberduck, same RPG pack |
| heal_2.wav … heal_7.wav | Cure3.wav … Cure8.wav | Someoneman, same Cure Magic pack |
| poison_2.wav … poison_4.wav | creature_slime_02.ogg … creature_slime_04.ogg | rubberduck, same RPG pack |
| magic.wav | spell_01.ogg | rubberduck, same RPG pack |
| metal.wav, metal_2.wav | metal_01.ogg, metal_02.ogg | rubberduck, same RPG pack |
| coins.wav | item_coins_01.ogg | rubberduck, same RPG pack |
| stones.wav | stones_01.ogg | rubberduck, same RPG pack |
| fire_burst.wav, fire_burst_2.wav, fire_burst_3.wav | Fire Spell Impact 4.wav, 5.wav, 1.wav | lentikula, [Basic Spell Impacts](https://lentikula.itch.io/freecc0-basic-spell-impacts-sfx); original 48 kHz / 24-bit recordings and CC0 material |
| ice.wav, ice_2.wav, ice_3.wav, ice_4.wav, ice_5.wav | Ice Spell Impact 5.wav, 4.wav, 3.wav, 1.wav, 2.wav | lentikula, same pack |
| water.wav, water_2.wav, water_3.wav, water_4.wav, water_5.wav | Water Spell Impact 4.wav, 1.wav, 2.wav, 3.wav, 5.wav | lentikula, same pack |
| earth.wav | Earth Element Magic Spell_3.ogg (saved as earth.ogg) | qubodup, [Earth Element Magic Spell](https://opengameart.org/content/earth-element-magic-spell) |
| dark_2.wav, dark_3.wav | dark_magic/fout-01.flac, fout-03.flac | qubodup, same dark magic pack |
| drain.wav | qubodup-PowerDrain/ogg/qubodup-PowerDrain.ogg | qubodup, [Energy Drain](https://opengameart.org/content/energy-drain); author's 2024-06-23 CC0 relicensing supersedes the old archive notice |
| teleport.wav | teleport.wav | Ogrebane, [Teleport Spell](https://opengameart.org/content/teleport-spell) |
| chime.wav, chime_2.wav, chime_3.wav, chime_4.wav | magical_1_0.ogg, magical_2.ogg, magical_3.ogg, magical_4.ogg (saved as chime.ogg, chime2.ogg, chime3.ogg, chime4.ogg) | JaggedStone, [Magic Spell SFX](https://opengameart.org/content/magic-spell-sfx) |
| wind.wav | sand-spell.flac (saved as sand.flac) | qubodup, [Sand spell](https://opengameart.org/content/sand-spell); mouth-recorded whoosh |
| explosion.wav, explosion_2.wav | explosion_5.ogg, explosion1_3.ogg (saved as explosion.ogg, explosion2.ogg) | Delta12 Studio, same RPG pack |
| zap.wav, zap_2.wav, magic_rise.wav | zap1.mp3, zap2.mp3, powerUp2.mp3 | Kenney, [63 Digital sound effects](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc); pitched magic bolts, not lightning defaults |

Direct downloads:

- https://opengameart.org/sites/default/files/80-CC0-RPG-SFX_0.zip
- https://opengameart.org/sites/default/files/curemagic.zip
- https://opengameart.org/sites/default/files/punch_1.ogg
- https://opengameart.org/sites/default/files/crackleelectricityloop.wav
- https://opengameart.org/sites/default/files/snaploop.wav
- https://opengameart.org/sites/default/files/Digital_SFX_Set.zip
- https://lentikula.itch.io/freecc0-basic-spell-impacts-sfx (free download, Basic Spell Impacts.zip)
- https://opengameart.org/sites/default/files/dark_magic.7z
- https://opengameart.org/sites/default/files/qubodup-PowerDrain.7z
- https://opengameart.org/sites/default/files/Earth%20Element%20Magic%20Spell_3.ogg
- https://opengameart.org/sites/default/files/teleport.wav
- https://opengameart.org/sites/default/files/magical_1_0.ogg
- https://opengameart.org/sites/default/files/magical_2.ogg
- https://opengameart.org/sites/default/files/magical_3.ogg
- https://opengameart.org/sites/default/files/magical_4.ogg
- https://opengameart.org/sites/default/files/sand-spell.flac
- https://opengameart.org/sites/default/files/explosion_5.ogg
- https://opengameart.org/sites/default/files/explosion1_3.ogg

## Reproduction

Extract the RPG archive under `rpg/`, Cure Magic under `cure/`, Basic Spell
Impacts under `impacts/` (retaining its four named subfolders), and Digital SFX
under `digital/`. Extract the two 7z archives retaining their `dark_magic/` and
`qubodup-PowerDrain/` directories. Save individual files with the local source
names shown in the table above.
Run `node scripts/import-skill-sounds.mjs /path/to/extracted-sources` from the
repository root. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if necessary.
An optional third argument selects comma-separated sound IDs for partial imports.

Conversion: decode to 32 kHz mono PCM, trim boundary silence, normalize peaks to
85%, add 5 ms boundary fades, encode 16-bit WAV for browser compatibility. Clips
retain the complete non-silent one-shot rather than cutting through a phrase.
Lightning instead uses short bursts from the author's electricity crackle and
snap loops, with 25–40 ms edge fades to avoid clicks. The previous long discharge,
Tesla-generator, and pitched Zap choices were replaced after user feedback on
duration and timbre. Pitched Kenney Zaps are retained as magic bolts in a separate
group, not as lightning. Existing IDs remain compatible. No newly synthesized
tones or pitch shifts are added. Selection is based on author descriptions and
technical playback checks, not a claim of human listening verification.
The game hosts these files locally and never requests the source sites.

## Defaults

Every visual animation has an explicit default in
`app/features/game/battleSound.ts` (`animationSounds`). `auto` prioritizes this
visual pairing, with a skill-category fallback only when no visual is selected.
Explicit sound selections and `none` remain overrides. The picker shows the
resolved default so that "auto" is not an unexplained choice.
