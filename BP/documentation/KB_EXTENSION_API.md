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

Capabilities: `mixing_bowl`, `oven`, `proofing`, `decorating`, `espresso`, `pour_over`, `shaker`,
`ingredient_tags`, `fuels`, `food_effects`, `bulk`, `whisk_tag`, `frother_tag`, `mold_tag`, and since 1.1:
`byproducts`, `piping_bag_tag`, `query_ingredient`, `caffeine_adjust`, `dessert_component`, `display_rules`,
`guidebook_live`. Check a capability before using a 1.1 feature.

## Rules

- `api` must be `1`. A breaking change will use a new number; v1 stays compatible.
- Registration is idempotent by `kind + source + recipe.id`; re-sending replaces your copy.
- Nothing is persisted: register again every world load. Removing your pack removes your content.
- Built-in Baking recipes win over extension recipes for the same input.
- Extension entries are ordered by registration key, never by script load order.
- Invalid payloads are rejected with a content-log warning and change nothing.
- One Script Event message is limited to 2048 characters: send one registration per message,
  or use the bulk transfer below.

## Ingredient specs

Anywhere a recipe takes an ingredient you may write:

- an exact id: `"minecraft:egg"`
- a series tag: `"#kaleidoscope:egg"` (tag list: `docs/PROPOSAL.zh-TW.md` §5.2)
- in slot lists, an array meaning "any one of these": `["minecraft:water_bucket", "#kaleidoscope:milk"]`

An item matches a tag if its item JSON declares the tag in `minecraft:tags`, or if any pack
registered it at runtime (`register_ingredient`).

Liquids in buckets / bottles (`milk_bucket`, `water_bucket`, `honey_bottle`, Baking's tea bases,
syrups, jams, espresso in a mug) hand their container straight back when put into a station.

## `kaleidoscope_baking:register_recipe`

Payload: `{ "api": 1, "kind": "<kind>", "source": "my_addon", "recipe": { ... } }`.
Every recipe has `id` (namespaced, unique in your pack), `result` and optional `count` (default 1).

| kind | Station | Recipe fields |
|------|---------|---------------|
| `mixing_bowl` | Mixing bowl | `ingredients` (1–9 slots, shapeless), `whisks` (strokes, default 4), `tool` (spec, default `#kaleidoscope_baking:whisk`; frothing uses `#kaleidoscope_baking:frother`) |
| `oven` | 3×3×3 oven | `input`, `mold` (optional spec; returned after baking), `time` (ticks), `perfectWindow` (ticks before burning), `burntResult` (optional), `roast` (optional `[light, medium, dark]` results — the perfect window is split in thirds) |
| `proofing` | Proofing basket | `input`, `time` (ticks at normal warmth; heat nearby ×2, snow/ice ×0.5). Result count is per input item. |
| `decorating` | Decorating stand | `base` (spec), `layers` (1–6 slots, **in order**). A recipe that is a prefix of a longer one is finished with an empty hand. |
| `espresso` | Espresso machine (redstone powered) | `input` (ground coffee spec), `additive` (optional spec), `carrier` (cup taken from the inventory, e.g. `kaleidoscope_baking:coffee_mug`), `time` |
| `pour_over` | Pour-over stand | `input`, `carrier` |
| `shaker` | Drink shaker | `ingredients` (1–6 slots), `shakes` (default 5), `carrier` (e.g. `kaleidoscope_baking:takeaway_cup`), `temperature` (`cold` / `hot` / `any`), `allowSweetness` / `allowIce` (default true). Drinks with sweetness/ice choices should have `max_stack_size: 1`. |

Examples:

