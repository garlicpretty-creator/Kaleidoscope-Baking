// ## Kaleidoscope script role: Custom block component (mixing bowl).
// ============================================================================
// Interaction:
//   ingredient      -> add one (max 9). Liquids hand their container straight back.
//   sneak + stack   -> add the whole set for the first recipe (registry order) that the bowl's
//                      contents plus your inventory complete, using the held item; with enough
//                      for more, up to MAX_BATCH sets at once (result x N, at most one stack)
//   whisk / frother -> one stroke; enough strokes on a valid mix produces the result.
//                      The recipe's `tool` decides which one (milk + whisk = butter,
//                      milk + frother = frothed milk).
//   sneak + whisk   -> every remaining stroke, one after another (STROKE_GAP ticks apart)
//   empty hand      -> take the last ingredient back (sneak, or a batched bowl: everything)
// Tools are recognised by item TAG (`kaleidoscope_baking:whisk` / `:frother`), so other packs
// can ship their own tools without Baking knowing their ids.
// ============================================================================
import { ItemStack, system, world } from "@minecraft/server";
import {
  addToBowl, MAX_BATCH, normalizeBowl, planFullSet, strokesLeft, takeFromBowl, whiskBowl
} from "../api/mixingLogic.js";
import { containerReturnOf } from "../api/ingredients.js";
import {
  refuse, consumeHeld, giveItems, heldItem, isCreative, locKey, particle, readJson, safeBlock, sound, spawnItems, stackHasTag, writeJson
} from "../utils/runtime.js";
import { bump, KIND, playMotion, removeVisual, showContents, tintOf } from "../utils/visuals.js";

export const BOWL_ID = "kaleidoscope_baking:mixing_bowl";
const TOOL_TAGS = ["kaleidoscope_baking:whisk", "kaleidoscope_baking:frother", "kaleidoscope_baking:piping_bag"];
const PREFIX = "kb_bowl";
export const STROKE_GAP = 4;

const keyOf = block => locKey(PREFIX, block.dimension.id, block);
const top = block => ({ x: block.x + 0.5, y: block.y + 0.6, z: block.z + 0.5 });
const isTool = stack => TOOL_TAGS.some(tag => stackHasTag(stack, tag));
/** Bowls running a sneak-whisk sequence: further clicks are ignored until it is over. */
const busy = new Map(); // key -> token of the running sequence
let nextToken = 1;

function show(block, s) {
  // the batter shows how much is in the bowl and takes the colour of what went in
  showContents(block, KIND.bowl, { fill: s.items.length, tint: tintOf(s.items.map(i => i.id)) });
}
const save = (key, s) => writeJson(key, s.items.length || s.whisks ? s : undefined);

/** One stroke; returns the whiskBowl result. The result goes to the player (or drops at the bowl). */
function stroke(block, player, toolId) {
  const key = keyOf(block);
  const s = normalizeBowl(readJson(key));
  const at = top(block);
  const r = whiskBowl(s, toolId);
  if (r.result === "none") return r;
  playMotion(block, KIND.bowl, 14);
  if (r.result === "progress") {
    sound(block.dimension, "block.composter.fill", at, 0.7, 1.4);
    particle(block.dimension, "minecraft:water_splash_particle", at);
  } else {
    let valid = true;
    try { valid = player?.isValid !== false; } catch { valid = false; }
    if (valid) giveItems(player, r.recipe.result, r.count);
    else spawnItems(block.dimension, at, r.recipe.result, r.count);
    sound(block.dimension, "random.orb", at, 0.7, 1.1);
    particle(block.dimension, "minecraft:villager_happy", at);
  }
  save(key, s);
  show(block, s);
  return r;
}

/** Sneak + whisk: the remaining strokes play out by themselves, each with its own sound and splash. */
function strokeAll(block, player, toolId) {
  const key = keyOf(block);
  const n = strokesLeft(normalizeBowl(readJson(key)), toolId);
  if (!n) { refuse(block.dimension, top(block)); return; }
  stroke(block, player, toolId);
  if (n === 1) return;
  const token = nextToken++;
  busy.set(key, token);
  const dimension = block.dimension, loc = { x: block.x, y: block.y, z: block.z };
  for (let i = 1; i < n; i++) {
    const last = i === n - 1;
    system.runTimeout(() => {
      if (busy.get(key) !== token) return;
      const b = safeBlock(dimension, loc);
      if (b?.typeId !== BOWL_ID) { busy.delete(key); return; }
      if (stroke(b, player, toolId).result !== "progress" || last) busy.delete(key);
    }, STROKE_GAP * i);
  }
}

