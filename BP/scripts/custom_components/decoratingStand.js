// ## Kaleidoscope script role: Custom block component (decorating stand).
// Build a dessert layer by layer: base (sponge cake, tart shell...) then toppings in order.
//   item in hand   -> place as base / next layer (wrong layer is refused, item kept)
//   empty hand     -> finish if the stack is a complete recipe, otherwise take the top layer back
//   sneak + empty  -> take everything back
// A recipe that is the prefix of a longer one (strawberry cream cake < birthday cake) is
// finished with an empty hand; otherwise the last layer completes it automatically.
// No text: each accepted layer pops a little higher; when the stack is already a finished
// dessert (and could be taken with an empty hand) a soft chime plays; a wrong layer or base
// plays the short "refused" sound.
import { world } from "@minecraft/server";
import { addToStand, normalizeStand, popStand, standRecipe } from "../api/stationLogic.js";
import { consumeHeld, giveItems, heldItem, particle, refuse, sound, spawnItems } from "../utils/runtime.js";
import { loadStation, saveStation } from "../utils/stations.js";

export const STAND_ID = "kaleidoscope_baking:decorating_stand";
const PREFIX = "kb_stand";
const isEmpty = s => !s.base;
const top = b => ({ x: b.x + 0.5, y: b.y + 0.9, z: b.z + 0.5 });

/** After a layer: soft chime when an empty hand would finish the dessert now. */
function readyCue(block, s) {
  if (standRecipe(s)) sound(block.dimension, "random.orb", top(block), 0.3, 1.8);
}

function finish(block, player, s, recipe) {
  giveItems(player, recipe.result, recipe.count);
  s.base = ""; s.layers = [];
  sound(block.dimension, "random.levelup", top(block), 0.5, 1.6);
  particle(block.dimension, "minecraft:villager_happy", top(block));
}

function interact(block, player) {
  const s = loadStation(PREFIX, block, normalizeStand);
  const held = heldItem(player);
  if (held) {
    const r = addToStand(s, held.typeId);
    if (!r.ok) { refuse(player, `stand.${r.reason}`, held.typeId); return; }
    consumeHeld(player, 1);
    sound(block.dimension, "random.pop", top(block), 0.5, Math.min(2, 1.0 + 0.15 * s.layers.length));
    if (r.complete) finish(block, player, s, r.complete);
    else readyCue(block, s);
  } else if (player.isSneaking) {
    let id, n = 0;
    while ((id = popStand(s))) { giveItems(player, id, 1); n++; }
    if (!n) { refuse(player, "stand.empty"); return; }
    sound(block.dimension, "random.pop", top(block), 0.5, 0.8);
  } else {
    const done = standRecipe(s);
    if (done) finish(block, player, s, done);
    else {
      const id = popStand(s);
      if (!id) { refuse(player, "stand.empty"); return; }
      giveItems(player, id, 1);
      sound(block.dimension, "random.pop", top(block), 0.5, 0.8);
    }
  }
  saveStation(PREFIX, block, s, isEmpty);
}

function spill(dimension, loc) {
  const fake = { dimension, x: loc.x, y: loc.y, z: loc.z };
  const s = loadStation(PREFIX, fake, normalizeStand);
  let id;
  while ((id = popStand(s))) spawnItems(dimension, { x: loc.x + 0.5, y: loc.y + 0.8, z: loc.z + 0.5 }, id, 1);
  saveStation(PREFIX, fake, s, isEmpty);
}

export const decoratingStandComponent = {
  onPlayerInteract({ block, player }) { if (player) interact(block, player); },
  onPlayerBreak({ block }) { spill(block.dimension, block); }
};

world.afterEvents.blockExplode.subscribe(ev => {
  if (ev.explodedBlockPermutation?.type?.id === STAND_ID) spill(ev.dimension, ev.block);
});