```js
const send = (kind, recipe) => system.sendScriptEvent("kaleidoscope_baking:register_recipe",
  JSON.stringify({ api: 1, kind, source: "my_addon", recipe }));

send("mixing_bowl", { id: "my_addon:mixing/herb_dough", ingredients: ["#kaleidoscope:flour", "#kaleidoscope:herb", "kaleidoscope_baking:yeast"], whisks: 5, result: "my_addon:herb_dough" });
send("proofing", { id: "my_addon:proofing/herb_dough", input: "my_addon:herb_dough", result: "my_addon:proofed_herb_dough", time: 1200 });
send("oven", { id: "my_addon:oven/herb_bread", input: "my_addon:proofed_herb_dough", mold: "kaleidoscope_baking:baking_tray", result: "my_addon:herb_bread", count: 2, time: 450, perfectWindow: 250 });
send("decorating", { id: "my_addon:decorating/jelly_cake", base: "kaleidoscope_baking:sponge_cake", layers: ["kaleidoscope_baking:whipped_cream", "my_addon:grass_jelly"], result: "my_addon:jelly_cake" });
send("espresso", { id: "my_addon:espresso/honey_latte", input: "#kaleidoscope:ground_coffee", additive: "minecraft:honey_bottle", result: "my_addon:honey_latte", carrier: "kaleidoscope_baking:coffee_mug", time: 120 });
send("shaker", { id: "my_addon:shaker/grass_jelly_milk_tea", ingredients: ["#kaleidoscope:tea_base", "#kaleidoscope:milk", "my_addon:grass_jelly"], result: "my_addon:grass_jelly_milk_tea", carrier: "kaleidoscope_baking:takeaway_cup" });
```

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

## `kaleidoscope_baking:register_food_effect`

What happens when a player finishes eating / drinking your item (also applied when a placed
dessert is eaten slice by slice):

```js
{
  "api": 1, "source": "my_addon", "id": "my_addon:grass_jelly_milk_tea",
  "category": "drink",            // "drink" | "dessert" | "food" — drink + dessert within 30 s = afternoon-tea bonus
  "caffeine": 0,                  // added to the caffeine level (3-4 palpitations, 5+ severe)
  "reduces": 1,                   // removed from the caffeine level (calming drinks)
  "effects": [["regeneration", 5, 0]],   // [effect id, seconds, amplifier]
  "clear": ["nausea"]             // effects removed
}
```

Built-in Baking data wins for Baking's own ids. Items with `kaleidoscope:coffee` should declare caffeine.

## Bulk transfer

Send many registrations as one chunked transfer:

```
kaleidoscope_baking:bulk_begin  {"api":1,"source":"my_addon","id":"all","chunks":N}
kaleidoscope_baking:bulk_chunk  "my_addon\nall\n<index>\n<chunk text>"      (N times, index 0..N-1)
kaleidoscope_baking:bulk_end    {"api":1,"source":"my_addon","id":"all"}
```

The joined chunk text must be JSON: `{"api":1,"registrations":[{"event":"kaleidoscope_baking:register_recipe","payload":{...}}, ...]}`.
`event` may be any of the four `register_*` events. Max 256 chunks; keep each message under 2048 characters.

## Item tags (no script needed)

