// ## Kaleidoscope script role: Declarative data.
// Built-in Baking recipes. They use exactly the public API schema
// (documentation/KB_EXTENSION_API.md) so built-in and addon recipes share one code path.
// Order matters only among built-ins: put more specific recipes BEFORE general ones
// that could match the same ingredients (e.g. lavender cookies before plain cookies).

const KB = "kaleidoscope_baking";
const k = name => `${KB}:${name}`;

// Common slots
const FLOUR = "#kaleidoscope:flour";
const EGG = "#kaleidoscope:egg";
const MILK = "#kaleidoscope:milk";
const SWEET = "#kaleidoscope:sweetener";
const WATER = "#kaleidoscope:water";
const BUTTER = "#kaleidoscope:butter";
const YEAST = k("yeast");
const GROUND_COFFEE = "#kaleidoscope:ground_coffee";
const LEMONY = [k("lemon"), k("lemon_slice")];

const mix = (name, ingredients, whisks, count = 1, extra = {}) =>
  ({ id: k(`mixing/${name}`), ingredients, whisks, result: k(name), count, ...extra });
const bake = (name, input, mold, time, perfectWindow, count = 1, extra = {}) =>
  ({ id: k(`oven/${name}`), input, mold: mold ? k(mold) : "", result: k(name), count, time, perfectWindow, ...extra });
const proof = (name, time = 1200) =>
  ({ id: k(`proofing/${name}`), input: k(`${name}_dough`), result: k(`proofed_${name}_dough`), time });
const shake = (name, ingredients, extra = {}) =>
  ({ id: k(`shaker/${name}`), ingredients, shakes: 5, result: k(name), carrier: k("takeaway_cup"), ...extra });
const brew = (name, additive, time = 120) =>
  ({ id: k(`espresso/${name}`), input: GROUND_COFFEE, additive, result: k(name), carrier: k("coffee_mug"), time, byproduct: k("coffee_grounds") });

