// ## Kaleidoscope script role: Custom block component (stand mixer, convenience update phase 3).
// ============================================================================
// The mixing bowl's job without the whisk work: the same recipes (api/mixingLogic.js), loaded the
// same way, and every stroke runs by itself.
//   ingredient        -> add one (max 9); liquids hand their container back
//   sneak + stack     -> the whole set (or up to MAX_BATCH sets), exactly like the bowl
//   empty hand / whisk on a mix that makes something -> turn the crank: every stroke plays out,
//                        STROKE_GAP ticks apart, beater and crank turning, each stroke with its sound
//   redstone pulse    -> the same as turning the crank (rising edge only: a lever left on does not
//                        mix a half-loaded bowl)
//   empty hand        -> take the result; otherwise the last ingredient back (sneak: everything)
// Whisk recipes first, then frother recipes (the mixer has both attachments). Piping-bag work stays at
// the bowl. The result drops into a chest / barrel / hopper under the mixer when there is one (all or
// nothing), otherwise it waits in the bowl to be taken by hand.
// Script cost: a mixer is polled for redstone (every POLL ticks) only while it holds ingredients.
// ============================================================================
import { system, world } from "@minecraft/server";
import { addToBowl, normalizeBowl, strokesLeft, takeFromBowl, whiskBowl } from "../api/mixingLogic.js";
import { normalizeMixerOut, risingEdge } from "../api/rackLogic.js";
import { containerReturnOf } from "../api/ingredients.js";
import {
  consumeHeld, containerOf, giveItems, heldItem, insertAll, isCreative, particle, refuse, safeBlock, sound, spawnItems, stackHasTag
} from "../utils/runtime.js";
import { loadStation, registerTicker, saveStation, stationKey, trackStation, untrackStation } from "../utils/stations.js";
import { bump, KIND, playMotion, removeVisual, showContents, tintOf } from "../utils/visuals.js";
import { addFullSet, STROKE_GAP } from "./mixingBowl.js";
import { redstonePower } from "./espressoMachine.js";

export const MIXER_ID = "kaleidoscope_baking:stand_mixer";
const PREFIX = "kb_mixer";
const POLL = 5; // a stone button's pulse is 20 ticks, so a 5-tick poll never misses one
/** The mixer's attachments, in the order it tries them. */
export const MIXER_TOOLS = Object.freeze(["kaleidoscope_baking:whisk", "kaleidoscope_baking:milk_frother"]);
const TOOL_TAGS = ["kaleidoscope_baking:whisk", "kaleidoscope_baking:frother"];

const normalize = raw => ({ bowl: normalizeBowl(raw?.bowl), out: normalizeMixerOut(raw?.out), powered: !!raw?.powered });
const isEmpty = s => !s.bowl.items.length && !s.out;
const top = b => ({ x: b.x + 0.5, y: b.y + 0.5, z: b.z + 0.5 });
const busy = new Map(); // key -> token of the running sequence
let nextToken = 1;

/** The attachment that mixes the current contents, or undefined. */
export const mixerTool = bowl => MIXER_TOOLS.find(t => strokesLeft(bowl, t) > 0);

const load = block => loadStation(PREFIX, block, normalize);
function save(block, s) {
  saveStation(PREFIX, block, s, isEmpty);
  if (s.bowl.items.length) trackStation(PREFIX, block); else untrackStation(PREFIX, block);
}
function show(block, s) {
  // the batter in the bowl; a finished result sits there too until it is taken
  const ids = s.out ? [s.out.id] : s.bowl.items.map(i => i.id);
  showContents(block, KIND.mixer, { fill: s.out ? 5 : s.bowl.items.length, tint: tintOf(ids) });
}

/** A waiting result goes into the container under the mixer, if it all fits. */
function flushOut(block, s) {
  if (!s.out) return false;
  const below = containerOf(safeBlock(block.dimension, { x: block.x, y: block.y - 1, z: block.z }));
  if (!below || !insertAll(below, [s.out])) return false;
  s.out = null;
  return true;
}

function strokeOnce(block, tool) {
  const s = load(block);
  const r = whiskBowl(s.bowl, tool);
  if (r.result === "none") return r;
  const at = top(block);
  playMotion(block, KIND.mixer, STROKE_GAP + 8);
  sound(block.dimension, "block.composter.fill", at, 0.7, 1.4);
  sound(block.dimension, "random.click", at, 0.25, 1.6); // the crank's gear
  particle(block.dimension, "minecraft:water_splash_particle", at);
  if (r.result === "done") {
    s.out = { id: r.recipe.result, count: r.count };
    const moved = flushOut(block, s);
    sound(block.dimension, "random.orb", at, 0.7, 1.1);
    particle(block.dimension, "minecraft:villager_happy", at);
    if (moved) sound(block.dimension, "random.pop", { x: at.x, y: block.y, z: at.z }, 0.6, 1.0);
  }
  save(block, s);
  show(block, s);
  return r;
}

