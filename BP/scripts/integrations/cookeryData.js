// ## Kaleidoscope script role: Declarative data for the Cookery integration.
// Everything Baking registers into Kaleidoscope Cookery's stations through Cookery's
// PUBLIC API (Cookery documentation/KC_EXTENSION_API.md). Each entry names the Cookery
// capability it needs; entries are skipped when Cookery does not advertise it.
// Cookery does not understand Baking's #tags, so slots list concrete alternatives.

const k = n => `kaleidoscope_baking:${n}`;
const kc = n => `kaleidoscope_cookery:${n}`;
const EGGS = ["minecraft:egg", "minecraft:brown_egg", "minecraft:blue_egg"];
const SUGARS = ["minecraft:sugar", k("brown_sugar"), k("stevia_sugar")];
const BOTTLE = "minecraft:glass_bottle";

const recipe = (capability, kind, r) => ({ capability, kind, recipe: r });

const millstone = (name, input, output, count = 1) =>
  recipe("millstone", "millstone", { id: k(`millstone/${name}`), input, outputs: [{ id: output, count, chance: 1 }] });
const board = (name, input, result, count, cuts = 2) =>
  recipe("chopping_board", "chopping_board", { id: k(`board/${name}`), input, result, count, cuts });
const dry = (name, input, result, duration = 1800) =>
  recipe("bamboo_tray", "bamboo_tray", { id: k(`tray/${name}`), input, result, process: "dry", duration });
const pot = (name, ingredients, result, count, carrier = "", time = 300) =>
  recipe("stockpot_exact", "stockpot_exact", { id: k(`stockpot/${name}`), ingredients, result, count, carrier, time, base: "minecraft:water" });
const wok = (name, ingredients, result, count, carrier = "", time = 200) =>
  recipe("wok", "wok", { id: k(`wok/${name}`), ingredients, result, count, carrier, time });

const PLACEABLE_CAKES = ["sponge_cake", "chocolate_cake", "strawberry_cream_cake", "birthday_cake", "mint_chocolate_cake",
  "cheesecake", "matcha_chiffon"];

