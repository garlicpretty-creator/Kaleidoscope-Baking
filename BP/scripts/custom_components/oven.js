// ## Kaleidoscope script role: Custom block component (3x3x3 oven).
// ============================================================================
// The player places ONE oven item. That block becomes the controller (bottom centre)
// and immediately grows into a 3x3x3 structure of the same block id; see
// utils/ovenGeometry.js for the part layout. Breaking ANY part removes the whole oven,
// returns its contents and (outside Creative) drops one oven item.
//
// Interaction (any part, decided by the held item):
//   fuel            -> add burn time            (coal, charcoal, logs, lava bucket, addon fuels)
//   oven input      -> load into a free slot    (mold is taken from the inventory if needed)
//   sneak + input   -> fill every free slot from the held stack (one mold each)
//   empty hand      -> take out finished / burnt items (+ molds)
//   sneak + empty   -> also pull out unfinished items (raw input + mold come back)
//   empty hand on the door, nothing to take -> open / close the door (it stays as it is left)
//
// The door block is hollow and the door has a window: the bake sits inside, rising as it cooks and turning
// golden when done or dark when burnt, with embers glowing behind it while the oven is lit.
//   anything else   -> show status
//
// Container below: a chest / barrel / hopper directly under the controller (the bottom
// centre block, under the middle of the oven) receives each bake the moment it turns perfect,
// mold included, so it never burns. All or nothing: when it would not all fit, the bake stays
// in (and can burn). Roasting recipes therefore always give the light roast this way. Checked
// only on the existing 1 s oven tick and only when a slot has just turned perfect (or is
// still perfect): no scans. Bedrock hoppers cannot push into custom blocks, so loading stays
// by hand.
// Cooling rack (phase 3): with no container below, a cooling rack directly below the controller or in
// front of the oven (before the firebox or the door) takes the bake instead, up to 4, shown on the rack.
//
// ## State lives in a world dynamic property per oven (Baking-owned; not shared across
// packs). One shared 1-second interval advances every known oven whose chunk is loaded;
// unloaded ovens simply pause.
// ============================================================================
import { BlockPermutation, system, world } from "@minecraft/server";
import {
  CHIMNEY_PART, CONTROLLER_PART, FACING_STATE, FACINGS, FRONT, LIT_STATE, OVEN_ID, partFromPermutation, partStates, controllerFrom, doorOutside, doorPart, facingToward, fireboxPart, footprint, partOffset
} from "../utils/ovenGeometry.js";
import {
  MAX_FUEL_TICKS, emptyOvenState, freeSlot, isLit, normalizeOvenState, percent, phaseOf, slotYield, tickOven
} from "../api/ovenLogic.js";
import { getFuel, getOvenRecipe, getOvenRecipeById } from "../api/registry.js";
import { matchesSpec } from "../api/ingredients.js";
import {
  refuse, consumeHeld, containerOf, giveItems, heldItem, insertAll, isCreative, locKey, onWorldReady, parseLocKey, particle, readJson, safeBlock, sound, spawnItems, takeOneFromInventory, writeJson
} from "../utils/runtime.js";
import { KIND, holdMotion, playMotion, removeVisual, showContents, steam, tintOf } from "../utils/visuals.js";
import { rackAcceptBake } from "./racks.js";

const PREFIX = "kb_oven";
const INDEX_KEY = "kb_oven_index";
const TICK_INTERVAL = 20;
const REPLACEABLE = new Set([
  "minecraft:air", "minecraft:short_grass", "minecraft:tall_grass", "minecraft:fern", "minecraft:large_fern",
  "minecraft:deadbush", "minecraft:leaf_litter", "minecraft:snow_layer", "minecraft:vine"
]);

