// ## Kaleidoscope script role: Custom block component (proofing basket).
// Dough rises over time. Warm surroundings (fire, lit furnaces, Cookery heat sources, a lit
// oven) double the speed; snow / ice around it halves it.
//   dough in hand     -> add as many as fit (one kind at a time, max 16)
//   empty hand        -> take it out once risen
//   sneak + empty     -> take it out early (unrisen dough comes back unchanged)
//   a duplicate item  -> (series compat) the held stack is swapped 1:1 for the sister pack's
//                        version and back again: Baking's strawberry <-> 豐收's, Baking's butter
//                        <-> 樂牧's... (compat/series.data.js). Only while that pack is installed,
//                        so the swap never names an item that does not exist. Dough is never a
//                        duplicate, so this does not get in the way of proofing.
import { ItemStack, world } from "@minecraft/server";
import { addProofing, normalizeProofing, proofingYield, tickProofing } from "../api/stationLogic.js";
import { getProofingRecipe, getRecipeById } from "../api/registry.js";
import { swapPartner } from "../compat/index.js";
import { refuse, giveItems, heldItem, isCreative, mainhand, particle, safeBlock, sound, spawnItems } from "../utils/runtime.js";
import { bump, KIND, removeVisual, showContents, tintOf } from "../utils/visuals.js";
import { loadStation, registerTicker, saveStation, trackStation, untrackStation } from "../utils/stations.js";

export const BASKET_ID = "kaleidoscope_baking:proofing_basket";
const PREFIX = "kb_proof";
const isEmpty = s => !s.count;
const centre = b => ({ x: b.x + 0.5, y: b.y + 0.5, z: b.z + 0.5 });
const recipeOf = s => getRecipeById("proofing", s.recipe);

const HOT = new Set(["minecraft:fire", "minecraft:soul_fire", "minecraft:lava", "minecraft:magma", "minecraft:lit_furnace",
  "minecraft:lit_smoker", "minecraft:lit_blast_furnace", "minecraft:campfire", "minecraft:soul_campfire"]);
const COLD = new Set(["minecraft:snow", "minecraft:snow_layer", "minecraft:ice", "minecraft:packed_ice", "minecraft:blue_ice", "minecraft:powder_snow"]);
const OFFSETS = [[0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -2, 0], [0, 1, 0]];

function isHot(b) {
  if (!b) return false;
  if (HOT.has(b.typeId)) {
    try { const lit = b.permutation.getState("extinguished"); if (lit === true) return false; } catch {}
    return true;
  }
  try { if (b.hasTag("kaleidoscope_cookery:heat_sources")) return true; } catch {}
  try { if (b.permutation.getState("kaleidoscope_baking:lit") === true) return true; } catch {}
  return false;
}

/** 2 = warm, 0.5 = cold, 1 = normal */
export function warmth(block) {
  let hot = false, cold = false;
  for (const [dx, dy, dz] of OFFSETS) {
    const b = safeBlock(block.dimension, { x: block.x + dx, y: block.y + dy, z: block.z + dz });
    if (isHot(b)) hot = true;
    else if (b && COLD.has(b.typeId)) cold = true;
  }
  return hot ? 2 : cold ? 0.5 : 1;
}

/** Dough in the basket swells as it proofs. */
function show(block, s) {
  const r = recipeOf(s);
  showContents(block, KIND.proof, { fill: s.count ? Math.min(16, s.count) : 0, tint: tintOf([s.input]),
    progress: r && s.count ? s.progress / r.time : 0 });
}

/** Swap the held stack for its sister-pack twin, same amount (series compat). */
function swapStack(block, player, held, partner) {
  const slot = mainhand(player);
  let first;
  try { first = new ItemStack(partner, 1); } catch { refuse(block.dimension, centre(block)); return; }
  const n = Math.min(held.amount, first.maxAmount || 64);
  first.amount = n;
  try { slot.setItem(first); } catch { return; }
  if (held.amount > n) giveItems(player, partner, held.amount - n, false);
  const at = { x: block.x + 0.5, y: block.y + 0.7, z: block.z + 0.5 };
  sound(block.dimension, "random.pop", at, 0.5, 1.3);
  sound(block.dimension, "dig.grass", at, 0.5, 1.2);
  particle(block.dimension, "minecraft:villager_happy", at);
  bump(block, KIND.proof);
}

function interact(block, player) {
  const s = loadStation(PREFIX, block, normalizeProofing);
  const held = heldItem(player);
  const partner = held && swapPartner(held.typeId);
  if (partner && !getProofingRecipe(held.typeId)) { swapStack(block, player, held, partner); return; }
  if (held) {
    const r = addProofing(s, held.typeId, held.amount);
    if (!r.added) {
      refuse(block.dimension, centre(block));
      return;
    }
    if (!isCreative(player)) {
      const slot = mainhand(player);
      try {
        if (held.amount > r.added) { held.amount -= r.added; slot.setItem(held); } else slot.setItem(undefined);
      } catch {}
    }
    saveStation(PREFIX, block, s, isEmpty);
    trackStation(PREFIX, block);
    show(block, s);
    bump(block, KIND.proof);
    sound(block.dimension, "random.pop", centre(block), 0.4, 0.8);
    return;
  }
  const r = recipeOf(s);
  const done = s.count && r && s.progress >= r.time;
  if (s.count && (done || player.isSneaking)) {
    for (const y of proofingYield(s, r)) giveItems(player, y.id, y.count);
    saveStation(PREFIX, block, { count: 0 }, () => true);
    untrackStation(PREFIX, block);
    show(block, { count: 0 });
    sound(block.dimension, "random.pop", centre(block), 0.6, 1.0);
    return;
  }
}

registerTicker(PREFIX, BASKET_ID, 40, normalizeProofing, isEmpty, (block, s) => {
  const r = recipeOf(s);
  if (!r) return { state: s, keep: false };
  const finished = tickProofing(s, 40, warmth(block), r);
  show(block, s);
  if (finished) {
    particle(block.dimension, "minecraft:villager_happy", { x: block.x + 0.5, y: block.y + 0.6, z: block.z + 0.5 });
    return { state: s, keep: false };
  }
  return { state: s, keep: true };
});

function spill(dimension, loc) {
  const fake = { dimension, x: loc.x, y: loc.y, z: loc.z };
  const s = loadStation(PREFIX, fake, normalizeProofing);
  for (const y of proofingYield(s, recipeOf(s))) spawnItems(dimension, { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 }, y.id, y.count);
  saveStation(PREFIX, fake, { count: 0 }, () => true);
  untrackStation(PREFIX, fake);
  removeVisual(fake);
}

export const proofingBasketComponent = {
  onPlayerInteract({ block, player }) { if (player) interact(block, player); },
  onPlayerBreak({ block }) { spill(block.dimension, block); }
};

world.afterEvents.blockExplode.subscribe(ev => {
  if (ev.explodedBlockPermutation?.type?.id === BASKET_ID) spill(ev.dimension, ev.block);
});
