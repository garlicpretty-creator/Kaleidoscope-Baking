// ## Kaleidoscope script role: Optional-pack compatibility DATA (no logic).
// ============================================================================
// Kaleidoscope series packs and who leads which content category when two packs
// both ship the same thing (proposal §3.5.5, decided by the project owner):
//   herbs / spices / edible flowers -> 草本 (Herbal)
//   fruits / crops                  -> 豐收 (Harvest)
//   crafting materials              -> 樂牧 (Ranch)
//   finished baked goods & drinks   -> 烘焙 (Baking itself)
//
// Canonical rule for items BOTH packs already ship (owner's decision, 2026-11):
//   fruit, cinnamon and fruit products (jams, blueberry pie, pineapple cake) -> 豐收's item
//   dairy and egg products (butter, whipped cream, custard, egg tart, raw egg tart) -> 樂牧's item
// While the sister pack is installed Baking's stations accept its item wherever Baking's is
// asked for (aliases), and the proofing basket swaps a held stack 1:1 between the two
// (custom_components/proofingBasket.js; not JSON recipes, see below).
// `outputs: false` marks entries where Baking keeps handing out ITS OWN item even so, because
// something only knows Baking's id: Baking's Cookery recipes (butter in custard / caramel /
// chocolate sauce / French toast / pancakes / cream soup, the butter jar; cinnamon bark on the
// drying rack) or Baking's eating effects and afternoon tea (blueberry pie, pineapple cake,
// egg tart, data/effects.js). The player can still swap those stacks at the basket.
//
// Why no crafting-table swap recipes: a JSON recipe naming another pack's item is a content
// error whenever that pack is absent, and JSON cannot be loaded conditionally, so the swap is
// done by script, which checks the sister item exists (ItemTypes) first.
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
//              Also real (checked against Harvest's repository, 2026-11-21): strawberry_jam, blueberry_jam,
//              blueberry_pie, pineapple_cake, cinnamon_bark.
//   樂牧 real:  butter, cream (鮮奶油), custard, egg_tart, raw_egg_tart (checked 2026-11-21). Ranching has
//              no cream cheese (its cheeses are other things), frothed milk, brown sugar or yeast.
// ============================================================================

export const SERIES = Object.freeze({
  fishing: { name: "漁歌", namespace: "kaleidoscope_fishing", leads: [] },
  harvest: { name: "豐收", namespace: "kaleidoscope_harvest", leads: ["fruit", "crop", "fruit_product"] },
  herbal: { name: "草本", namespace: "kaleidoscope_herbal", leads: ["herb"] },
  ranch: { name: "樂牧", namespace: "kaleidoscope_ranching", leads: ["material", "dairy"] }
});

const H = SERIES.herbal.namespace, F = SERIES.harvest.namespace, R = SERIES.ranch.namespace;
const kb = n => `kaleidoscope_baking:${n}`;

/**
 * baking:   our item
 * category: decides the lead pack (see SERIES.leads)
 * primary:  candidate ids in the lead pack (first one that exists wins)
 * outputs:  false = accept and swap only: Baking keeps handing out its own item (see the header)
 * hold:     true keeps the entry switched off even when the lead pack's item exists
 *           (api/compat.js skips it; nothing uses it at the moment)
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
  // Fruit products and cinnamon -> 豐收
  { baking: kb("strawberry_jam"), category: "fruit_product", primary: [`${F}:strawberry_jam`] },
  { baking: kb("blueberry_jam"), category: "fruit_product", primary: [`${F}:blueberry_jam`] },
  { baking: kb("blueberry_pie"), category: "fruit_product", primary: [`${F}:blueberry_pie`], outputs: false },
  { baking: kb("pineapple_cake"), category: "fruit_product", primary: [`${F}:pineapple_cake`], outputs: false },
  { baking: kb("cinnamon_bark"), category: "crop", primary: [`${F}:cinnamon_bark`], outputs: false },


  // Dairy and egg products -> 樂牧
  { baking: kb("butter"), category: "dairy", primary: [`${R}:butter`], outputs: false },
  { baking: kb("whipped_cream"), category: "dairy", primary: [`${R}:cream`], outputs: false },
  { baking: kb("custard"), category: "dairy", primary: [`${R}:custard`] },
  { baking: kb("raw_egg_tart"), category: "dairy", primary: [`${R}:raw_egg_tart`] },
  { baking: kb("egg_tart"), category: "dairy", primary: [`${R}:egg_tart`], outputs: false },

  // Crafting materials -> 樂牧 (guessed ids; Ranching has none of these, so they never match)
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
