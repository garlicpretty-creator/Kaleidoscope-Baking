// ## Kaleidoscope script role: Custom block component (placeable whole desserts).
// A whole cake / pie placed in the world is eaten in 4 slices.
//   empty hand / food     -> eat a slice (only when hungry); effects apply as if eaten normally
//   kitchen knife         -> cut a slice off as a Cake Slice item (any Cookery-tagged knife)
//   sneak + empty, whole  -> pick the untouched dessert back up
// Breaking an untouched dessert drops it (loot table); a started one is just crumbs.
import { applyConsumption, feed, isHungry } from "../events/consumption.js";
import { CONTENT } from "../data/generated/content.js";
import { actionBar, giveItems, heldItem, isCreative, itemName, particle, sound, stackHasTag, t } from "../utils/runtime.js";

const BITES = "kaleidoscope_baking:bites";
const SLICES = 4;
const SLICE_ITEM = "kaleidoscope_baking:cake_slice";
const KNIFE_TAG = "kaleidoscope_cookery:kitchen_knife";
const MSG = "kaleidoscope_baking.msg.dessert.";

function bitesOf(block) { try { return Number(block.permutation.getState(BITES)) || 0; } catch { return 0; } }

function takeBite(block, bites) {
  const next = bites + 1;
  if (next >= SLICES) { try { block.setType("minecraft:air"); } catch {} return 0; }
  try { block.setPermutation(block.permutation.withState(BITES, next)); } catch {}
  return SLICES - next;
}

export const dessertComponent = {
  onPlayerInteract({ block, player }) {
    if (!player) return;
    const id = block.typeId;
    const bites = bitesOf(block);
    const held = heldItem(player);
    const at = { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };

    if (held && stackHasTag(held, KNIFE_TAG)) {
      giveItems(player, SLICE_ITEM, 1);
      const left = takeBite(block, bites);
      sound(block.dimension, "block.itemframe.remove_item", at, 0.6, 1.2);
      actionBar(player, t(`${MSG}cut`, itemName(id), left));
      return;
    }
    if (!held && player.isSneaking && bites === 0) {
      try { block.setType("minecraft:air"); } catch {}
      giveItems(player, id, 1);
      return;
    }
    if (!isHungry(player) && !isCreative(player)) { actionBar(player, t(`${MSG}full`)); return; }
    const meta = CONTENT.desserts[id] ?? { nutrition: 2, saturation: 0.4 };
    feed(player, meta.nutrition, meta.saturation);
    applyConsumption(player, id);
    const left = takeBite(block, bites);
    sound(block.dimension, "random.burp", at, 0.5, 1.0);
    particle(block.dimension, "minecraft:crop_growth_emitter", at);
    actionBar(player, t(`${MSG}ate`, itemName(id), left));
  }
};
