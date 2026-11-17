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
  refuse, consumeHeld, giveItems, heldItem, isCreative, itemName, particle, safeBlock, sound, spawnItems, t, takeCarrier
} from "../utils/runtime.js";
import { KIND, removeVisual, setMotion, showContents, steam } from "../utils/visuals.js";
import { loadStation, registerTicker, saveStation, trackStation, untrackStation } from "../utils/stations.js";

export const ESPRESSO_ID = "kaleidoscope_baking:espresso_machine";
const PREFIX = "kb_espresso";
const MSG = "kaleidoscope_baking.msg.espresso.";
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
    if (player.isSneaking) {
      for (const id of [s.coffee, s.additive]) if (id && !CONTAINER_RETURNS[id]) giveItems(player, id, 1);
      s.coffee = ""; s.additive = ""; s.progress = 0;
      save(); untrackStation(PREFIX, block);
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
  const back = CONTAINER_RETURNS[id];
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
  removeVisual(fake);
}

export const espressoMachineComponent = {
  onPlayerInteract({ block, player }) { if (player) interact(block, player); },
  onPlayerBreak({ block }) { spill(block.dimension, block); }
};

world.afterEvents.blockExplode.subscribe(ev => {
  if (ev.explodedBlockPermutation?.type?.id === ESPRESSO_ID) spill(ev.dimension, ev.block);
});