/** Crank or redstone: every stroke the mix needs, one after another. Returns false when nothing can run. */
export function runMixer(block) {
  const key = stationKey(PREFIX, block);
  if (busy.has(key)) return true;
  const s = load(block);
  if (s.out && !flushOut(block, s)) return false; // the last result is still in the bowl
  const tool = mixerTool(s.bowl);
  if (!tool) return false;
  const n = strokesLeft(s.bowl, tool);
  save(block, s);
  if (n > 1) busy.set(key, nextToken);
  const token = nextToken++;
  strokeOnce(block, tool);
  const dimension = block.dimension, loc = { x: block.x, y: block.y, z: block.z };
  for (let i = 1; i < n; i++) {
    const last = i === n - 1;
    system.runTimeout(() => {
      if (busy.get(key) !== token) return;
      const b = safeBlock(dimension, loc);
      if (b?.typeId !== MIXER_ID) { busy.delete(key); return; }
      if (strokeOnce(b, tool).result !== "progress" || last) busy.delete(key);
    }, STROKE_GAP * i);
  }
  return true;
}

function interact(block, player) {
  const key = stationKey(PREFIX, block);
  if (busy.has(key)) return; // still mixing
  const s = load(block);
  const held = heldItem(player);
  const at = top(block);
  const isTool = held && TOOL_TAGS.some(t => stackHasTag(held, t));

  if (!held || isTool) {
    if (s.out) {
      giveItems(player, s.out.id, s.out.count);
      s.out = null;
      sound(block.dimension, "random.pop", at, 0.6, 1.1);
    } else if (!player.isSneaking && mixerTool(s.bowl)) {
      runMixer(block);
      return;
    } else {
      const back = isTool ? [] : takeFromBowl(s.bowl, player.isSneaking);
      if (!back.length) { refuse(block.dimension, at); return; }
      for (const id of back) giveItems(player, id, 1);
    }
  } else if (s.out) {
    refuse(block.dimension, at); // take the result first
    return;
  } else if (player.isSneaking && addFullSet(block, player, s.bowl, held, KIND.mixer)) {
    // whole sets went in (sound and bounce come from addFullSet)
  } else {
    const container = containerReturnOf(held.typeId);
    const r = addToBowl(s.bowl, held.typeId, !!container);
    if (!r.ok) { refuse(block.dimension, at); return; }
    consumeHeld(player, 1);
    if (container && !isCreative(player)) giveItems(player, container, 1);
    sound(block.dimension, "random.pop", at, 0.4, 1.5);
    bump(block, KIND.mixer);
  }
  s.powered = redstonePower(block) > 0; // a signal already on when loading is not a pulse
  save(block, s);
  show(block, s);
}

// Redstone: only mixers holding ingredients are visited.
registerTicker(PREFIX, MIXER_ID, POLL, normalize, isEmpty, (block, s) => {
  const key = stationKey(PREFIX, block);
  const edge = risingEdge(s, redstonePower(block));
  if (!edge || busy.has(key)) return { state: s, keep: s.bowl.items.length > 0 };
  saveStation(PREFIX, block, s, isEmpty);
  if (!runMixer(block)) refuse(block.dimension, top(block));
  const now = load(block);
  return { state: now, keep: now.bowl.items.length > 0 };
});

function spill(dimension, loc) {
  const fake = { dimension, x: loc.x, y: loc.y, z: loc.z };
  busy.delete(stationKey(PREFIX, fake));
  const s = load(fake);
  const at = { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 };
  for (const it of s.bowl.items) if (!it.spilled) spawnItems(dimension, at, it.id, s.bowl.batch);
  if (s.out) spawnItems(dimension, at, s.out.id, s.out.count);
  saveStation(PREFIX, fake, {}, () => true);
  untrackStation(PREFIX, fake);
  removeVisual(fake);
}

export const standMixerComponent = {
  onPlace({ block }) { show(block, load(block)); }, // the beater and crank are visual parts
  onPlayerInteract({ block, player }) { if (player) interact(block, player); },
  onPlayerBreak({ block }) { spill(block.dimension, block); }
};

world.afterEvents.blockExplode.subscribe(ev => {
  if (ev.explodedBlockPermutation?.type?.id === MIXER_ID) spill(ev.dimension, ev.block);
});