| Tag | Effect |
|-----|--------|
| `kaleidoscope_baking:whisk` | Works as a whisk on the mixing bowl. |
| `kaleidoscope_baking:frother` | Works as a milk frother on the mixing bowl. |
| `kaleidoscope_baking:mold` | Marks a baking mold (informational). |
| `kaleidoscope_baking:cup` | Marks a drink container (informational). |
| `kaleidoscope_cookery:kitchen_knife` | (Cookery's tag) cuts slices off placed desserts and strips cinnamon bark. |
| `kaleidoscope:*` | Series ingredient tags; makes your item usable in any `#kaleidoscope:*` slot. |

## Minimal compatibility script

```js
import { system } from "@minecraft/server";

let done = false;
system.afterEvents.scriptEventReceive.subscribe(ev => {
  if (ev.id !== "kaleidoscope_baking:api_ready" || done) return;
  done = true;
  system.sendScriptEvent("kaleidoscope_baking:register_recipe", JSON.stringify({
    api: 1, kind: "oven", source: "my_addon",
    recipe: { id: "my_addon:oven/fish_pie", input: "my_addon:raw_fish_pie", mold: "kaleidoscope_baking:pie_tin", result: "my_addon:fish_pie", time: 500 }
  }));
});
system.run(() => system.sendScriptEvent("kaleidoscope_baking:api_ping", "my_addon"));
```

## 1.1 additions

### By-products

`mixing_bowl`, `oven`, `proofing`, `decorating`, `espresso`, `pour_over` and `shaker` recipes accept an
optional `byproduct` item id, handed out once when the recipe completes (Baking uses it for coffee
grounds and fruit pulp). Currently the espresso machine, pour-over stand and shaker hand it out.

### Piping bag tool

`mixing_bowl` recipes may set `"tool": "#kaleidoscope_baking:piping_bag"`; any item tagged
`kaleidoscope_baking:piping_bag` works.

### `kaleidoscope_baking:query_ingredient`

```js
{ "api": 1, "id": "minecraft:egg", "reply": "my_addon:ingredient_info" }   // reply is optional
```

Baking answers on `reply` (default `kaleidoscope_baking:ingredient_info`) with
`{ "api": 1, "id": "minecraft:egg", "tags": ["kaleidoscope:egg"] }` — runtime / built-in tags plus the
item's own `kaleidoscope:*` JSON tags.

### `kaleidoscope_baking:caffeine_adjust`

```js
{ "api": 1, "player": "<player name or id>", "delta": -2 }   // -10..10, never below 0
```

### `kaleidoscope_baking:register_display_rule`

```js
{ "api": 1, "source": "my_addon", "id": "my_addon:soup_pot", "mode": "deny" }   // "allow" | "deny"
```

Decides whether an item may go into Baking's tea tray, bread display and pastry case. Without a
rule, items with Baking food values, common vanilla foods and Cookery items are allowed.

### Public block component `kaleidoscope_baking:dessert`

Your own whole-cake block can be eaten slice by slice with Baking's logic (knife slices, effects,
afternoon tea). Give the block a `kaleidoscope_baking:bites` integer state `0..slices-1` and:

```json
"kaleidoscope_baking:dessert": { "slices": 4, "nutrition": 3, "saturation": 0.5, "slice_item": "my_addon:cake_slice" }
```

Change the geometry per `bites` value with permutations, like Baking's own desserts.

### Guidebook

Recipes you register after the world loaded now appear in Cookery's guidebook "Baking" tab too
(Baking republishes 2 s after the last registration). No action needed.

## Series packs (漁歌 / 豐收 / 草本 / 樂牧)

When the same thing exists in Baking and in a series pack, the lead pack's version wins
(herbs → 草本, fruits/crops → 豐收, crafting materials → 樂牧, baked goods → Baking). Baking
handles this itself from `BP/scripts/compat/series.data.js`; series packs only need to use their
real ids there (or tell the Baking team) and, ideally, tag their items with `kaleidoscope:*`.
Marking an entry `confirmed: true` lets `node tools/gen_compat_recipes.mjs` generate 1:1 swap recipes.

Baking also sends two of its by-products into the series packs' own APIs when they announce
themselves with `api_ready` (`BP/scripts/compat/reverse.data.js`, once per world session):

| To | Event | Message | Effect |
| --- | --- | --- | --- |
| 漁歌 (capability `bait`) | `kaleidoscope_fishing:register_bait` | `{"api":1,"source":"kaleidoscope_baking","baits":[{"id":"kaleidoscope_baking:bread_crumbs","biteFactor":0.8}]}` | bread crumbs are a bait |
| 樂牧 (capability `register_feed`) | `kaleidoscope_ranching:register_feed` | `{"item":"kaleidoscope_baking:fruit_pulp","kind":"veg","units":1}` | fruit pulp goes in the trough; pigs and rabbits eat it |

豐收 and 草本 have no API for compost or fertiliser, so nothing is sent to them: fruit pulp, bread
crumbs and coffee grounds go in the vanilla composter, and coffee grounds fertilise Baking's own plants.
