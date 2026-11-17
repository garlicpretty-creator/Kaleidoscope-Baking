// ## Kaleidoscope script role: Custom block component (placeable whole desserts).
// A whole cake / pie placed in the world is eaten in 4 slices.
//   empty hand / food     -> eat a slice (only when hungry); effects apply as if eaten normally
//   kitchen knife         -> cut a slice off as a Cake Slice item (any Cookery-tagged knife)
//   sneak + empty, whole  -> pick the untouched dessert back up
// Breaking an untouched dessert drops it (loot table); a started one is just crumbs.
//
// PUBLIC (1.1): other packs may put `"kaleidoscope_baking:dessert": {...}` on their own
// block with a `kaleidoscope_baking:bites` 0..(slices-1) state. Params (all optional):
//   {"slices": 4, "nutrition": 3, "saturation": 0.5, "slice_item": "kaleidoscope_baking:cake_slice"}
// The shared slice logic is also used by the cake stand.
import { applyConsumption, feed, isHungry } from "../events/consumption.js";
import { CONTENT } from "../data/generated/content.js";
import { actionBar, giveItems, heldItem, isCreative, itemName, particle, sound, stackHasTag, t } from "../utils/runtime.js";

const BITES = "kaleidoscope_baking:bites";
const DEFAULT_SLICES = 4;
export const SLICE_ITEM = "kaleidoscope_baking:cake_slice";
export const KNIFE_TAG = "kaleidoscope_cookery:kitchen_knife";
const MSG = "kaleidoscope_baking.msg.dessert.";

export function dessertMeta(id, params = {}) {
  const meta = CONTENT.desserts[id] ?? {};
  return {
    slices: Math.max(1, Math.min(16, Math.floor(Number(params.slices ?? DEFAULT_SLICES)) || DEFAULT_SLICES)),
    nutrition: Number(params.nutrition ?? meta.nutrition ?? 2),
    saturation: Number(params.saturation ?? meta.saturation ?? 0.4),
    sliceItem: params.slice_item ?? SLICE_ITEM
  };
}
export const isPlaceableDessert = id => !!CONTENT.desserts[id];

/**
 * One interaction with a dessert of `id` that has `bites` eaten (shared by the dessert block
 * and the cake stand). Returns {bites} (new count; >= slices means finished) or undefined if
 * nothing happened.
 */
export function interactDessert(player, id, bites, meta, at, dimension) {
  const held = heldItem(player);
  if (held && stackHasTag(held, KNIFE_TAG)) {
    giveItems(player, meta.sliceItem, 1);
    sound(dimension, "block.itemframe.remove_item", at, 0.6, 1.2);
    actionBar(player, t(`${MSG}cut`, itemName(id), meta.slices - bites - 1));
    return { bites: bites + 1 };
  }
  if (!isHungry(player) && !isCreative(player)) { actionBar(player, t(`${MSG}full`)); return undefined; }
  feed(player, meta.nutrition, meta.saturation);
  applyConsumption(player, id);
  sound(dimension, "random.burp", at, 0.5, 1.0);
  particle(dimension, "minecraft:crop_growth_emitter", at);
  actionBar(player, t(`${MSG}ate`, itemName(id), meta.slices - bites - 1));
  return { bites: bites + 1 };
}

function bitesOf(block) { try { return Number(block.permutation.getState(BITES)) || 0; } catch { return 0; } }

export const dessertComponent = {
  onPlayerInteract({ block, player }, ctx) {
    if (!player) return;
    const id = block.typeId;
    const bites = bitesOf(block);
    const meta = dessertMeta(id, ctx?.params ?? {});
    if (!heldItem(player) && player.isSneaking && bites === 0) {
      try { block.setType("minecraft:air"); } catch {}
      giveItems(player, id, 1);
      return;
    }
    const r = interactDessert(player, id, bites, meta, { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 }, block.dimension);
    if (!r) return;
    if (r.bites >= meta.slices) { try { block.setType("minecraft:air"); } catch {} return; }
    try { block.setPermutation(block.permutation.withState(BITES, r.bites)); } catch {}
  }
};
