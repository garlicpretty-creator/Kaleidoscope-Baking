// ## Kaleidoscope script role: Optional-pack compatibility DATA (no logic).
// ============================================================================
// Kaleidoscope series packs and who leads which content category when two packs
// both ship the same thing (proposal §3.5.5, decided by the project owner):
//   herbs / spices / edible flowers -> 草本 (Herbal)
//   fruits / crops                  -> 豐收 (Harvest)
//   crafting materials              -> 樂牧 (Ranch)
//   finished baked goods & drinks   -> 烘焙 (Baking itself)
//
// !! NAMESPACES BELOW ARE PLACEHOLDERS !!
// The real namespaces / item ids of 漁歌、豐收、草本、樂牧 are not known yet. Entries only
// activate when the listed item id actually exists in the world, so wrong guesses are
// harmless: they simply never match. Replace them once the ids are confirmed.
// ============================================================================

export const SERIES = Object.freeze({
  fishing: { name: "漁歌", namespace: "kaleidoscope_fishing", leads: [] },
  harvest: { name: "豐收", namespace: "kaleidoscope_harvest", leads: ["fruit", "crop"] },
  herbal: { name: "草本", namespace: "kaleidoscope_herbal", leads: ["herb"] },
  ranch: { name: "樂牧", namespace: "kaleidoscope_ranch", leads: ["material"] }
});

const H = SERIES.herbal.namespace, F = SERIES.harvest.namespace, R = SERIES.ranch.namespace;
const kb = n => `kaleidoscope_baking:${n}`;

/**
 * baking:   our item
 * category: decides the lead pack (see SERIES.leads)
 * primary:  candidate ids in the lead pack (first one that exists wins)
 * confirmed: set to true once the lead pack's id is verified — tools/gen_compat_recipes.mjs
 *           then generates 1:1 crafting-table swap recipes for it (unconfirmed guesses get none)
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
    block: { baking: kb("strawberry_bush"), primary: [`${F}:strawberry_bush`, `${F}:strawberry_crop`], bakingMax: 3, primaryState: `${F}:growth`, primaryMax: 3 } },
  { baking: kb("blueberry"), category: "fruit", primary: [`${F}:blueberry`, `${F}:blueberries`],
    block: { baking: kb("blueberry_bush"), primary: [`${F}:blueberry_bush`], bakingMax: 3, primaryState: `${F}:growth`, primaryMax: 3 } },
  { baking: kb("raspberry"), category: "fruit", primary: [`${F}:raspberry`, `${F}:raspberries`],
    block: { baking: kb("raspberry_bush"), primary: [`${F}:raspberry_bush`], bakingMax: 3, primaryState: `${F}:growth`, primaryMax: 3 } },
  { baking: kb("lemon"), category: "fruit", primary: [`${F}:lemon`] },
  { baking: kb("lemon_sapling"), category: "fruit", primary: [`${F}:lemon_sapling`] },
  // 1.1
  { baking: kb("pineapple"), category: "fruit", primary: [`${F}:pineapple`],
    block: { baking: kb("pineapple_crop"), primary: [`${F}:pineapple_crop`, `${F}:pineapple`], bakingMax: 7, primaryState: `${F}:growth`, primaryMax: 7 } },
  { baking: kb("pineapple_crown"), category: "fruit", primary: [`${F}:pineapple_crown`, `${F}:pineapple_seeds`] },

  // Crafting materials -> 樂牧
  { baking: kb("butter"), category: "material", primary: [`${R}:butter`] },
  { baking: kb("whipped_cream"), category: "material", primary: [`${R}:whipped_cream`, `${R}:cream`] },
  { baking: kb("cream_cheese"), category: "material", primary: [`${R}:cream_cheese`, `${R}:cheese`] },
  { baking: kb("frothed_milk"), category: "material", primary: [`${R}:frothed_milk`, `${R}:milk_foam`] },
  { baking: kb("brown_sugar"), category: "material", primary: [`${R}:brown_sugar`] },
  { baking: kb("yeast"), category: "material", primary: [`${R}:yeast`] }
]);
