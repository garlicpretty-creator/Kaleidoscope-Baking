// ## Kaleidoscope script role: Custom block component (espresso machine).
// Requires REDSTONE POWER (decided: proposal §9.1). Signal strength speeds it up
// (15 = ~50% faster). One drink at a time:
//   water bucket       -> fill the tank (4 shots); when the tank is already full, a water
//                         bucket is used as the "hot water" additive instead (americano)
//   additive           -> frothed milk / milk foam / chocolate sauce / caramel / cinnamon...
//   ground coffee      -> starts brewing once powered and filled
//   empty hand         -> take the finished drink (a Coffee Mug is taken from your inventory)
//   sneak + empty      -> take back what you put in
// ## getRedstonePower() is read on the machine and its neighbours, because a lever or
// redstone block next to it powers the neighbour cell, not always the custom block itself.
import { world } from "@minecraft/server";
import {
  ESPRESSO_WATER_MAX, espressoRecipe, loadEspressoAdditive, loadEspressoCoffee, normalizeEspresso, tickEspresso
} from "../api/stationLogic.js";
import { CONTAINER_RETURNS } from "../data/ingredientTags.js";
import { all } from "../api/registry.js";
import {
  consumeHeld, giveItems, heldItem, isCreative, particle, progressPitch, refuse, safeBlock, sound, spawnItems, takeCarrier
} from "../utils/runtime.js";
import { loadStation, registerTicker, saveStation, trackStation, untrackStation } from "../utils/stations.js";

export const ESPRESSO_ID = "kaleidoscope_baking:espresso_machine";
const PREFIX = "kb_espresso";
const TICK = 10;
const isEmpty = s => !s.water && !s.coffee && !s.additive && !s.ready;
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

// No text. Poking it with an empty hand (nothing to take) answers with:
//   brewing          -> a click whose pitch rises with the brew progress + steam
//   unpowered / dry  -> the "refused" sound (and no steam: it is not brewing)
//   idle             -> a slosh whose pitch rises with the water in the tank (refused if dry)
function statusCue(block, s, player) {
  const recipe = espressoRecipe(s);
  if (recipe) {
    if (redstonePower(block) <= 0) { refuse(player, "espresso.no_power"); return; }
    if (s.water <= 0) { refuse(player, "espresso.no_water"); return; }
    sound(block.dimension, "random.click", spout(block), 0.6, progressPitch(s.progress / recipe.time));
    particle(block.dimension, "minecraft:basic_smoke_particle", { x: block.x + 0.5, y: block.y + 0.95, z: block.z + 0.5 });
    return;
  }
  if (s.water > 0) sound(block.dimension, "bucket.empty_water", spout(block), 0.3, progressPitch(s.water / ESPRESSO_WATER_MAX));
  else refuse(player, "espresso.no_water");
}

function interact(block, player) {
  const s = loadStation(PREFIX, block, normalizeEspresso);
  const held = heldItem(player);
  const save = () => { saveStation(PREFIX, block, s, isEmpty); if (s.coffee) trackStation(PREFIX, block); };

  if (!held) {
    if (s.ready) {
      const cup = carrierFor(s.ready);
      if (!takeCarrier(player, cup)) { refuse(player, "espresso.need_cup", cup); return; }
      giveItems(player, s.ready, 1);
      s.ready = "";
      sound(block.dimension, "random.pop", spout(block), 0.6, 1.1);
      save();
      return;
    }
    if (player.isSneaking && (s.coffee || s.additive)) {
      for (const id of [s.coffee, s.additive]) if (id && !CONTAINER_RETURNS[id]) giveItems(player, id, 1);
      s.coffee = ""; s.additive = ""; s.progress = 0;
      save(); untrackStation(PREFIX, block);
      sound(block.dimension, "random.pop", spout(block), 0.5, 0.9);
      return;
    }
    statusCue(block, s, player);
    return;
  }

  const id = held.typeId;
  if (id === "minecraft:water_bucket" && s.water < ESPRESSO_WATER_MAX) {
    s.water = ESPRESSO_WATER_MAX;
    consumeHeld(player, 1);
    if (!isCreative(player)) giveItems(player, "minecraft:bucket", 1);
    sound(block.dimension, "bucket.empty_water", spout(block));
    particle(block.dimension, "minecraft:water_splash_particle", spout(block));
    save();
    return;
  }
  let r = loadEspressoCoffee(s, id);
  if (r.reason === "not_coffee") r = loadEspressoAdditive(s, id);
  if (!r.ok) {
    refuse(player, `espresso.${r.reason === "not_additive" ? "not_coffee" : r.reason}`, id);
    return;
  }
  consumeHeld(player, 1);
  const back = CONTAINER_RETURNS[id];
  if (back && !isCreative(player)) giveItems(player, back, 1);
  sound(block.dimension, "random.click", spout(block), 0.7, 1.3);
  // Loaded but it can't start: the refused sound tells the player something is missing
  // (redstone power or water); otherwise steam starts rising on the next tick.
  if (espressoRecipe(s) && redstonePower(block) <= 0) refuse(player, "espresso.no_power");
  else if (espressoRecipe(s) && s.water <= 0) refuse(player, "espresso.no_water");
  save();
}

registerTicker(PREFIX, ESPRESSO_ID, TICK, normalizeEspresso, isEmpty, (block, s) => {
  const res = tickEspresso(s, TICK, redstonePower(block));
  if (res.state === "brewing") particle(block.dimension, "minecraft:basic_smoke_particle", { x: block.x + 0.5, y: block.y + 0.95, z: block.z + 0.5 });
  if (res.state === "done") {
    sound(block.dimension, "random.orb", spout(block), 0.6, 1.4);
    particle(block.dimension, "minecraft:villager_happy", spout(block));
  }
  return { state: s, keep: res.state === "brewing" || res.state === "no_power" || res.state === "no_water" };
});

function spill(dimension, loc) {
  const fake = { dimension, x: loc.x, y: loc.y, z: loc.z };
  const s = loadStation(PREFIX, fake, normalizeEspresso);
  const at = { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 };
  for (const id of [s.coffee, s.additive]) if (id && !CONTAINER_RETURNS[id]) spawnItems(dimension, at, id, 1);
  // A finished drink is dropped too, so nothing is lost. (Its mug was not taken yet, so the
  // player effectively gets a mug when they drink it — a harmless edge case.)
  if (s.ready) spawnItems(dimension, at, s.ready, 1);
  saveStation(PREFIX, fake, {}, () => true);
  untrackStation(PREFIX, fake);
}

export const espressoMachineComponent = {
  onPlayerInteract({ block, player }) { if (player) interact(block, player); },
  onPlayerBreak({ block }) { spill(block.dimension, block); }
};

world.afterEvents.blockExplode.subscribe(ev => {
  if (ev.explodedBlockPermutation?.type?.id === ESPRESSO_ID) spill(ev.dimension, ev.block);
});
