// ## Kaleidoscope script role: Optional-pack compatibility DATA (no logic).
// ============================================================================
// Kaleidoscope series packs and who leads which content category when two packs
// both ship the same thing (proposal §3.5.5, decided by the project owner):
//   herbs / spices / edible flowers -> 草本 (Herbal)
//   fruits / crops                  -> 豐收 (Harvest)
//   crafting materials              -> 樂牧 (Ranch)
//   finished baked goods & drinks   -> 烘焙 (Baking itself)
//
// The four namespaces are the packs' real ones (checked against Fishing Voyage 1.6.0,
// Harvest 1.3.1, Herbal 1.3.1 and Ranching 1.3.0); compat/reverse.data.js builds its event
// names from them.
//
// The item / block ids in EQUIVALENTS are a mix. An entry only activates when a listed id
// actually exists in the world, so an id the lead pack does not have simply never matches:
//   豐收 real:  strawberry, blueberry, lemon, pineapple, pineapple_crown (items), lemon_sapling
//              (a block with an item form); blocks strawberry_crop, blueberry_crop, pineapple_crop, all with
//              kaleidoscope_harvest:growth 0..7. Harvest has no raspberry. The blueberry bush is not mapped to
//              blueberry_crop yet (that would newly switch on its in-world conversion: not decided).
//   草本 none:  Herbal has no mint, lavender, thyme or rosemary, so the herb entries never match.
//   樂牧 real:  butter and cream (both on hold, see below). Ranching has no cream cheese (its
//              cheeses are other things), frothed milk, brown sugar or yeast.
// ============================================================================

export const SERIES = Object.freeze({
  fishing: { name: "漁歌", namespace: "kaleidoscope_fishing", leads: [] },
  harvest: { name: "豐收", namespace: "kaleidoscope_harvest", leads: ["fruit", "crop"] },
  herbal: { name: "草本", namespace: "kaleidoscope_herbal", leads: ["herb"] },
  ranch: { name: "樂牧", namespace: "kaleidoscope_ranching", leads: ["material"] }
});

const H = SERIES.herbal.namespace, F = SERIES.harvest.namespace, R = SERIES.ranch.namespace;
const kb = n => `kaleidoscope_baking:${n}`;

/**
 * baking:   our item
 * category: decides the lead pack (see SERIES.leads)
 * primary:  candidate ids in the lead pack (first one that exists wins)
 * confirmed: set to true once the lead pack's id is verified — tools/gen_compat_recipes.mjs
 *           then generates 1:1 crafting-table swap recipes for it (unconfirmed guesses get none)
 * hold:     true keeps the entry switched off even when the lead pack's item exists
 *           (api/compat.js skips it)
 * block:    optional plant-block mapping for in-world auto-conversion:
 *           {baking, primary:[candidates], bakingMax, primaryState, primaryMax}
 */