/** key -> {dimensionId, loc}; every oven this world knows about. */
const ovens = new Map();
/** Facing chosen in beforeOnPlayerPlace, consumed by onPlace (keyed by location). */
const pendingFacing = new Map();
const explosionHandled = new Set();

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
function saveIndex() { writeJson(INDEX_KEY, [...ovens.keys()]); }
function keyOf(dimension, c) { return locKey(PREFIX, dimension.id, c); }
function loadState(key, facing) { const raw = readJson(key); return raw ? normalizeOvenState(raw, facing) : undefined; }
function saveState(key, s) { writeJson(key, s); }
function track(dimension, c) {
  const key = keyOf(dimension, c);
  if (!ovens.has(key)) { ovens.set(key, { dimensionId: dimension.id, loc: { ...c } }); saveIndex(); }
  return key;
}
function untrack(key) { writeJson(key, undefined); if (ovens.delete(key)) saveIndex(); }

onWorldReady(() => {
  const list = readJson(INDEX_KEY);
  for (const key of Array.isArray(list) ? list : []) {
    const p = parseLocKey(PREFIX, key);
    if (p) ovens.set(key, { dimensionId: p.dimensionId, loc: p.loc });
  }
  system.runInterval(tickAll, TICK_INTERVAL);
});

// ---------------------------------------------------------------------------
// Structure helpers
// ---------------------------------------------------------------------------
function partOf(permutation) {
  return partFromPermutation(permutation) ?? CONTROLLER_PART;
}
function facingOf(permutation) {
  try { const v = permutation.getState(FACING_STATE); return FACINGS.includes(v) ? v : "south"; } catch { return "south"; }
}
function isReplaceable(b) {
  if (!b) return false;
  try { if (b.isAir) return true; } catch {}
  return REPLACEABLE.has(b.typeId);
}
function controllerBlock(dimension, c) {
  const b = safeBlock(dimension, c);
  return b?.typeId === OVEN_ID && partOf(b.permutation) === CONTROLLER_PART ? b : undefined;
}
function partPermutation(index, facing, lit = false) {
  return BlockPermutation.resolve(OVEN_ID, { ...partStates(index), [FACING_STATE]: facing, [LIT_STATE]: lit });
}
function centre(c) { return { x: c.x + 0.5, y: c.y + 1.0, z: c.z + 0.5 }; }

function playerInside(player, c) {
  const p = player.location;
  return p.x > c.x - 1.3 && p.x < c.x + 2.3 && p.z > c.z - 1.3 && p.z < c.z + 2.3 && p.y > c.y - 1.8 && p.y < c.y + 3;
}

/** Fill / repair the 26 helper parts. Returns false if something blocks the footprint. */
function buildParts(dimension, c, facing) {
  const parts = footprint(c).filter(p => p.index !== CONTROLLER_PART);
  for (const p of parts) {
    const b = safeBlock(dimension, p);
    if (!b) return false;
    if (b.typeId === OVEN_ID) continue;
    if (!isReplaceable(b)) return false;
  }
  for (const p of parts) {
    const b = safeBlock(dimension, p);
    if (b && b.typeId !== OVEN_ID) try { b.setPermutation(partPermutation(p.index, facing)); } catch {}
  }
  return true;
}

function removeStructure(dimension, c) {
  for (const p of footprint(c)) {
    const b = safeBlock(dimension, p);
    if (b?.typeId === OVEN_ID) try { b.setType("minecraft:air"); } catch {}
  }
}

/** Remove the oven completely, spilling every slot's yield. Contents are never lost. */
function destroyOven(dimension, c, dropOvenItem) {
  const key = keyOf(dimension, c);
  const s = loadState(key);
  // Already torn down (e.g. a second explosion callback for another part): never refund twice.
  if (!s && !footprint(c).some(p => safeBlock(dimension, p)?.typeId === OVEN_ID)) return;
  const at = centre(c);
  if (s) for (const slot of s.slots) for (const y of slotYield(slot, getOvenRecipeById(slot?.recipe))) spawnItems(dimension, at, y.id, y.count);
  if (dropOvenItem) spawnItems(dimension, at, OVEN_ID, 1);
  for (const f of FACINGS) {
    const o = partOffset(doorPart(f));
    removeVisual({ dimension, x: c.x + o.dx, y: c.y + o.dy, z: c.z + o.dz });
  }
  removeStructure(dimension, c);
  untrack(key);
}

