# Kaleidoscope Baking Script Architecture

**Role:** ADDON (to Kaleidoscope Cookery) + HOST (for the Kaleidoscope Baking API)

Same rules as Cookery's `scripts/ARCHITECTURE.md`: host code never contains optional-addon
identifiers; addons register into hosts through Script Events and item tags.

## Folders

- `api/` — Public Baking API and the pure rules behind it.
  - `registry.js`, `ingredients.js`, `matcher.js`, `ovenLogic.js`, `mixingLogic.js` are **pure**
    (no `@minecraft/*` imports) and are unit-tested in `tests/`.
  - `bus.js` is the Script Event transport for the public API.
- `custom_components/` — Block components (oven, mixing bowl).
- `data/` — Built-in recipes, fuels, ingredient tag aliases.
- `integrations/` — Talking to hosts we depend on (Cookery). Public events only.
- `compat/` — Optional-pack data (漁歌 / 豐收 / 草本 / 樂牧). Empty until their ids are known.
- `utils/` — Helpers. `ids.js` and `ovenGeometry.js` are pure; `runtime.js` wraps Bedrock APIs.

## Rules

- Keep pure modules pure, so `npm test` covers recipe matching and station state machines.
- `utils/ovenGeometry.js` is the single source of truth for the 3x3x3 oven layout; the block JSON
  is generated from it by `tools/gen_oven_block.mjs`. Edit the generator, not `BP/blocks/oven.json`.
- Never silently delete player items. Station teardown spills contents; liquids whose container
  was already returned are the only thing allowed to "spill" away.
- Use `// ##` for notes on non-obvious Bedrock behaviour.