export const BUILTIN_RECIPES = Object.freeze({
  mixing_bowl: [
    // 1.1: piping-bag icing (four cookies at once)
    ...["white", "pink", "blue", "green", "yellow", "cocoa"].map(c =>
      mix(`iced_cookie_${c}`, [k("shaped_cookie"), k("shaped_cookie"), k("shaped_cookie"), k("shaped_cookie"), k(`icing_${c}`)], 3, 4,
        { tool: "#kaleidoscope_baking:piping_bag" })),
    // 1.1: icing and colours (whisk)
    mix("icing_pink", [k("icing_white"), "minecraft:pink_dye"], 2),
    mix("icing_blue", [k("icing_white"), "minecraft:light_blue_dye"], 2),
    mix("icing_green", [k("icing_white"), "minecraft:lime_dye"], 2),
    mix("icing_yellow", [k("icing_white"), "minecraft:yellow_dye"], 2),
    mix("icing_cocoa", [k("icing_white"), k("cocoa_powder")], 2),
    mix("icing_white", ["minecraft:sugar", "minecraft:sugar", EGG], 6, 4),
    // 1.1: puff pastry family
    mix("puff_pastry_dough", [k("pie_dough"), BUTTER, BUTTER], 4),
    mix("palmier_dough", [k("puff_pastry"), "minecraft:sugar"], 2),
    mix("raw_portuguese_tart", [k("puff_pastry"), k("custard")], 2),
    mix("raw_pastry_soup", ["#kaleidoscope:soup", k("puff_pastry")], 2),
    mix("raw_egg_yolk_pastry", [k("puff_pastry"), k("salted_egg_yolk"), k("sesame_paste")], 3),
    mix("raw_pineapple_cake", [FLOUR, BUTTER, EGG, k("pineapple_jam")], 4),
    // Baking's pineapple, or 豐收's when Harvest is installed (it leads fruit). The bottle is part
    // of the recipe because the jam hands its bottle back when used.
    mix("pineapple_jam", ["#kaleidoscope:pineapple", "#kaleidoscope:pineapple", SWEET, "minecraft:glass_bottle"], 6, 2),
    mix("madeleine_batter", [FLOUR, EGG, BUTTER, SWEET, LEMONY], 5),
    mix("ma_lai_go_batter", [FLOUR, k("brown_sugar"), EGG, BUTTER], 4),
    // Dairy & basics (tool decides butter vs frothed milk from the same milk)
    mix("frothed_milk", [MILK], 4, 3, { tool: "#kaleidoscope_baking:frother" }),
    mix("milk_foam_cap", [k("whipped_cream"), MILK], 4, 2, { tool: "#kaleidoscope_baking:frother" }),
    mix("butter", [MILK], 8, 2),
    mix("whipped_cream", [MILK, SWEET], 10, 2),
    mix("cream_cheese", [MILK, LEMONY], 6, 2),
    mix("yeast", [FLOUR, SWEET, WATER], 3, 4),
    // Batters
    mix("chocolate_cake_batter", [FLOUR, EGG, SWEET, MILK, k("cocoa_powder")], 6),
    mix("matcha_batter", [FLOUR, EGG, SWEET, MILK, k("matcha_powder")], 6),
    mix("cake_batter", [FLOUR, EGG, SWEET, MILK], 6),
    mix("castella_batter", [FLOUR, EGG, EGG, "#kaleidoscope:honey"], 8),
    mix("lemon_poppy_batter", [FLOUR, EGG, SWEET, LEMONY, k("poppy_seeds")], 6),
    mix("cheesecake_batter", [k("cream_cheese"), EGG, SWEET, "#kaleidoscope:cookie"], 6),
    mix("muffin_batter", [FLOUR, EGG, SWEET, k("blueberry")], 5),
    mix("savory_taiyaki_batter", [FLOUR, EGG, MILK, "#kaleidoscope:cooked_fish"], 4),
    mix("taiyaki_batter", [FLOUR, EGG, MILK, k("custard")], 4),
    mix("fa_gao_batter", [FLOUR, k("brown_sugar"), YEAST, WATER], 4),
    // Doughs
    mix("croissant_dough", [FLOUR, FLOUR, BUTTER, BUTTER, YEAST], 5),
    mix("cinnamon_roll_dough", [FLOUR, BUTTER, YEAST, k("cinnamon_powder"), SWEET], 5),
    mix("baguette_dough", [FLOUR, FLOUR, FLOUR, WATER, YEAST], 4),
    mix("focaccia_dough", [FLOUR, FLOUR, WATER, YEAST, [k("rosemary"), k("dried_rosemary")]], 4),
    mix("donut_dough", [FLOUR, EGG, SWEET, MILK, YEAST], 5),
    mix("bread_dough", [FLOUR, FLOUR, WATER, YEAST], 4),
    mix("pineapple_bun_dough", [k("proofed_bread_dough"), k("cookie_dough")], 2, 2),
    mix("bagel_dough", [k("proofed_bread_dough"), k("poppy_seeds")], 2, 2),
    mix("lavender_cookie_dough", [FLOUR, BUTTER, k("lavender_sugar"), EGG], 4),
    mix("chocolate_cookie_dough", [FLOUR, BUTTER, SWEET, EGG, k("cocoa_powder")], 4),
    mix("cookie_dough", [FLOUR, BUTTER, SWEET, EGG], 4),
    mix("scone_dough", [FLOUR, BUTTER, MILK], 3),
    mix("pie_dough", [FLOUR, FLOUR, BUTTER, WATER], 3),
    mix("sesame_ball_dough", [k("tapioca_starch"), SWEET, WATER, [k("sesame_seeds"), k("black_sesame_seeds")]], 3),
    mix("mooncake_dough", [FLOUR, BUTTER, k("sesame_paste"), EGG], 3),
    mix("raw_tapioca_pearls", [k("tapioca_starch"), k("brown_sugar"), WATER], 5, 2),
    // Raw pies (assemble, then bake)
    mix("raw_apple_pie", [k("pie_crust"), "minecraft:apple", "minecraft:apple", SWEET], 2),
    mix("raw_blueberry_pie", [k("pie_crust"), k("blueberry"), k("blueberry"), SWEET], 2),
    mix("raw_quiche", [k("pie_crust"), EGG, EGG, "#kaleidoscope:vegetable", [k("thyme"), k("dried_thyme"), "#kaleidoscope:herb"]], 2),
    mix("raw_fish_pie", [k("pie_crust"), "#kaleidoscope:cooked_fish", EGG, "#kaleidoscope:dairy"], 2),
    mix("raw_egg_tart", [k("pie_crust"), k("custard")], 1)
  ],

  proofing: [
    proof("bread"), proof("croissant", 1600), proof("cinnamon_roll"), proof("baguette"),
    proof("focaccia"), proof("donut", 800)
  ],

  oven: [
    // Cakes
    bake("sponge_cake", k("cake_batter"), "cake_mold", 600, 300),
    bake("chocolate_cake", k("chocolate_cake_batter"), "cake_mold", 600, 300),
    bake("matcha_chiffon", k("matcha_batter"), "cake_mold", 600, 300),
    bake("cheesecake", k("cheesecake_batter"), "cake_mold", 700, 300),
    bake("honey_castella", k("castella_batter"), "loaf_pan", 700, 300),
    bake("lemon_poppy_cake", k("lemon_poppy_batter"), "loaf_pan", 600, 300),
    bake("blueberry_muffin", k("muffin_batter"), "muffin_tin", 400, 200, 4),
    bake("taiyaki", k("taiyaki_batter"), "taiyaki_mold", 300, 200, 2),
    bake("savory_taiyaki", k("savory_taiyaki_batter"), "taiyaki_mold", 300, 200, 2),
    // Breads
    bake("toast_loaf", k("proofed_bread_dough"), "loaf_pan", 500, 300),
    bake("croissant", k("proofed_croissant_dough"), "baking_tray", 400, 200, 3),
    bake("cinnamon_roll", k("proofed_cinnamon_roll_dough"), "baking_tray", 400, 200, 4),
    bake("baguette", k("proofed_baguette_dough"), "baking_tray", 500, 300, 2),
    bake("rosemary_focaccia", k("proofed_focaccia_dough"), "baking_tray", 450, 300),
    bake("pineapple_bun", k("pineapple_bun_dough"), "baking_tray", 400, 200, 2),
    bake("poppy_seed_bagel", k("bagel_dough"), "baking_tray", 400, 200, 2),
    // Cookies & small bakes
    bake("butter_cookie", k("cookie_dough"), "baking_tray", 300, 200, 6),
    bake("chocolate_cookie", k("chocolate_cookie_dough"), "baking_tray", 300, 200, 6),
    bake("lavender_cookie", k("lavender_cookie_dough"), "baking_tray", 300, 200, 6),
    bake("scone", k("scone_dough"), "baking_tray", 350, 200, 4),
    bake("sesame_mooncake", k("mooncake_dough"), "baking_tray", 450, 250, 4),
    // Pies & tarts
    bake("apple_pie", k("raw_apple_pie"), "pie_tin", 700, 300),
    bake("blueberry_pie", k("raw_blueberry_pie"), "pie_tin", 700, 300),
    bake("quiche", k("raw_quiche"), "pie_tin", 600, 300),
    bake("fish_pie", k("raw_fish_pie"), "pie_tin", 600, 300),
    bake("tart_shell", k("pie_crust"), "muffin_tin", 300, 300, 4),
    bake("egg_tart", k("raw_egg_tart"), "muffin_tin", 400, 200, 4),
    // 1.1
    bake("puff_pastry_sheet", k("puff_pastry"), "baking_tray", 300, 200, 2),
    bake("palmier", k("palmier_dough"), "baking_tray", 300, 200, 6),
    bake("portuguese_egg_tart", k("raw_portuguese_tart"), "muffin_tin", 400, 200, 4),
    bake("pastry_soup", k("raw_pastry_soup"), "", 400, 300),
    bake("madeleine", k("madeleine_batter"), "madeleine_mold", 300, 200, 6),
    bake("egg_yolk_pastry", k("raw_egg_yolk_pastry"), "baking_tray", 450, 250, 4),
    bake("pineapple_cake", k("raw_pineapple_cake"), "pineapple_cake_mold", 400, 250, 6),
    bake("shaped_cookie", k("shaped_cookie_dough"), "baking_tray", 300, 200, 6),
    // Coffee roasting: the perfect window is split into light / medium / dark.
    {
      id: k("oven/roast_coffee"), input: k("green_coffee_beans"), mold: k("baking_tray"),
      result: k("roasted_coffee_beans_medium"), count: 4, time: 300, perfectWindow: 450,
      roast: [k("roasted_coffee_beans_light"), k("roasted_coffee_beans_medium"), k("roasted_coffee_beans_dark")],
      burntResult: k("burnt_food")
    },
    // Bridges to Cookery / vanilla
    { id: k("oven/cookery_dough_bread"), input: "kaleidoscope_cookery:raw_dough", result: "minecraft:bread", count: 1, time: 400, perfectWindow: 300 },
    { id: k("oven/baked_potato"), input: "minecraft:potato", result: "minecraft:baked_potato", count: 1, time: 200, perfectWindow: 400 }
  ],

  decorating: [
    // Longer recipes first is not required: a recipe that is a prefix of another just
    // needs an empty-hand click to finish (see custom_components/decoratingStand.js).
    { id: k("decorating/strawberry_cream_cake"), base: k("sponge_cake"), layers: [k("whipped_cream"), k("strawberry")], result: k("strawberry_cream_cake") },
    { id: k("decorating/birthday_cake"), base: k("sponge_cake"), layers: [k("whipped_cream"), k("strawberry"), k("birthday_candle")], result: k("birthday_cake") },
    { id: k("decorating/mint_chocolate_cake"), base: k("chocolate_cake"), layers: [k("whipped_cream"), k("mint_leaves")], result: k("mint_chocolate_cake") },
    { id: k("decorating/strawberry_tart"), base: k("tart_shell"), layers: [k("custard"), k("strawberry")], result: k("strawberry_tart") },
    { id: k("decorating/lemon_tart"), base: k("tart_shell"), layers: [k("custard"), k("lemon_slice")], result: k("lemon_tart") },
    // 1.1
    { id: k("decorating/napoleon"), base: k("puff_pastry_sheet"), layers: [k("custard"), k("puff_pastry_sheet"), SWEET], result: k("napoleon"), count: 2 }
  ],

  espresso: [
    brew("americano", WATER),
    brew("latte", k("frothed_milk")),
    brew("cappuccino", k("milk_foam_cap")),
    brew("mocha", k("chocolate_sauce")),
    brew("caramel_macchiato", k("caramel")),
    brew("cinnamon_latte", k("cinnamon_powder")),
    brew("espresso", "", 100)
  ],

  pour_over: ["light", "medium", "dark"].map(r => ({
    id: k(`pour_over/${r}`), input: k(`ground_coffee_${r}`), result: k(`pour_over_${r}`), carrier: k("coffee_mug"), byproduct: k("coffee_grounds")
  })),

  shaker: [
    shake("bubble_milk_tea", [k("black_tea_base"), MILK, k("tapioca_pearls")]),
    shake("brown_sugar_pearl_milk", [MILK, k("tapioca_pearls"), k("brown_sugar_syrup")]),
    shake("pearl_black_tea_latte", [k("black_tea_base"), k("frothed_milk"), k("tapioca_pearls")]),
    shake("oolong_milk_foam", [k("oolong_tea_base"), k("milk_foam_cap")]),
    shake("lavender_milk_tea", [k("black_tea_base"), MILK, [k("lavender"), k("lavender_sugar")]]),
    shake("yuanyang", [k("espresso"), k("black_tea_base"), MILK]),
    shake("lemon_green_tea", [k("green_tea_base"), LEMONY], { byproduct: k("fruit_pulp") }),
    shake("lemon_black_tea", [k("black_tea_base"), LEMONY], { byproduct: k("fruit_pulp") }),
    shake("matcha_latte", [k("matcha_powder"), MILK], { temperature: "any" }),
    shake("mint_mocha", [k("espresso"), k("chocolate_sauce"), k("mint_leaves"), MILK], { temperature: "any" }),
    shake("iced_coffee", [k("espresso"), k("crushed_ice")], { allowIce: false }),
    shake("vanilla_milkshake", [MILK, k("vanilla_extract"), k("crushed_ice")], { allowIce: false }),
    shake("lemonade", [LEMONY, SWEET, WATER], { byproduct: k("fruit_pulp") }),
    shake("strawberry_milk", [k("strawberry"), k("strawberry"), MILK], { byproduct: k("fruit_pulp") }),
    shake("hot_cocoa", [k("cocoa_powder"), MILK, SWEET], { temperature: "hot", carrier: k("coffee_mug") })
  ]
});

/** Fuel burn time in ticks. Tag entries start with "#". */
export const BUILTIN_FUELS = Object.freeze([
  { id: "minecraft:coal", ticks: 1600 },
  { id: "minecraft:charcoal", ticks: 1600 },
  { id: "minecraft:coal_block", ticks: 16000 },
  { id: "minecraft:blaze_rod", ticks: 2400 },
  { id: "minecraft:dried_kelp_block", ticks: 4000 },
  { id: "minecraft:lava_bucket", ticks: 20000, returns: "minecraft:bucket" },
  { id: "minecraft:stick", ticks: 100 },
  { id: k("cinnamon_log"), ticks: 300 },
  { id: "#minecraft:logs", ticks: 300 },
  { id: "#minecraft:planks", ticks: 300 }
]);

export const DEFAULT_BURNT_RESULT = k("burnt_food");
