// ## Kaleidoscope script role: Declarative data.
// Built-in runtime tags for items that cannot declare `kaleidoscope:*` tags in their own
// item JSON: vanilla items and Kaleidoscope Cookery items (Cookery is a host we must not
// edit). Baking's OWN items declare their tags in BP/items/*.json instead.
//
// Tag names follow docs/PROPOSAL.zh-TW.md §5.2. Other packs extend this table at runtime
// through `kaleidoscope_baking:register_ingredient`.

const EGG = ["kaleidoscope:egg"];
const FISH_RAW = ["kaleidoscope:fish", "kaleidoscope:raw_fish"];
const FISH_COOKED = ["kaleidoscope:fish", "kaleidoscope:cooked_fish"];
const BERRY = ["kaleidoscope:fruit", "kaleidoscope:berry"];
const VEG = ["kaleidoscope:vegetable"];
const MEAT_RAW = ["kaleidoscope:meat", "kaleidoscope:raw_meat"];
const MEAT_COOKED = ["kaleidoscope:meat", "kaleidoscope:cooked_meat"];

export const BUILTIN_INGREDIENT_TAGS = Object.freeze({
  // Dairy / eggs / sweeteners
  "minecraft:egg": EGG,
  "minecraft:brown_egg": EGG,
  "minecraft:blue_egg": EGG,
  "minecraft:milk_bucket": ["kaleidoscope:milk", "kaleidoscope:dairy"],
  "minecraft:sugar": ["kaleidoscope:sugar", "kaleidoscope:sweetener"],
  "minecraft:honey_bottle": ["kaleidoscope:honey", "kaleidoscope:sweetener"],
  "minecraft:water_bucket": ["kaleidoscope:water"],
  "minecraft:cocoa_beans": ["kaleidoscope:cocoa"],
  "minecraft:sugar_cane": ["kaleidoscope:sugar_cane"],
  "minecraft:ice": ["kaleidoscope:ice"],
  "minecraft:packed_ice": ["kaleidoscope:ice"],

  // Grains / flour (Cookery owns flour and dough; we only classify them)
  "minecraft:wheat": ["kaleidoscope:grain"],
  "kaleidoscope_cookery:flour": ["kaleidoscope:flour"],
  "kaleidoscope_cookery:raw_dough": ["kaleidoscope:dough"],
  "kaleidoscope_cookery:rice": ["kaleidoscope:grain"],

  // Fruit / vegetables
  "minecraft:apple": ["kaleidoscope:fruit"],
  "minecraft:sweet_berries": BERRY,
  "minecraft:glow_berries": BERRY,
  "minecraft:melon_slice": ["kaleidoscope:fruit"],
  "minecraft:pumpkin": ["kaleidoscope:vegetable", "kaleidoscope:pumpkin"],
  "minecraft:carrot": [...VEG, "kaleidoscope:root_vegetable"],
  "minecraft:potato": [...VEG, "kaleidoscope:root_vegetable"],
  "minecraft:beetroot": [...VEG, "kaleidoscope:root_vegetable"],
  "kaleidoscope_cookery:tomato": VEG,
  "kaleidoscope_cookery:lettuce": VEG,
  "kaleidoscope_cookery:fresh_tea_leaves": ["kaleidoscope:tea_leaf"],
  "kaleidoscope_cookery:dried_tea_leaves": ["kaleidoscope:tea_leaf"],
  "kaleidoscope_cookery:oil": ["kaleidoscope:oil"],

  // Fish / seafood
  "minecraft:cod": FISH_RAW,
  "minecraft:salmon": FISH_RAW,
  "minecraft:tropical_fish": FISH_RAW,
  "minecraft:cooked_cod": FISH_COOKED,
  "minecraft:cooked_salmon": FISH_COOKED,
  "minecraft:kelp": ["kaleidoscope:seaweed"],
  "minecraft:dried_kelp": ["kaleidoscope:seaweed"],

  // Meat
  "minecraft:beef": MEAT_RAW,
  "minecraft:porkchop": MEAT_RAW,
  "minecraft:chicken": MEAT_RAW,
  "minecraft:mutton": MEAT_RAW,
  "minecraft:rabbit": MEAT_RAW,
  "minecraft:cooked_beef": MEAT_COOKED,
  "minecraft:cooked_porkchop": MEAT_COOKED,
  "minecraft:cooked_chicken": MEAT_COOKED,
  "minecraft:cooked_mutton": MEAT_COOKED,
  "minecraft:cooked_rabbit": MEAT_COOKED,

  // Baked goods from other packs
  "minecraft:bread": ["kaleidoscope:bread"],
  "minecraft:cookie": ["kaleidoscope:cookie", "kaleidoscope:pastry"],
  "minecraft:cake": ["kaleidoscope:cake"],
  "minecraft:pumpkin_pie": ["kaleidoscope:pie", "kaleidoscope:pastry"]
});

/**
 * When one of these is put into a station, the container comes straight back to the
 * player. The liquid itself is consumed: if the station is broken before the recipe
 * finishes, the liquid "spills" rather than duplicating the container.
 */
export const CONTAINER_RETURNS = Object.freeze({
  "minecraft:milk_bucket": "minecraft:bucket",
  "minecraft:water_bucket": "minecraft:bucket",
  "minecraft:lava_bucket": "minecraft:bucket",
  "minecraft:honey_bottle": "minecraft:glass_bottle",
  // Baking's own bottled / cupped ingredients
  "kaleidoscope_baking:brown_sugar_syrup": "minecraft:glass_bottle",
  "kaleidoscope_baking:vanilla_extract": "minecraft:glass_bottle",
  "kaleidoscope_baking:strawberry_jam": "minecraft:glass_bottle",
  "kaleidoscope_baking:blueberry_jam": "minecraft:glass_bottle",
  "kaleidoscope_baking:black_tea_base": "minecraft:glass_bottle",
  "kaleidoscope_baking:green_tea_base": "minecraft:glass_bottle",
  "kaleidoscope_baking:oolong_tea_base": "minecraft:glass_bottle",
  "kaleidoscope_baking:espresso": "kaleidoscope_baking:coffee_mug"
});
