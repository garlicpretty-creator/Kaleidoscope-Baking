# Kaleidoscope Baking Script Architecture

**Role:** ADDON (to Kaleidoscope Cookery) + HOST (for the Kaleidoscope Baking API)

Same rules as Cookery's `scripts/ARCHITECTURE.md`: host code never contains optional-addon
identifiers; addons register into hosts through Script Events and item tags.

## Folders

- `api/` — Public Baking API and the pure rules behind it. `registry.js`, `ingredients.js`,
  `matcher.js`, `ovenLogic.js`, `mixingLogic.js`, `stationLogic.js`, `effects.js`, `chunks.js`,
  `compat.js` are **pure** (no `@minecraft/*` imports) and unit-tested. `bus.js` is the transport.
- `custom_components/` — Block components: oven (3×3×3), mixing bowl, proofing basket,
  decorating stand, espresso machine, pour-over stand, drink shaker, placeable desserts,
  plants / trees / bark / herb planter.
- `events/` — Eating & drinking (caffeine, effects, afternoon tea), seeds from grass.
- `data/` — Built-in recipes, fuels, effects, ingredient tag aliases.
  `data/generated/content.js` is produced by `tools/gen_content.py` — do not edit by hand.
- `integrations/` — Cookery host (public events only): station recipes, guidebook tab.
- `compat/` — Series packs (漁歌 / 豐收 / 草本 / 樂牧). `series.data.js` holds the lead-pack table
  (its header says which ids are checked against the real packs); `reverse.data.js` holds what
  Baking registers with Fishing (bait) and Ranching (feed); `index.js` applies the lead-pack rules
  at runtime and sends those registrations.
- `utils/` — Helpers. `ids.js` and `ovenGeometry.js` are pure; `runtime.js`, `stations.js`,
  `sendQueue.js` wrap Bedrock APIs.

## Generated files

- Items, simple blocks, loot tables, worldgen, crafting, language files, texture tables,
  geometry and placeholder art come from `tools/content.py` + `tools/messages.py` via
  `python3 tools/gen_content.py`.
- `BP/blocks/oven.json` comes from `node tools/gen_oven_block.mjs` (layout from `utils/ovenGeometry.js`).

## Rules

- Keep pure modules pure, so `npm test` covers recipe matching and station state machines.
- Every custom block component used by block JSON must be listed in `main.js` (validator checks).
- Never silently delete player items. Station teardown spills contents; liquids whose container
  was already returned are the only thing allowed to "spill" away.
- Large Script Event bursts go through `utils/sendQueue.js`.
- Use `// ##` for notes on non-obvious Bedrock behaviour.