/** Counts of every item in the player's inventory (held stack included). */
function inventoryCounts(player) {
  const m = new Map();
  let inv;
  try { inv = player.getComponent("minecraft:inventory")?.container; } catch {}
  if (!inv) return m;
  for (let i = 0; i < inv.size; i++) {
    let st;
    try { st = inv.getItem(i); } catch { continue; }
    if (st) m.set(st.typeId, (m.get(st.typeId) ?? 0) + st.amount);
  }
  return m;
}

/** Remove `n` of `id` from the inventory, the held slot last (so the stack in hand lasts longest). */
function takeItems(player, id, n) {
  let inv;
  try { inv = player.getComponent("minecraft:inventory")?.container; } catch {}
  if (!inv) return;
  let held = 0;
  try { held = Number(player.selectedSlotIndex) || 0; } catch {}
  const order = [...Array(inv.size).keys()].filter(i => i !== held);
  if (held < inv.size) order.push(held);
  for (const i of order) {
    if (n <= 0) return;
    let st;
    try { st = inv.getItem(i); } catch { continue; }
    if (!st || st.typeId !== id) continue;
    const k = Math.min(n, st.amount);
    n -= k;
    try { if (st.amount > k) { st.amount -= k; inv.setItem(i, st); } else inv.setItem(i, undefined); } catch {}
  }
}

const maxStackOf = id => { try { return new ItemStack(id, 1).maxAmount || 64; } catch { return 64; } };

/** Sneak + stack: the whole set (or several) at once. Returns true if anything went in. */
function addFullSet(block, player, s, held) {
  const plan = planFullSet(s, held.typeId, inventoryCounts(player), MAX_BATCH, maxStackOf);
  if (!plan) return false;
  const creative = isCreative(player);
  for (const [id, n] of plan.take) {
    if (creative) continue;
    takeItems(player, id, n);
    const back = containerReturnOf(id);
    if (back) giveItems(player, back, n);
  }
  for (const id of plan.add) s.items.push({ id, spilled: !!containerReturnOf(id) });
  s.whisks = 0;
  s.batch = plan.batch;
  const at = top(block);
  // a fuller plop than a single ingredient, higher for each extra set
  sound(block.dimension, "random.pop", at, 0.6, 1.1 + 0.1 * plan.batch);
  sound(block.dimension, "block.composter.fill", at, 0.6, 0.9);
  bump(block, KIND.bowl);
  return true;
}

function interact(block, player) {
  const key = keyOf(block);
  if (busy.has(key)) return; // a sneak-whisk is still running
  const s = normalizeBowl(readJson(key));
  const held = heldItem(player);
  const at = top(block);
  let changed = false;

  if (held && isTool(held)) {
    if (player.isSneaking) strokeAll(block, player, held.typeId);
    else if (stroke(block, player, held.typeId).result === "none") refuse(block.dimension, at); // wrong tool, or nothing that tool can mix
    return;
  } else if (held) {
    if (player.isSneaking && addFullSet(block, player, s, held)) {
      changed = true;
    } else {
      const container = containerReturnOf(held.typeId);
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
    }
  } else {
    const before = s.items.length;
    const back = takeFromBowl(s, player.isSneaking);
    changed = s.items.length !== before;
    for (const id of back) giveItems(player, id, 1);
  }

  if (changed) save(key, s);
  show(block, s);
}

/** Spill solids on removal (every set of a batch); liquids (container already returned) are lost by design. */
function spill(dimension, loc) {
  const key = locKey(PREFIX, dimension.id, loc);
  busy.delete(key);
  const s = normalizeBowl(readJson(key));
  const at = { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 };
  for (const it of s.items) if (!it.spilled) spawnItems(dimension, at, it.id, s.batch);
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