export const EQUIVALENTS = Object.freeze([
  // Herbs -> 草本
  { baking: kb("mint_leaves"), category: "herb", primary: [`${H}:mint`, `${H}:mint_leaves`],
    block: { baking: kb("mint_bush"), primary: [`${H}:mint`, `${H}:mint_crop`], bakingMax: 3, primaryState: `${H}:growth`, primaryMax: 3 } },
  { baking: kb("mint_cutting"), category: "herb", primary: [`${H}:mint_cutting`, `${H}:mint_seeds`] },
  { baking: kb("lavender"), category: "herb", primary: [`${H}:lavender`],
    block: { baking: kb("lavender_bush"), primary: [`${H}:lavender`, `${H}:lavender_crop`], bakingMax: 3, primaryState: `${H}:growth`, primaryMax: 3 } },
  { baking: kb("lavender_cutting"), category: "herb", primary: [`${H}:lavender_cutting`, `${H}:lavender_seeds`] },
  { baking: kb("thyme"), category: "herb", primary: [`${H}:thyme`],
    block: { baking: kb("thyme_bush"), primary: [`${H}:thyme`, `${H}:thyme_crop`], bakingMax: 3, primaryState: `${H}:growth`, primaryMax: 3 } },
  { baking: kb("thyme_cutting"), category: "herb", primary: [`${H}:thyme_cutting`, `${H}:thyme_seeds`] },
  { baking: kb("rosemary"), category: "herb", primary: [`${H}:rosemary`],
    block: { baking: kb("rosemary_bush"), primary: [`${H}:rosemary`, `${H}:rosemary_crop`], bakingMax: 3, primaryState: `${H}:growth`, primaryMax: 3 } },
  { baking: kb("rosemary_cutting"), category: "herb", primary: [`${H}:rosemary_cutting`, `${H}:rosemary_seeds`] },

  // Fruits -> 豐收
  { baking: kb("strawberry"), category: "fruit", primary: [`${F}:strawberry`],
    block: { baking: kb("strawberry_bush"), primary: [`${F}:strawberry_bush`, `${F}:strawberry_crop`], bakingMax: 3, primaryState: `${F}:growth`, primaryMax: 7 } },
  { baking: kb("blueberry"), category: "fruit", primary: [`${F}:blueberry`, `${F}:blueberries`],
    block: { baking: kb("blueberry_bush"), primary: [`${F}:blueberry_bush`], bakingMax: 3, primaryState: `${F}:growth`, primaryMax: 3 } },
  { baking: kb("raspberry"), category: "fruit", primary: [`${F}:raspberry`, `${F}:raspberries`],
    block: { baking: kb("raspberry_bush"), primary: [`${F}:raspberry_bush`], bakingMax: 3, primaryState: `${F}:growth`, primaryMax: 3 } },
  { baking: kb("lemon"), category: "fruit", primary: [`${F}:lemon`] },
  { baking: kb("lemon_sapling"), category: "fruit", primary: [`${F}:lemon_sapling`] },
  { baking: kb("pineapple"), category: "fruit", primary: [`${F}:pineapple`],
    block: { baking: kb("pineapple_crop"), primary: [`${F}:pineapple_crop`, `${F}:pineapple`], bakingMax: 7, primaryState: `${F}:growth`, primaryMax: 7 } },
  { baking: kb("pineapple_crown"), category: "fruit", primary: [`${F}:pineapple_crown`, `${F}:pineapple_seeds`] },


  // Crafting materials -> 樂牧
  // Butter and cream are ON HOLD (`hold: true`). kaleidoscope_ranching:butter and :cream (鮮奶油)
  // are real, but with the lead rule on Baking's mixing bowl would hand out Ranching's butter and
  // cream from whisked milk (Ranching makes them in its cream separator and butter churn), and
  // Baking would stop handing out its own butter, which its Cookery recipes (custard, caramel,
  // chocolate sauce, French toast, pancakes, cream soup), the butter jar's crafting recipe and the
  // jar's oil-container registration all name. Remove `hold` once that is decided and handled.
  { baking: kb("butter"), category: "material", primary: [`${R}:butter`], hold: true },
  { baking: kb("whipped_cream"), category: "material", primary: [`${R}:whipped_cream`, `${R}:cream`], hold: true },
  { baking: kb("cream_cheese"), category: "material", primary: [`${R}:cream_cheese`, `${R}:cheese`] },
  { baking: kb("frothed_milk"), category: "material", primary: [`${R}:frothed_milk`, `${R}:milk_foam`] },
  { baking: kb("brown_sugar"), category: "material", primary: [`${R}:brown_sugar`] },
  { baking: kb("yeast"), category: "material", primary: [`${R}:yeast`] }
]);

/**
 * Series items Baking has no equivalent for but uses through `#kaleidoscope:*` tags. They are
 * registered as ingredients at world load (harmless when the pack is absent).
 * (Items that DO have a Baking equivalent are handled by EQUIVALENTS above instead.)
 */
export const SERIES_TAGS = Object.freeze([]);
