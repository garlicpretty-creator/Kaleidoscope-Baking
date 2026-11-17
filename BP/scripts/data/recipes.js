// ## Kaleidoscope script role: Declarative data.
// Built-in Baking recipes. They use the same schema as the public API
// (documentation/KB_EXTENSION_API.md) so built-in and addon recipes share one code path.
// Built-in recipes always win over extension recipes for the same input.

const KB = "kaleidoscope_baking";

export const BUILTIN_MIXING_RECIPES = Object.freeze([
  {
    id: `${KB}:mixing/butter`,
    ingredients: ["#kaleidoscope:milk"],
    whisks: 8,
    result: `${KB}:butter`,
    count: 2
  },
  {
    id: `${KB}:mixing/cake_batter`,
    ingredients: ["#kaleidoscope:flour", "#kaleidoscope:egg", "#kaleidoscope:sweetener", "#kaleidoscope:milk"],
    whisks: 6,
    result: `${KB}:cake_batter`,
    count: 1
  },
  {
    id: `${KB}:mixing/bread_dough`,
    ingredients: ["#kaleidoscope:flour", "#kaleidoscope:flour", "#kaleidoscope:water", "#kaleidoscope:butter"],
    whisks: 4,
    result: `${KB}:bread_dough`,
    count: 1
  },
  {
    id: `${KB}:mixing/cookie_dough`,
    ingredients: ["#kaleidoscope:flour", "#kaleidoscope:butter", "#kaleidoscope:sweetener", "#kaleidoscope:egg"],
    whisks: 4,
    result: `${KB}:cookie_dough`,
    count: 1
  }
]);

export const BUILTIN_OVEN_RECIPES = Object.freeze([
  {
    id: `${KB}:oven/sponge_cake`,
    input: `${KB}:cake_batter`,
    mold: `${KB}:cake_mold`,
    result: `${KB}:sponge_cake`,
    count: 1,
    time: 600,
    perfectWindow: 300
  },
  {
    id: `${KB}:oven/toast_loaf`,
    input: `${KB}:bread_dough`,
    mold: `${KB}:loaf_pan`,
    result: `${KB}:toast_loaf`,
    count: 1,
    time: 500,
    perfectWindow: 300
  },
  {
    id: `${KB}:oven/butter_cookie`,
    input: `${KB}:cookie_dough`,
    mold: `${KB}:baking_tray`,
    result: `${KB}:butter_cookie`,
    count: 6,
    time: 300,
    perfectWindow: 200
  },
  {
    // Cookery's plain dough bakes into a vanilla loaf: a small, useful bridge recipe.
    id: `${KB}:oven/cookery_dough_bread`,
    input: "kaleidoscope_cookery:raw_dough",
    result: "minecraft:bread",
    count: 1,
    time: 400,
    perfectWindow: 300
  },
  {
    id: `${KB}:oven/baked_potato`,
    input: "minecraft:potato",
    result: "minecraft:baked_potato",
    count: 1,
    time: 200,
    perfectWindow: 400
  }
]);

/** Fuel burn time in ticks. Tag entries start with "#". */
export const BUILTIN_FUELS = Object.freeze([
  { id: "minecraft:coal", ticks: 1600 },
  { id: "minecraft:charcoal", ticks: 1600 },
  { id: "minecraft:coal_block", ticks: 16000 },
  { id: "minecraft:blaze_rod", ticks: 2400 },
  { id: "minecraft:dried_kelp_block", ticks: 4000 },
  { id: "minecraft:lava_bucket", ticks: 20000, returns: "minecraft:bucket" },
  { id: "minecraft:stick", ticks: 100 },
  { id: "#minecraft:logs", ticks: 300 },
  { id: "#minecraft:planks", ticks: 300 }
]);

export const DEFAULT_BURNT_RESULT = `${KB}:burnt_food`;