// ---------------------------------------------------------------------------
// Door visual (station_visual kind 7): swings open when something goes in or out and stays open if the player
// left it open; the bake shows inside, and embers glow while the oven is lit
// ---------------------------------------------------------------------------
function doorBlock(dimension, c, facing) {
  const o = partOffset(doorPart(facing));
  return safeBlock(dimension, { x: c.x + o.dx, y: c.y + o.dy, z: c.z + o.dz });
}
function openDoor(dimension, c, facing) {
  const d = doorBlock(dimension, c, facing);
  if (d?.typeId === OVEN_ID) playMotion(d, KIND.oven, 30);
}
const TINT_BURNT = 6, TINT_BAKED = 7; // visuals TINTS: coffee-dark, caramel-gold
function showDoor(dimension, c, facing, lit, s) {
  const d = doorBlock(dimension, c, facing);
  if (d?.typeId !== OVEN_ID) return;
  const slots = (s?.slots ?? []).filter(Boolean);
  let tint = 0, progress = 0;
  if (slots.length) {
    const recipes = slots.map(slot => getOvenRecipeById(slot.recipe));
    const phases = slots.map((slot, i) => phaseOf(slot, recipes[i]));
    tint = phases.includes("burnt") ? TINT_BURNT : phases.every(p => p === "perfect") ? TINT_BAKED : tintOf(slots.map(slot => slot.input));
    progress = Math.max(...slots.map((slot, i) => percent(slot, recipes[i]))) / 100;
  }
  showContents(d, KIND.oven, { fill: slots.length, tint, progress, lit });
  holdMotion(d, KIND.oven, !!s?.open);
}

function setLit(dimension, c, facing, lit) {
  const o = partOffset(fireboxPart(facing));
  const b = safeBlock(dimension, { x: c.x + o.dx, y: c.y + o.dy, z: c.z + o.dz });
  if (b?.typeId !== OVEN_ID) return;
  try { if (b.permutation.getState(LIT_STATE) !== lit) b.setPermutation(b.permutation.withState(LIT_STATE, lit)); } catch {}
}

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------
function addFuel(player, dimension, c, s, held, fuel) {
  if (s.fuel + fuel.ticks > MAX_FUEL_TICKS) { refuse(dimension, centre(c)); return; }
  s.fuel += fuel.ticks;
  consumeHeld(player, 1);
  if (fuel.returns && !isCreative(player)) giveItems(player, fuel.returns, 1);
  sound(dimension, "fire.ignite", centre(c));
}

function loadInput(player, dimension, c, s, held, recipe, quiet = false) {
  const i = freeSlot(s);
  if (i < 0) { if (!quiet) refuse(dimension, centre(c)); return false; }
  let mold = "";
  if (recipe.mold && !isCreative(player)) {
    mold = takeOneFromInventory(player, st => matchesSpec(st.typeId, recipe.mold)) ?? "";
    if (!mold) {
      if (!quiet) refuse(dimension, centre(c));
      return false;
    }
  }
  s.slots[i] = { recipe: recipe.id, input: held.typeId, mold, progress: 0 };
  consumeHeld(player, 1);
  sound(dimension, "random.click", centre(c), 0.8, 0.8);
  return true;
}

/** Sneak + stack: as many as there are free slots (and molds). Returns how many went in. */
function loadAll(player, dimension, c, s, held, recipe) {
  let n = 0;
  while (freeSlot(s) >= 0) {
    const h = heldItem(player);
    if (!h || h.typeId !== held.typeId) break;
    if (!loadInput(player, dimension, c, s, h, recipe, n > 0)) break;
    n++;
  }
  return n;
}

/** Where a cooling rack may stand: under the controller, or in front of the oven at the firebox or the door. */
export function rackSpots(c, facing) {
  const f = FRONT[facing] ?? FRONT.south;
  return [{ x: c.x, y: c.y - 1, z: c.z }, { x: c.x + f.x * 2, y: c.y, z: c.z + f.z * 2 }, { x: c.x + f.x * 2, y: c.y + 1, z: c.z + f.z * 2 }];
}

