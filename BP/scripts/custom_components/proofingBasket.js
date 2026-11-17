// ## Kaleidoscope script role: Custom block component (proofing basket).
// Dough rises over time. Warm surroundings (fire, lit furnaces, Cookery heat sources, a lit
// oven) double the speed; snow / ice around it halves it.
//   dough in hand     -> add as many as fit (one kind at a time, max 16)
//   empty hand        -> take it out once risen
//   sneak + empty     -> take it out early (unrisen dough comes back unchanged)
import { world } from "@minecraft/server";
import { addProofing, normalizeProofing, proofingYield, tickProofing } from "../api/stationLogic.js";
import { getRecipeById } from "../api/registry.js";
import { actionBar, giveItems, heldItem, isCreative, itemName, mainhand, particle, safeBlock, sound, spawnItems, t } from "../utils/runtime.js";
import { loadStation, registerTicker, saveStation, trackStation, untrackStation } from "../utils/stations.js";

export const BASKET_ID = "kaleidoscope_baking:proofing_basket";
const PREFIX = "kb_proof";
const MSG = "kaleidoscope_baking.msg.proof.";
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

function status(block, s) {
  if (!s.count) return [t(`${MSG}empty`)];
  const r = recipeOf(s);
  if (r && s.progress >= r.time) return [t(`${MSG}done`, itemName(r.result), s.count * r.count)];
  const pct = r ? Math.min(99, Math.floor((s.progress / r.time) * 100)) : 0;
  const w = warmth(block);
  const parts = [t(`${MSG}status`, itemName(s.input), s.count, pct)];
  if (w !== 1) parts.push({ text: " " }, t(w > 1 ? `${MSG}warm` : `${MSG}cold`));
  return parts;
}

function interact(block, player) {
  const s = loadStation(PREFIX, block, normalizeProofing);
  const held = heldItem(player);
  if (held) {
    const r = addProofing(s, held.typeId, held.amount);
    if (!r.added) {
      actionBar(player, t(`${MSG}${r.reason}`, itemName(held.typeId)));
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
    sound(block.dimension, "random.pop", centre(block), 0.4, 0.8);
    actionBar(player, t(`${MSG}added`, itemName(held.typeId), r.added), { text: "\n" }, ...status(block, s));
    return;
  }
  const r = recipeOf(s);
  const done = s.count && r && s.progress >= r.time;
  if (s.count && (done || player.isSneaking)) {
    for (const y of proofingYield(s, r)) giveItems(player, y.id, y.count);
    saveStation(PREFIX, block, { count: 0 }, () => true);
    untrackStation(PREFIX, block);
    sound(block.dimension, "random.pop", centre(block), 0.6, 1.0);
    return;
  }
  actionBar(player, ...status(block, s));
}

registerTicker(PREFIX, BASKET_ID, 40, normalizeProofing, isEmpty, (block, s) => {
  const r = recipeOf(s);
  if (!r) return { state: s, keep: false };
  if (tickProofing(s, 40, warmth(block), r)) {
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
}

export const proofingBasketComponent = {
  onPlayerInteract({ block, player }) { if (player) interact(block, player); },
  onPlayerBreak({ block }) { spill(block.dimension, block); }
};

world.afterEvents.blockExplode.subscribe(ev => {
  if (ev.explodedBlockPermutation?.type?.id === BASKET_ID) spill(ev.dimension, ev.block);
});
