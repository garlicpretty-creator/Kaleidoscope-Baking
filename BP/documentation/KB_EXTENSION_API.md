# Kaleidoscope Baking Extension API v1

Other packs add content to Baking **without importing Baking's scripts and without a manifest
dependency on Baking**. Everything goes through Bedrock Script Events (JSON messages) and item tags.
The style deliberately mirrors Kaleidoscope Cookery's API, so if you know one you know both.

## Handshake

| Event | Direction | Payload |
|-------|-----------|---------|
| `kaleidoscope_baking:api_ping` | you → Baking | anything (e.g. your namespace) |
| `kaleidoscope_baking:api_ready` | Baking → you | `{ "api": 1, "capabilities": [...], "ingredientApi": 1 }` |

Baking broadcasts `api_ready` five times after the world loads. Listen for it **and** send a ping
after your own startup; registering twice is harmless.

Current capabilities: `oven`, `mixing_bowl`, `ingredient_tags`, `fuels`, `whisk_tag`, `mold_tag`.

## Rules

- `api` must be `1`. A breaking change will use a new number; v1 stays compatible.
- Registration is idempotent by `kind + source + recipe.id`; re-sending replaces your copy.
- Nothing is persisted: register again every world load. Removing your pack removes your recipes.
- Built-in Baking recipes win over extension recipes for the same input.
- Extension entries are ordered by registration key, never by script load order.
- Invalid payloads are rejected with a content-log warning and change nothing.
- One Script Event message is limited to 2048 characters: send one recipe per message.

## Ingredient specs

Anywhere a recipe takes an ingredient you may write either:

- an exact id: `"minecraft:egg"`
- a series tag: `"#kaleidoscope:egg"` (see `docs/PROPOSAL.zh-TW.md` §5.2 for the tag list)

An item matches a tag if its item JSON declares the tag in `minecraft:tags`, or if any pack
registered it at runtime (below).

## `kaleidoscope_baking:register_recipe`

### Mixing bowl

```js
system.sendScriptEvent("kaleidoscope_baking:register_recipe", JSON.stringify({
  api: 1, kind: "mixing_bowl", source: "my_addon",
  recipe: {
    id: "my_addon:mixing/herb_dough",
    ingredients: ["#kaleidoscope:flour", "#kaleidoscope:herb", ["minecraft:water_bucket", "#kaleidoscope:milk"]],
    whisks: 5,            // whisk strokes needed (default 4)
    result: "my_addon:herb_dough",
    count: 1
  }
}));
```

- 1–9 ingredients, shapeless. A slot may be an array meaning "any one of these".
- Buckets / bottles hand their container back immediately (milk, water, lava, honey).

### Oven

```js
system.sendScriptEvent("kaleidoscope_baking:register_recipe", JSON.stringify({
  api: 1, kind: "oven", source: "my_addon",
  recipe: {
    id: "my_addon:oven/herb_focaccia",
    input: "my_addon:herb_dough",              // id or #tag
    mold: "kaleidoscope_baking:baking_tray",   // optional; id or #tag; returned after baking
    result: "my_addon:herb_focaccia",
    count: 1,
    time: 400,             // ticks until done
    perfectWindow: 200,    // ticks it can stay in before burning
    burntResult: "kaleidoscope_baking:burnt_food"   // optional
  }
}));
```

The oven has 4 slots. Each slot bakes independently while the firebox has fuel.

## `kaleidoscope_baking:register_ingredient`

For items that cannot carry a tag in their own JSON (vanilla items, other packs' items):

```js
{ "api": 1, "source": "my_addon", "id": "minecraft:cod", "tags": ["kaleidoscope:fish", "kaleidoscope:raw_fish"] }
```

## `kaleidoscope_baking:register_fuel`

```js
{ "api": 1, "source": "my_addon", "fuel": { "id": "my_addon:peat", "ticks": 1200 } }
{ "api": 1, "source": "my_addon", "fuel": { "id": "#my_addon:fuel_bricks", "ticks": 800, "returns": "minecraft:bucket" } }
```

Exact ids beat tag entries. `returns` is given back to the player after the fuel is used.

## Item tags (no script needed)

| Tag | Effect |
|-----|--------|
| `kaleidoscope_baking:whisk` | The item works as a whisk on the mixing bowl. |
| `kaleidoscope_baking:mold` | Marks an item as a baking mold (for guidebook / future features). |
| `kaleidoscope:*` | Series ingredient tags; makes your item usable in any `#kaleidoscope:*` recipe slot. |

## Minimal compatibility script

```js
import { system } from "@minecraft/server";

const send = (kind, recipe) => system.sendScriptEvent("kaleidoscope_baking:register_recipe",
  JSON.stringify({ api: 1, kind, source: "my_addon", recipe }));

let done = false;
system.afterEvents.scriptEventReceive.subscribe(ev => {
  if (ev.id !== "kaleidoscope_baking:api_ready" || done) return;
  done = true;
  send("oven", { id: "my_addon:oven/fish_pie", input: "my_addon:raw_fish_pie",
                 mold: "kaleidoscope_baking:cake_mold", result: "my_addon:fish_pie", time: 500 });
});
system.run(() => system.sendScriptEvent("kaleidoscope_baking:api_ping", "my_addon"));
```