/** Perfect bakes go straight into a container under the controller, or onto a cooling rack. True if any did. */
function ejectPerfect(dimension, c, s, facing) {
  const ready = s.slots.some(slot => slot && phaseOf(slot, getOvenRecipeById(slot.recipe)) === "perfect");
  if (!ready) return false;
  const container = containerOf(safeBlock(dimension, { x: c.x, y: c.y - 1, z: c.z }));
  const racks = container ? [] : rackSpots(c, facing);
  let moved = false;
  s.slots.forEach((slot, i) => {
    if (!slot) return;
    const recipe = getOvenRecipeById(slot.recipe);
    if (phaseOf(slot, recipe) !== "perfect") return;
    const out = slotYield(slot, recipe);
    if (container ? !insertAll(container, out) : !racks.some(p => rackAcceptBake(dimension, p, out))) return;
    s.slots[i] = null;
    moved = true;
  });
  return moved;
}

function takeOut(player, dimension, c, s) {
  let took = 0;
  const abort = player.isSneaking;
  s.slots.forEach((slot, i) => {
    if (!slot) return;
    const recipe = getOvenRecipeById(slot.recipe);
    const phase = phaseOf(slot, recipe);
    if (phase === "perfect" || phase === "burnt" || abort) {
      for (const y of slotYield(slot, recipe)) giveItems(player, y.id, y.count);
      s.slots[i] = null;
      took++;
    }
  });
  if (took) sound(dimension, "random.pop", centre(c), 0.6, 1.0);
  return took;
}

function interact(block, player) {
  const dimension = block.dimension;
  const c = controllerFrom(block, partOf(block.permutation));
  const ctrl = c && controllerBlock(dimension, c);
  if (!ctrl) return;
  const facing = facingOf(ctrl.permutation);
  // Self-heal: a helper removed by commands/other addons is rebuilt when possible.
  buildParts(dimension, c, facing);
  const key = track(dimension, c);
  const s = loadState(key, facing) ?? emptyOvenState(facing);

  const held = heldItem(player);
  let changed = false, toggled = false;
  if (held) {
    const fuel = getFuel(held.typeId);
    const recipe = fuel ? undefined : getOvenRecipe(held.typeId);
    if (fuel) { addFuel(player, dimension, c, s, held, fuel); changed = true; }
    else if (recipe && player.isSneaking) changed = loadAll(player, dimension, c, s, held, recipe) > 0 || (refuse(dimension, centre(c)), false);
    else if (recipe) changed = loadInput(player, dimension, c, s, held, recipe);
    else refuse(dimension, centre(c)); // neither fuel nor something that bakes
  } else if (takeOut(player, dimension, c, s)) {
    changed = true;
  } else if (partOf(block.permutation) === doorPart(facing)) {
    // Nothing to take: the door itself opens or closes, and stays that way.
    s.open = !s.open;
    changed = toggled = true;
    sound(dimension, s.open ? "open.iron_door" : "close.iron_door", doorOutside(c, facing), 0.8, 1.0);
  }
  if (changed) {
    saveState(key, s);
    const lit = isLit(s, getOvenRecipeById);
    setLit(dimension, c, facing, lit);
    if (!toggled && !getFuel(held?.typeId ?? "")) openDoor(dimension, c, facing); // loading / taking out opens the door
    showDoor(dimension, c, facing, lit, s);
  }
}

