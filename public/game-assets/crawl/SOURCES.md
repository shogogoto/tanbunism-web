# Dungeon Crawl sprites

60 unmodified 32 × 32 PNG sprites selected from **Dungeon Crawl 32x32 tiles**.
The original directory structure and filenames are retained. The imported files
are registered in `app/features/game/crawlAssets.ts`.

- Source: https://opengameart.org/content/dungeon-crawl-32x32-tiles
- Archive: https://opengameart.org/sites/default/files/crawl-tiles%20Oct-5-2010.zip
- Maintainer: Chris Hamons; artwork by the Dungeon Crawl Stone Soup art contributors.
- License: CC0 1.0 Universal. The archive's original `LICENSE.txt`, `README.txt`
  and artist/sign-off list `utility/Filtered List.txt` are included unchanged.
- Retrieved: 2026-10-16.
- Modifications: none. Rendered using CSS `image-rendering: pixelated`.

15 equipment sprites added on 2026-11-03: leather/chain/plate armour, robe,
four helmets/hats, three boots, gloves/gauntlets and two cloaks.
Reproduce this addition with `node scripts/import-equipment-assets.mjs /path/to/crawl-tiles.zip`.

The categories in the picker describe suggested uses, not game rules. Choosing a
shield image does not implement defensive equipment, and choosing a spell image
does not add an animation. Existing definitions are not automatically replaced.
