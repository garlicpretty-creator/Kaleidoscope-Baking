// ## Kaleidoscope script role: Declarative data.
// What happens when a player finishes eating / drinking an item (proposal §3.4.5, §3.5.3).
//   category: "dessert" | "drink" | "food"  (dessert + drink within 30 s = afternoon-tea bonus)
//   caffeine: added to the caffeine level        reduces: removed from it
//   effects:  [effect id, seconds, amplifier]    — positive coffee effects are skipped
//             while the player already has palpitations
//   clear:    effect ids removed on consumption
// Addons extend this through `kaleidoscope_baking:register_food_effect`.

const k = name => `kaleidoscope_baking:${name}`;
const HASTE = (s, a = 0) => ["haste", s, a];
const SPEED = (s, a = 0) => ["speed", s, a];
const coffee = (caffeine, s, extra = {}) => ({ category: "drink", caffeine, effects: [HASTE(s), SPEED(Math.round(s * 0.6))], ...extra });

export const BUILTIN_FOOD_EFFECTS = Object.freeze({
  // Coffee: darker / stronger = more caffeine, shorter but stronger buzz
  [k("espresso")]: coffee(2, 40, { effects: [HASTE(40, 1), SPEED(25)] }),
  [k("americano")]: coffee(1, 60),
  [k("latte")]: coffee(1, 45),
  [k("cappuccino")]: coffee(1, 45),
  [k("mocha")]: coffee(1, 45),
  [k("caramel_macchiato")]: coffee(1, 45),
  [k("cinnamon_latte")]: coffee(1, 45, { effects: [HASTE(45), SPEED(27), ["regeneration", 8, 0]] }),
  [k("pour_over_light")]: coffee(1, 75),
  [k("pour_over_medium")]: coffee(1, 60),
  [k("pour_over_dark")]: coffee(2, 40, { effects: [HASTE(40, 1), SPEED(25)] }),
  [k("iced_coffee")]: coffee(1, 50),
  [k("yuanyang")]: coffee(1, 45),
  [k("mint_mocha")]: coffee(1, 45, { clear: ["slowness"] }),
  [k("matcha_latte")]: coffee(1, 45),

  // Calm / milky drinks soothe palpitations
  [k("hot_cocoa")]: { category: "drink", reduces: 1, effects: [["regeneration", 6, 0]] },
  [k("strawberry_milk")]: { category: "drink", reduces: 1 },
  [k("vanilla_milkshake")]: { category: "drink", reduces: 1 },
  [k("lavender_milk_tea")]: { category: "drink", reduces: 1, clear: ["nausea"] },
  [k("bubble_milk_tea")]: { category: "drink" },
  [k("brown_sugar_pearl_milk")]: { category: "drink", reduces: 1 },
  [k("pearl_black_tea_latte")]: { category: "drink" },
  [k("oolong_milk_foam")]: { category: "drink" },
  [k("lemon_green_tea")]: { category: "drink" },
  [k("lemon_black_tea")]: { category: "drink" },
  [k("lemonade")]: { category: "drink", effects: [SPEED(20)] },
  ["minecraft:milk_bucket"]: { category: "drink", reduces: 1 },

  // Spice / herb flavours (proposal §3.5.3)
  [k("rosemary_focaccia")]: { category: "food", effects: [["resistance", 30, 0]] },
  [k("quiche")]: { category: "food", effects: [["resistance", 30, 0]] },
  [k("fish_pie")]: { category: "food", effects: [["water_breathing", 30, 0]] },
  [k("savory_taiyaki")]: { category: "food", effects: [["water_breathing", 20, 0]] },
  [k("lavender_cookie")]: { category: "dessert", reduces: 1, clear: ["nausea"] },
  [k("cinnamon_roll")]: { category: "dessert", effects: [["regeneration", 8, 0]] },
  [k("mint_chocolate_cake")]: { category: "dessert", clear: ["slowness"] },
  [k("honey_castella")]: { category: "dessert", effects: [["absorption", 30, 0]] },
  [k("burnt_food")]: { category: "food", effects: [["nausea", 5, 0]] },
  // 1.1
  [k("pastry_soup")]: { category: "food", effects: [["regeneration", 10, 0]] },
  [k("cream_soup")]: { category: "food", effects: [["regeneration", 6, 0]] },
  [k("fried_fish")]: { category: "food", effects: [["water_breathing", 30, 0]] },
  [k("egg_yolk_pastry")]: { category: "dessert", effects: [["absorption", 20, 0]] },

  // Plain desserts (afternoon-tea partners)
  ...Object.fromEntries([
    "sponge_cake", "chocolate_cake", "strawberry_cream_cake", "birthday_cake", "cheesecake", "matcha_chiffon",
    "lemon_poppy_cake", "blueberry_muffin", "taiyaki", "butter_cookie", "chocolate_cookie", "scone",
    "apple_pie", "blueberry_pie", "strawberry_tart", "lemon_tart", "egg_tart", "cake_slice", "croissant",
    "pineapple_bun", "donut", "pancakes", "french_toast", "fa_gao", "sesame_ball", "sesame_mooncake",
    "napoleon", "palmier", "portuguese_egg_tart", "madeleine", "pineapple_cake", "ma_lai_go", "shaped_cookie",
    "iced_cookie_white", "iced_cookie_pink", "iced_cookie_blue", "iced_cookie_green", "iced_cookie_yellow", "iced_cookie_cocoa"
  ].map(n => [k(n), { category: "dessert" }])),

  // Kaleidoscope Cookery teas also calm palpitations (ids are public Cookery items)
  ...Object.fromEntries([
    "barley_tea", "biluochun", "oolong", "tieguanyin", "sakura_fubuki", "flower_tea", "butter_tea", "clay_pot_milk_tea"
  ].map(n => [`kaleidoscope_cookery:${n}`, { category: "drink", reduces: 1 }]))
});