// ---------------------------------------------------------------------------
// Ticking
// ---------------------------------------------------------------------------
function tickAll() {
  for (const [key, o] of [...ovens]) {
    let dimension;
    try { dimension = world.getDimension(o.dimensionId); } catch { continue; }
    const b = safeBlock(dimension, o.loc);
    if (!b) continue; // chunk not loaded: pause
    if (b.typeId !== OVEN_ID || partOf(b.permutation) !== CONTROLLER_PART) {
      // Controller vanished without our handlers (commands, other addons). Return contents.
      const s = loadState(key);
      if (s) for (const slot of s.slots) for (const y of slotYield(slot, getOvenRecipeById(slot?.recipe))) spawnItems(dimension, centre(o.loc), y.id, y.count);
      untrack(key);
      continue;
    }
    const facing = facingOf(b.permutation);
    const s = loadState(key, facing);
    if (!s) continue;
    const res = tickOven(s, TICK_INTERVAL, getOvenRecipeById);
    const ejected = ejectPerfect(dimension, o.loc, s, facing);
    if (res.changed || ejected) saveState(key, s);
    if (ejected) {
      res.lit = isLit(s, getOvenRecipeById);
      sound(dimension, "random.pop", { x: o.loc.x + 0.5, y: o.loc.y, z: o.loc.z + 0.5 }, 0.6, 1.0);
    }
    setLit(dimension, o.loc, facing, res.lit);
    showDoor(dimension, o.loc, facing, res.lit, s);
    if (res.lit) {
      const top = partOffset(CHIMNEY_PART);
      particle(dimension, "minecraft:campfire_smoke_particle", { x: o.loc.x + 0.5, y: o.loc.y + top.dy + 1.1, z: o.loc.z + 0.5 });
    }
    const door = doorOutside(o.loc, facing);
    for (const ev of res.events) {
      if (ev.phase === "perfect") {
        steam(dimension, door);
        sound(dimension, "random.orb", door, 0.8, 1.2);
        particle(dimension, "minecraft:villager_happy", door);
      } else if (ev.phase === "burnt") {
        sound(dimension, "random.fizz", door, 0.8, 0.8);
        particle(dimension, "minecraft:large_explosion", door);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const ovenComponent = {
  beforeOnPlayerPlace(e) {
    const { block, player } = e;
    if (!player) return;
    const c = { x: block.x, y: block.y, z: block.z };
    if (playerInside(player, c)) { e.cancel = true; refuse(block.dimension, { x: c.x + 0.5, y: c.y + 0.5, z: c.z + 0.5 }); return; }
    for (const p of footprint(c)) {
      if (p.index === CONTROLLER_PART) continue;
      if (!isReplaceable(safeBlock(block.dimension, p))) { e.cancel = true; refuse(block.dimension, { x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 }); return; }
    }
    const facing = facingToward(player.location.x - (c.x + 0.5), player.location.z - (c.z + 0.5));
    pendingFacing.set(locKey(PREFIX, block.dimension.id, c), facing);
    try { e.permutationToPlace = partPermutation(CONTROLLER_PART, facing); } catch {}
  },

  onPlace({ block }) {
    if (partOf(block.permutation) !== CONTROLLER_PART) return;
    const dimension = block.dimension;
    const c = { x: block.x, y: block.y, z: block.z };
    const key = keyOf(dimension, c);
    if (readJson(key)) return; // already an initialised oven (e.g. permutation refresh)
    const facing = pendingFacing.get(key) ?? facingOf(block.permutation);
    pendingFacing.delete(key);
    system.run(() => {
      const ctrl = controllerBlock(dimension, c);
      if (!ctrl || readJson(key)) return;
      saveState(key, emptyOvenState(facing));
      track(dimension, c);
      try { if (facingOf(ctrl.permutation) !== facing) ctrl.setPermutation(partPermutation(CONTROLLER_PART, facing)); } catch {}
      if (!buildParts(dimension, c, facing)) {
        // Something moved into the footprint between the check and the build: undo + refund.
        destroyOven(dimension, c, true);
        return;
      }
      showDoor(dimension, c, facing, false);
    });
  },

  onPlayerInteract({ block, player }) {
    if (player) interact(block, player);
  },

  onPlayerBreak({ block, brokenBlockPermutation, player }) {
    const c = controllerFrom(block, partOf(brokenBlockPermutation));
    if (c) destroyOven(block.dimension, c, !isCreative(player));
  }
};

world.afterEvents.blockExplode.subscribe(ev => {
  if (ev.explodedBlockPermutation?.type?.id !== OVEN_ID) return;
  const c = controllerFrom(ev.block, partOf(ev.explodedBlockPermutation));
  if (!c) return;
  const k = keyOf(ev.dimension, c);
  if (explosionHandled.has(k)) return;
  explosionHandled.add(k);
  system.run(() => explosionHandled.delete(k));
  destroyOven(ev.dimension, c, true);
});
