// ## Kaleidoscope script role: Custom block component (mixing bowl).
// ============================================================================
// Interaction:
//   ingredient      -> add one (max 9). Liquids hand their container straight back.
//   whisk           -> one stroke; enough strokes on a valid mix produces the result
//   empty hand      -> take the last ingredient back (sneak: take everything)
// Any item tagged `kaleidoscope_baking:whisk` works as a whisk, so other packs can ship
// their own whisks without Baking knowing their ids.
// ============================================================================
import { world } from "@minecraft/server";
import { addToBowl, currentRecipe, normalizeBowl, takeFromBowl, whiskBowl } from "../api/mixingLogic.js";
import { CONTAINER_RETURNS } from "../data/ingredientTags.js";
import {
  actionBar, consumeHeld, giveItems, heldItem, isCreative, itemName, locKey, particle, readJson, sound,
  spawnItems, t, writeJson
} from "../utils/runtime.js";

export const BOWL_ID = "kaleidoscope_baking:mixing_bowl";
export const WHISK_TAG = "kaleidoscope_baking:whisk";
const PREFIX = "kb_bowl";
const MSG = "kaleidoscope_baking.msg.bowl.";

const keyOf = block => locKey(PREFIX, block.dimension.id, block);
const top = block => ({ x: block.x + 0.5, y: block.y + 0.6, z: block.z + 0.5 });

function isWhisk(stack) {
  try { return stack.hasTag(WHISK_TAG); } catch { return false; }
}

function contentsMessage(s) {
  if (!s.items.length) return [t(`${MSG}empty`)];
  const parts = [t(`${MSG}contents`, s.items.length)];
  s.items.forEach((it, i) => { parts.push({ text: i ? "§7, §r" : " " }, itemName(it.id)); });
  const recipe = currentRecipe(s);
  parts.push({ text: "\n" });
  parts.push(recipe ? t(`${MSG}ready`, itemName(recipe.result), recipe.whisks) : t(`${MSG}no_recipe`));
  return parts;
}

function interact(block, player) {
  const key = keyOf(block);
  const s = normalizeBowl(readJson(key));
  const held = heldItem(player);
  const at = top(block);
  let changed = false;

  if (held && isWhisk(held)) {
    const r = whiskBowl(s);
    if (r.result === "none") {
      actionBar(player, ...contentsMessage(s));
    } else if (r.result === "progress") {
      changed = true;
      sound(block.dimension, "block.composter.fill", at, 0.7, 1.4);
      particle(block.dimension, "minecraft:water_splash_particle", at);
      actionBar(player, t(`${MSG}whisking`, itemName(r.recipe.result), r.done, r.need));
    } else {
      changed = true;
      giveItems(player, r.recipe.result, r.recipe.count);
      sound(block.dimension, "random.orb", at, 0.7, 1.1);
      particle(block.dimension, "minecraft:villager_happy", at);
      actionBar(player, t(`${MSG}done`, itemName(r.recipe.result), r.recipe.count));
    }
  } else if (held) {
    const container = CONTAINER_RETURNS[held.typeId];
    const r = addToBowl(s, held.typeId, !!container);
    if (r.ok) {
      changed = true;
      consumeHeld(player, 1);
      if (container && !isCreative(player)) giveItems(player, container, 1);
      sound(block.dimension, "random.pop", at, 0.4, 1.5);
      actionBar(player, ...contentsMessage(s));
    } else {
      actionBar(player, t(r.reason === "full" ? `${MSG}full` : `${MSG}not_ingredient`, itemName(held.typeId)));
    }
  } else {
    const before = s.items.length;
    const back = takeFromBowl(s, player.isSneaking);
    changed = s.items.length !== before;
    for (const id of back) giveItems(player, id, 1);
    actionBar(player, ...contentsMessage(s));
  }

  if (changed) writeJson(key, s.items.length || s.whisks ? s : undefined);
}

/** Spill solids on removal; liquids (container already returned) are lost by design. */
function spill(dimension, loc) {
  const key = locKey(PREFIX, dimension.id, loc);
  const s = normalizeBowl(readJson(key));
  const at = { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 };
  for (const it of s.items) if (!it.spilled) spawnItems(dimension, at, it.id, 1);
  writeJson(key, undefined);
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
