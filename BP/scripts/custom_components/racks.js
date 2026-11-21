// ## Kaleidoscope script role: Custom block components (cooling rack, mug rack; convenience update phase 3).
// ============================================================================
// cooling_rack  Directly below the oven, or in front of it (at the firebox or the door), it catches each bake
//               the moment it turns perfect (instead of a chest; a chest below still works and comes first).
//               Up to 4 bakes, shown on the wire grid, steaming for a minute while they cool.
//               Empty hand: take the oldest bake (its mold comes with it); sneak: take them all.
// mug_rack      A mug tree for 6 mugs (shown). Beside the espresso machine, the machine takes an empty mug
//               from it and hangs the finished drink back in its place (see espressoMachine.js).
//               Coffee Mug / mug drink: hang one (sneak: as many as fit); empty hand: take a drink first,
//               else an empty mug (sneak: everything).
// Nothing is lost: breaking either drops what is on it. No text: what is on the rack shows itself.
// Script cost: only racks with warm bakes tick (once a second, for the steam).
// ============================================================================
import { world } from "@minecraft/server";
import { CONTENT } from "../data/generated/content.js";
import {
  addBake, coolingEmpty, coolTick, emptyMugIndex, fillMug, hangMugs, mugsEmpty, normalizeCooling, normalizeMugs, shownBake,
  takeBakes, takeMugs, COOLING_SLOTS, MUG_SLOTS
} from "../api/rackLogic.js";
import { clearDisplays, syncDisplay } from "../utils/display.js";
import { consumeHeld, giveItems, heldItem, refuse, safeBlock, sound, spawnItems } from "../utils/runtime.js";
import { loadStation, registerTicker, saveStation, trackStation, untrackStation } from "../utils/stations.js";
import { steam } from "../utils/visuals.js";

export const COOLING_RACK_ID = "kaleidoscope_baking:cooling_rack";
export const MUG_RACK_ID = "kaleidoscope_baking:mug_rack";
export const COFFEE_MUG = "kaleidoscope_baking:coffee_mug";
const COOL_PREFIX = "kb_cooling";
const MUG_PREFIX = "kb_mugrack";
const COOL_TICK = 20;

const centre = b => ({ x: b.x + 0.5, y: b.y + 0.5, z: b.z + 0.5 });
const fake = (dimension, loc) => ({ dimension, x: loc.x, y: loc.y, z: loc.z });

// ---------------------------------------------------------------------------
// Cooling rack (tools/art/stations.py: wire grid top at y = 5.5)
// ---------------------------------------------------------------------------
export const COOL_SPOTS = Object.freeze([{ x: 0.28, y: 0.4, z: 0.28 }, { x: 0.72, y: 0.4, z: 0.28 },
  { x: 0.28, y: 0.4, z: 0.72 }, { x: 0.72, y: 0.4, z: 0.72 }]);

function refreshCooling(block, s) {
  for (let i = 0; i < COOLING_SLOTS; i++) syncDisplay(block, `bake${i}`, shownBake(s, i), COOL_SPOTS[i]);
}
function saveCooling(block, s) {
  saveStation(COOL_PREFIX, block, s, coolingEmpty);
  if (s.bakes.some(b => b.warm > 0)) trackStation(COOL_PREFIX, block); else untrackStation(COOL_PREFIX, block);
}
function puff(block, i) {
  const p = COOL_SPOTS[i];
  steam(block.dimension, { x: block.x + p.x, y: block.y + 0.45, z: block.z + p.z });
}

/** The oven hands a perfect bake (`items` = [{id, count}], mold included) to a rack at `loc`. False = no rack / full. */
export function rackAcceptBake(dimension, loc, items) {
  const block = safeBlock(dimension, loc);
  if (block?.typeId !== COOLING_RACK_ID) return false;
  const s = loadStation(COOL_PREFIX, block, normalizeCooling);
  if (!addBake(s, items)) return false;
  saveCooling(block, s);
  refreshCooling(block, s);
  puff(block, s.bakes.length - 1);
  sound(dimension, "random.pop", centre(block), 0.5, 1.2);
  return true;
}

registerTicker(COOL_PREFIX, COOLING_RACK_ID, COOL_TICK, normalizeCooling, coolingEmpty, (block, s) => {
  const warm = coolTick(s, COOL_TICK);
  for (const i of warm) puff(block, i);
  return { state: s, keep: warm.length > 0 };
});

function spillCooling(dimension, loc) {
  const b = fake(dimension, loc);
  const s = loadStation(COOL_PREFIX, b, normalizeCooling);
  for (const bake of s.bakes) for (const it of bake.items) spawnItems(dimension, centre(b), it.id, it.count);
  saveStation(COOL_PREFIX, b, {}, () => true);
  untrackStation(COOL_PREFIX, b);
  clearDisplays(dimension, loc);
}

