// ## Kaleidoscope script role: Custom block component (mixing bowl).
// ============================================================================
// Interaction:
//   ingredient      -> add one (max 9). Liquids hand their container straight back.
//   whisk / frother -> one stroke; enough strokes on a valid mix produces the result.
//                      The recipe's `tool` decides which one (milk + whisk = butter,
//                      milk + frother = frothed milk).
//   empty hand      -> take the last ingredient back (sneak: take everything)
// Tools are recognised by item TAG (`kaleidoscope_baking:whisk` / `:frother`), so other packs
// can ship their own tools without Baking knowing their ids.
// ============================================================================
import { world } from "@minecraft/server";
import { addToBowl, currentRecipe, normalizeBowl, takeFromBowl, whiskBowl } from "../api/mixingLogic.js";
import { CONTAINER_RETURNS } from "../data/ingredientTags.js";
import {
  refuse, consumeHeld, giveItems, heldItem, isCreative, itemName, locKey, particle, readJson, sound,
  spawnItems, stackHasTag, t, writeJson
} from "../utils/runtime.js";
import { bump, KIND, playMotion, removeVisual, showContents, tintOf } from "../utils/visuals.js";

export const BOWL_ID = "kaleidoscope_baking:mixing_bowl";
const TOOL_TAGS = ["kaleidoscope_baking:whisk", "kaleidoscope_baking:frother"];
const PREFIX = "kb_bowl";
const MSG = "kaleidoscope_baking.msg.bowl.";

const keyOf = block => locKey(PREFIX, block.dimension.id, block);
const top = block => ({ x: block.x + 0.5, y: block.y + 0.6, z: block.z + 0.5 });
const isTool = stack => TOOL_TAGS.some(tag => stackHasTag(stack, tag));

function interact(block, player) {
  const key = keyOf(block);
  const s = normalizeBowl(readJson(key));
  const held = heldItem(player);
  const at = top(block);
  let changed = false;

  if (held && isTool(held)) {
    const r = whiskBowl(s, held.typeId);
    if (r.result === "none") {
      const any = currentRecipe(s);
      refuse(block.dimension, at); // wrong tool, or nothing that tool can mix
    } else if (r.result === "progress") {
      changed = true;
      playMotion(block, KIND.bowl, 14);
      sound(block.dimension, "block.composter.fill", at, 0.7, 1.4);
      particle(block.dimension, "minecraft:water_splash_particle", at);
    } else {
      changed = true;
      playMotion(block, KIND.bowl, 14);
      giveItems(player, r.recipe.result, r.recipe.count);
      sound(block.dimension, "random.orb", at, 0.7, 1.1);
      particle(block.dimension, "minecraft:villager_happy", at);
    }
  } else if (held) {
    const container = CONTAINER_RETURNS[held.typeId];
    const r = addToBowl(s, held.typeId, !!container);
    if (r.ok) {
      changed = true;
      consumeHeld(player, 1);
      if (container && !isCreative(player)) giveItems(player, container, 1);
      sound(block.dimension, "random.pop", at, 0.4, 1.5);
      bump(block, KIND.bowl);
    } else {
      refuse(block.dimension, at);
    }
  } else {
    const before = s.items.length;
    const back = takeFromBowl(s, player.isSneaking);
    changed = s.items.length !== before;
    for (const id of back) giveItems(player, id, 1);
  }

  if (changed) writeJson(key, s.items.length || s.whisks ? s : undefined);
  // the batter shows how much is in the bowl and takes the colour of what went in
  showContents(block, KIND.bowl, { fill: s.items.length, tint: tintOf(s.items.map(i => i.id)) });
}

/** Spill solids on removal; liquids (container already returned) are lost by design. */
function spill(dimension, loc) {
  const key = locKey(PREFIX, dimension.id, loc);
  const s = normalizeBowl(readJson(key));
  const at = { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 };
  for (const it of s.items) if (!it.spilled) spawnItems(dimension, at, it.id, 1);
  writeJson(key, undefined);
  removeVisual({ dimension, x: loc.x, y: loc.y, z: loc.z });
}

export const mixingBowlComponent = {
  onPlayerInteract({ block, player }) {
    if (player) interact(block, player);
  },
  onPlayerBreak({ block }) {
    spill(block.dimension, block);
  }
};

world.afterEvents.blockExplode.subscribe(ev => {
  if (ev.explodedBlockPermutation?.type?.id === BOWL_ID) spill(ev.dimension, ev.block);
});
