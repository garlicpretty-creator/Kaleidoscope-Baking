// ## Kaleidoscope script role: Custom block component (espresso machine).
// Requires REDSTONE POWER (decided: proposal §9.1). Signal strength speeds it up
// (15 = ~50% faster). One drink at a time:
//   water bucket       -> fill the tank (4 shots); when the tank is already full, a water
//                         bucket is used as the "hot water" additive instead (americano)
//   additive           -> frothed milk / milk foam / chocolate sauce / caramel / cinnamon...
//   ground coffee      -> starts brewing once powered and filled
//   empty hand         -> take the finished drink (a Coffee Mug is taken from your inventory)
//   sneak + empty      -> take back what you put in
// Mug rack beside it (phase 3): when a drink is done the machine takes an empty Coffee Mug from the rack and
// hangs the drink back in its place; with a chest / barrel / hopper under the machine the drink (and its grounds)
// goes in there instead and the mug leaves the rack. Grounds of drinks hung on the rack wait in the machine
// for the next empty-hand click. A drink still waiting is served as soon as mugs are hung on the rack.
// Container above (phase 3): water buckets (their empty bucket goes back in their place) and ground coffee
// are pulled from it when the machine runs dry or finishes, and on an empty-hand click with nothing to take.
// ## getRedstonePower() is read on the machine and its neighbours, because a lever or
// redstone block next to it powers the neighbour cell, not always the custom block itself.
import { ItemStack, world } from "@minecraft/server";
import { ESPRESSO_WATER_MAX, loadEspressoAdditive, loadEspressoCoffee, normalizeEspresso, tickEspresso } from "../api/stationLogic.js";
import { containerReturnOf } from "../api/ingredients.js";
import { all } from "../api/registry.js";
import {
  refuse, consumeHeld, containerOf, giveItems, heldItem, insertAll, isCreative, particle, safeBlock, sound, spawnItems, takeCarrier
} from "../utils/runtime.js";
import { mugRackBeside, rackHasMug, rackServe, rackTakeMug, setMugRackListener } from "./racks.js";
import { KIND, removeVisual, setMotion, showContents, steam } from "../utils/visuals.js";
import { loadStation, registerTicker, saveStation, trackStation, untrackStation } from "../utils/stations.js";

export const ESPRESSO_ID = "kaleidoscope_baking:espresso_machine";
const PREFIX = "kb_espresso";
const TICK = 10;
const isEmpty = s => !s.water && !s.coffee && !s.additive && !s.ready && !s.grounds;
const spout = b => ({ x: b.x + 0.5, y: b.y + 0.5, z: b.z + 0.5 });

export function redstonePower(block) {
  let p = 0;
  const read = b => { try { return Number(b?.getRedstonePower?.()) || 0; } catch { return 0; } };
  p = Math.max(p, read(block));
  for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0], [0, 1, 0]]) {
    const n = safeBlock(block.dimension, { x: block.x + dx, y: block.y + dy, z: block.z + dz });
    p = Math.max(p, read(n));
  }
  return Math.min(15, p);
}

function carrierFor(resultId) {
  return all("espresso").find(r => r.result === resultId)?.carrier ?? "";
}
const byproductFor = resultId => all("espresso").find(r => r.result === resultId)?.byproduct;

/** The finished drink goes onto a mug rack beside the machine (or into a container below). True if it did. */
export function serveToRack(block, s) {
  if (!s.ready) return false;
  const rack = mugRackBeside(block);
  const cup = carrierFor(s.ready);
  if (!rack || !cup || !rackHasMug(rack, cup)) return false;
  const by = byproductFor(s.ready);
  const below = containerOf(safeBlock(block.dimension, { x: block.x, y: block.y - 1, z: block.z }));
  if (below && insertAll(below, [{ id: s.ready, count: 1 }, ...(by ? [{ id: by, count: 1 }] : [])])) {
    rackTakeMug(rack, cup);
    sound(block.dimension, "random.pop", { x: block.x + 0.5, y: block.y, z: block.z + 0.5 }, 0.6, 1.0);
  } else {
    if (!rackServe(rack, cup, s.ready)) return false;
    if (by) s.grounds = (s.grounds ?? 0) + 1;
  }
  s.ready = "";
  showContents(block, KIND.espresso, { fill: 0 });
  return true;
}

/** Water and ground coffee from a container on top of the machine. True if anything came in. */
export function pullFromAbove(block, s) {
  const c = containerOf(safeBlock(block.dimension, { x: block.x, y: block.y + 1, z: block.z }));
  if (!c) return false;
  let pulled = false;
  for (let i = 0; i < c.size && s.water < ESPRESSO_WATER_MAX; i++) {
    let st;
    try { st = c.getItem(i); } catch { continue; }
    if (st?.typeId !== "minecraft:water_bucket") continue;
    try { c.setItem(i, new ItemStack("minecraft:bucket", 1)); } catch { continue; }
    s.water = ESPRESSO_WATER_MAX;
    pulled = true;
    sound(block.dimension, "bucket.empty_water", spout(block), 0.6, 1.0);
  }
  for (let i = 0; i < c.size && !s.coffee && !s.ready; i++) {
    let st;
    try { st = c.getItem(i); } catch { continue; }
    if (!st || !loadEspressoCoffee(s, st.typeId).ok) continue;
    try { if (st.amount > 1) { st.amount -= 1; c.setItem(i, st); } else c.setItem(i, undefined); } catch {}
    pulled = true;
    sound(block.dimension, "random.click", spout(block), 0.7, 1.3);
  }
  return pulled;
}