export const coolingRackComponent = {
  onPlayerInteract({ block, player }) {
    if (!player) return;
    const s = loadStation(COOL_PREFIX, block, normalizeCooling);
    if (heldItem(player) || !s.bakes.length) { refuse(block.dimension, centre(block)); return; }
    for (const items of takeBakes(s, player.isSneaking)) for (const it of items) giveItems(player, it.id, it.count);
    sound(block.dimension, "random.pop", centre(block), 0.6, 1.0);
    saveCooling(block, s);
    refreshCooling(block, s);
  },
  onPlayerBreak({ block }) { spillCooling(block.dimension, block); }
};

// ---------------------------------------------------------------------------
// Mug rack (tools/art/stations.py: pegs along x at y 4.5..5.5, along z at y 8..9, along x at y 11.5..12.5)
// ---------------------------------------------------------------------------
const R = 0.25;
export const MUG_SPOTS = Object.freeze([
  { x: 0.5 + R, y: 0.16, z: 0.5 }, { x: 0.5 - R, y: 0.16, z: 0.5 },
  { x: 0.5, y: 0.38, z: 0.5 + R }, { x: 0.5, y: 0.38, z: 0.5 - R },
  { x: 0.5 + R, y: 0.6, z: 0.5 }, { x: 0.5 - R, y: 0.6, z: 0.5 }]);

/** Empty mugs and the mug drinks that stack (espresso drinks, pour-overs). Shaken drinks keep their
 *  sweetness / ice on the item, so they stay off the rack. */
export const hangable = id => id === COFFEE_MUG || CONTENT.mugs.includes(id);
const isEmptyMug = id => id === COFFEE_MUG;

let mugListener = () => {};
/** espressoMachine.js: called with the rack block whenever mugs are hung, so a waiting drink is served. */
export function setMugRackListener(fn) { mugListener = typeof fn === "function" ? fn : () => {}; }

function refreshMugs(block, s) {
  for (let i = 0; i < MUG_SLOTS; i++) syncDisplay(block, `mug${i}`, s.mugs[i], MUG_SPOTS[i], { small: true });
}
const loadMugs = block => loadStation(MUG_PREFIX, block, normalizeMugs);
function saveMugs(block, s) {
  saveStation(MUG_PREFIX, block, s, mugsEmpty);
  refreshMugs(block, s);
}

/** The machine takes an empty `carrier` from the rack and hangs `drink` in its place. False = none there. */
export function rackServe(rack, carrier, drink) {
  const s = loadMugs(rack);
  const i = emptyMugIndex(s, carrier);
  if (!fillMug(s, i, drink)) return false;
  saveMugs(rack, s);
  sound(rack.dimension, "random.pop", centre(rack), 0.5, 1.3);
  steam(rack.dimension, { x: rack.x + MUG_SPOTS[i].x, y: rack.y + MUG_SPOTS[i].y + 0.2, z: rack.z + MUG_SPOTS[i].z });
  return true;
}
/** The machine takes an empty `carrier` off the rack (the drink went into a container instead). */
export function rackTakeMug(rack, carrier) {
  const s = loadMugs(rack);
  const i = emptyMugIndex(s, carrier);
  if (i < 0) return false;
  s.mugs.splice(i, 1);
  saveMugs(rack, s);
  return true;
}
export const rackHasMug = (rack, carrier) => emptyMugIndex(loadMugs(rack), carrier) >= 0;

/** A mug rack on one of the four sides of `block`, or undefined. */
export function mugRackBeside(block) {
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const b = safeBlock(block.dimension, { x: block.x + dx, y: block.y, z: block.z + dz });
    if (b?.typeId === MUG_RACK_ID) return b;
  }
  return undefined;
}

export const mugRackComponent = {
  onPlayerInteract({ block, player }) {
    if (!player) return;
    const s = loadMugs(block);
    const held = heldItem(player);
    if (held) {
      if (!hangable(held.typeId)) { refuse(block.dimension, centre(block)); return; }
      const n = hangMugs(s, held.typeId, player.isSneaking ? held.amount : 1);
      if (!n) { refuse(block.dimension, centre(block)); return; }
      consumeHeld(player, n);
      sound(block.dimension, "random.click", centre(block), 0.5, 1.6);
      saveMugs(block, s);
      mugListener(block);
      return;
    }
    const back = takeMugs(s, isEmptyMug, player.isSneaking);
    if (!back.length) { refuse(block.dimension, centre(block)); return; }
    for (const id of back) giveItems(player, id, 1);
    sound(block.dimension, "random.pop", centre(block), 0.6, 1.1);
    saveMugs(block, s);
  },
  onPlayerBreak({ block }) { spillMugs(block.dimension, block); }
};

function spillMugs(dimension, loc) {
  const b = fake(dimension, loc);
  for (const id of loadMugs(b).mugs) spawnItems(dimension, centre(b), id, 1);
  saveStation(MUG_PREFIX, b, {}, () => true);
  clearDisplays(dimension, loc);
}

world.afterEvents.blockExplode.subscribe(ev => {
  const id = ev.explodedBlockPermutation?.type?.id;
  if (id === COOLING_RACK_ID) spillCooling(ev.dimension, ev.block);
  else if (id === MUG_RACK_ID) spillMugs(ev.dimension, ev.block);
});