export const COOKERY_REGISTRATIONS = Object.freeze({
  recipes: [
    // Millstone: powders and pastes
    millstone("cocoa_powder", "minecraft:cocoa_beans", k("cocoa_powder"), 2),
    millstone("brown_sugar", "minecraft:sugar_cane", k("brown_sugar"), 2),
    millstone("ground_coffee_light", k("roasted_coffee_beans_light"), k("ground_coffee_light"), 2),
    millstone("ground_coffee_medium", k("roasted_coffee_beans_medium"), k("ground_coffee_medium"), 2),
    millstone("ground_coffee_dark", k("roasted_coffee_beans_dark"), k("ground_coffee_dark"), 2),
    millstone("tapioca_starch", k("cassava"), k("tapioca_starch"), 2),
    millstone("crushed_ice", "minecraft:ice", k("crushed_ice"), 4),
    millstone("crushed_packed_ice", "minecraft:packed_ice", k("crushed_ice"), 9),
    millstone("cinnamon_powder", k("cinnamon_stick"), k("cinnamon_powder"), 2),
    millstone("sesame_paste", k("sesame_seeds"), k("sesame_paste")),
    millstone("black_sesame_paste", k("black_sesame_seeds"), k("sesame_paste")),
    millstone("lavender_sugar", k("lavender"), k("lavender_sugar")),
    millstone("stevia_sugar", k("dried_stevia"), k("stevia_sugar"), 2),
    millstone("matcha_powder", kc("dried_tea_leaves"), k("matcha_powder")),
    // Chopping board
    board("toast_slices", k("toast_loaf"), k("toast_slice"), 4, 3),
    board("lemon_slices", k("lemon"), k("lemon_slice"), 4, 2),
    board("coffee_cherry", k("coffee_cherry"), k("green_coffee_beans"), 2, 1),
    board("poppy_seeds", "minecraft:poppy", k("poppy_seeds"), 2, 1),
    ...PLACEABLE_CAKES.map(c => board(`slice_${c}`, k(c), k("cake_slice"), 4, 4)),
    recipe("chopping_board_tool", "chopping_board_tool", {
      id: k("board/pie_crust"), input: k("pie_dough"), tool: k("rolling_pin"), result: k("pie_crust"), count: 2, consumeTool: false
    }),
    // Steamer
    recipe("steamer", "steamer", { id: k("steamer/fa_gao"), input: k("fa_gao_batter"), result: k("fa_gao"), count: 4, time: 400 }),
    // Bamboo tray (sun drying)
    dry("vanilla_pod", k("green_vanilla_pod"), k("vanilla_pod")),
    dry("dried_rosemary", k("rosemary"), k("dried_rosemary"), 1200),
    dry("dried_thyme", k("thyme"), k("dried_thyme"), 1200),
    dry("cinnamon_stick", k("cinnamon_bark"), k("cinnamon_stick")),
    dry("dried_stevia", k("stevia_leaf"), k("dried_stevia"), 1200),
    dry("dried_blueberry", k("blueberry"), k("dried_blueberry")),
    // Stockpot (water base)
    pot("custard", [EGGS, SUGARS, [k("butter")]], k("custard"), 2),
    pot("caramel", [["minecraft:sugar"], ["minecraft:sugar"], [k("butter")]], k("caramel"), 2),
    pot("chocolate_sauce", [[k("cocoa_powder")], [k("cocoa_powder")], SUGARS, [k("butter")]], k("chocolate_sauce"), 2),
    pot("strawberry_jam", [[k("strawberry")], [k("strawberry")], [k("strawberry")], SUGARS], k("strawberry_jam"), 2, BOTTLE),
    pot("blueberry_jam", [[k("blueberry")], [k("blueberry")], [k("blueberry")], SUGARS], k("blueberry_jam"), 2, BOTTLE),
    pot("vanilla_extract", [[k("vanilla_pod")], [k("vanilla_pod")], ["minecraft:sugar"]], k("vanilla_extract"), 1, BOTTLE),
    pot("tapioca_pearls", [[k("raw_tapioca_pearls")]], k("tapioca_pearls"), 2, "", 400),
    pot("black_tea_base", [[kc("dried_tea_leaves")], [kc("dried_tea_leaves")]], k("black_tea_base"), 3, BOTTLE),
    pot("green_tea_base", [[kc("fresh_tea_leaves")], [kc("fresh_tea_leaves")]], k("green_tea_base"), 3, BOTTLE),
    pot("oolong_tea_base", [[kc("oolong_tea_bag")]], k("oolong_tea_base"), 3, BOTTLE),
    // Wok
    wok("french_toast", [k("toast_slice"), EGGS, k("butter")], k("french_toast"), 2),
    wok("pancakes", [k("cake_batter"), k("butter")], k("pancakes"), 3),
    wok("donut", [k("proofed_donut_dough"), kc("oil")], k("donut"), 3),
    wok("sesame_ball", [k("sesame_ball_dough"), kc("oil")], k("sesame_ball"), 4),
    wok("brown_sugar_syrup", [k("brown_sugar"), k("brown_sugar")], k("brown_sugar_syrup"), 2, BOTTLE)
  ],

  // Cookery's Wok and Stockpot only accept registered ingredients; Mystery Tea must not
  // swallow our drink ingredients.
  teapotMysteryExclude: [k("green_coffee_beans"), k("coffee_cherry"), k("tapioca_pearls"), k("crushed_ice")],

  // Small foods render as flat items on Cookery tables / fruit baskets.
  displayRules: [
    "butter_cookie", "chocolate_cookie", "lavender_cookie", "toast_slice", "cake_slice", "croissant", "scone",
    "blueberry_muffin", "taiyaki", "savory_taiyaki", "egg_tart", "strawberry_tart", "lemon_tart", "donut",
    "pineapple_bun", "poppy_seed_bagel", "cinnamon_roll", "sesame_mooncake", "sesame_ball", "fa_gao", "lemon", "strawberry"
  ].map(n => ({ id: k(n), mode: "item" })),

  // Cookery's sickle sweeps these crops (5x2x5). Only stage-based crops, not trees.
  sickleCrops: [] // filled from the generated content index at runtime
});