// Mugs hung on a rack: serve the drink a machine beside it is still holding.
setMugRackListener(rack => {
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const b = safeBlock(rack.dimension, { x: rack.x + dx, y: rack.y, z: rack.z + dz });
    if (b?.typeId !== ESPRESSO_ID) continue;
    const s = loadStation(PREFIX, b, normalizeEspresso);
    if (!serveToRack(b, s)) continue;
    if (pullFromAbove(b, s)) trackStation(PREFIX, b);
    saveStation(PREFIX, b, s, isEmpty);
  }
});

function interact(block, player) {
  const s = loadStation(PREFIX, block, normalizeEspresso);
  const held = heldItem(player);
  const save = () => { saveStation(PREFIX, block, s, isEmpty); if (s.coffee) trackStation(PREFIX, block); };

  if (!held) {
    if (s.ready) {
      const cup = carrierFor(s.ready);
      if (!takeCarrier(player, cup)) { refuse(block.dimension, spout(block)); return; }
      giveItems(player, s.ready, 1);
      const by = all("espresso").find(r => r.result === s.ready)?.byproduct;
      if (by) giveItems(player, by, 1);
      s.ready = "";
      showContents(block, KIND.espresso, { fill: 0 });
      sound(block.dimension, "random.pop", spout(block), 0.6, 1.1);
      save();
      return;
    }
    if (s.grounds) { giveItems(player, "kaleidoscope_baking:coffee_grounds", s.grounds); delete s.grounds; }
    if (player.isSneaking) {
      for (const id of [s.coffee, s.additive]) if (id && !containerReturnOf(id)) giveItems(player, id, 1);
      s.coffee = ""; s.additive = ""; s.progress = 0;
      save(); untrackStation(PREFIX, block);
    } else if (pullFromAbove(block, s)) {
      save();
    } else {
      saveStation(PREFIX, block, s, isEmpty);
    }
    return;
  }

  const id = held.typeId;
  if (id === "minecraft:water_bucket" && s.water < ESPRESSO_WATER_MAX) {
    s.water = ESPRESSO_WATER_MAX;
    consumeHeld(player, 1);
    if (!isCreative(player)) giveItems(player, "minecraft:bucket", 1);
    sound(block.dimension, "bucket.empty_water", spout(block));
    save();
    return;
  }
  let r = loadEspressoCoffee(s, id);
  if (r.reason === "not_coffee") r = loadEspressoAdditive(s, id);
  if (!r.ok) {
    const key = r.reason === "not_additive" ? "not_coffee" : r.reason;
    refuse(block.dimension, spout(block));
    return;
  }
  consumeHeld(player, 1);
  const back = containerReturnOf(id);
  if (back && !isCreative(player)) giveItems(player, back, 1);
  sound(block.dimension, "random.click", spout(block), 0.7, 1.3);
  save();
}

registerTicker(PREFIX, ESPRESSO_ID, TICK, normalizeEspresso, isEmpty, (block, s) => {
  const res = tickEspresso(s, TICK, redstonePower(block));
  // a coffee stream runs from the group head while it brews; crema appears in the cup when done
  setMotion(block, KIND.espresso, res.state === "brewing");
  if (res.state === "brewing") steam(block.dimension, { x: block.x + 0.5, y: block.y + 0.8, z: block.z + 0.5 });
  if (res.state === "done") {
    showContents(block, KIND.espresso, { fill: 1, tint: 6, progress: 1 });
    sound(block.dimension, "random.orb", spout(block), 0.6, 1.4);
    particle(block.dimension, "minecraft:villager_happy", spout(block));
    serveToRack(block, s);
  }
  if (res.state === "done" || res.state === "no_water") pullFromAbove(block, s);
  const next = res.state === "done" && !!s.coffee; // pulled the next coffee: keep brewing
  return { state: s, keep: next || res.state === "brewing" || res.state === "no_power" || res.state === "no_water" };
});

function spill(dimension, loc) {
  const fake = { dimension, x: loc.x, y: loc.y, z: loc.z };
  const s = loadStation(PREFIX, fake, normalizeEspresso);
  const at = { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 };
  for (const id of [s.coffee, s.additive]) if (id && !containerReturnOf(id)) spawnItems(dimension, at, id, 1);
  // A finished drink is dropped too, so nothing is lost. (Its mug was not taken yet, so the
  // player effectively gets a mug when they drink it — a harmless edge case.)
  if (s.ready) spawnItems(dimension, at, s.ready, 1);
  if (s.grounds) spawnItems(dimension, at, "kaleidoscope_baking:coffee_grounds", s.grounds);
  saveStation(PREFIX, fake, {}, () => true);
  untrackStation(PREFIX, fake);
  removeVisual(fake);
}

export const espressoMachineComponent = {
  onPlayerInteract({ block, player }) { if (player) interact(block, player); },
  onPlayerBreak({ block }) { spill(block.dimension, block); }
};

world.afterEvents.blockExplode.subscribe(ev => {
  if (ev.explodedBlockPermutation?.type?.id === ESPRESSO_ID) spill(ev.dimension, ev.block);
});
