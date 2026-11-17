// ## Kaleidoscope script role: Custom block component (decorating stand).
// Build a dessert layer by layer: base (sponge cake, tart shell...) then toppings in order.
//   item in hand   -> place as base / next layer (wrong layer is refused, item kept)
//   empty hand     -> finish if the stack is a complete recipe, otherwise take the top layer back
//   sneak + empty  -> take everything back
// A recipe that is the prefix of a longer one (strawberry cream cake < birthday cake) is
// finished with an empty hand; otherwise the last layer completes it automatically.
import { world } from "@minecraft/server";
import { addToStand, normalizeStand, popStand, standNextOptions, standRecipe } from "../api/stationLogic.js";
import { actionBar, consumeHeld, giveItems, heldItem, itemName, particle, sound, spawnItems, t } from "../utils/runtime.js";
import { loadStation, saveStation } from "../utils/stations.js";

export const STAND_ID = "kaleidoscope_baking:decorating_stand";
const PREFIX = "kb_stand";
const MSG = "kaleidoscope_baking.msg.stand.";
const isEmpty = s => !s.base;
const top = b => ({ x: b.x + 0.5, y: b.y + 0.9, z: b.z + 0.5 });

function specName(spec) { return spec.startsWith("#") ? { text: spec } : itemName(spec); }

function status(s) {
  if (!s.base) return [t(`${MSG}empty`)];
  const parts = [t(`${MSG}status`), itemName(s.base)];
  for (const l of s.layers) parts.push({ text: " §7+§r " }, itemName(l));
  const next = standNextOptions(s);
  if (next.length) {
    parts.push({ text: "\n" }, t(`${MSG}next`));
    next.forEach((n, i) => parts.push({ text: i ? " / " : "" }, specName(n)));
  }
  const done = standRecipe(s);
  if (done) parts.push({ text: "\n" }, t(`${MSG}finish`, itemName(done.result)));
  return parts;
}

function finish(block, player, s, recipe) {
  giveItems(player, recipe.result, recipe.count);
  s.base = ""; s.layers = [];
  sound(block.dimension, "random.levelup", top(block), 0.5, 1.6);
  particle(block.dimension, "minecraft:villager_happy", top(block));
  actionBar(player, t(`${MSG}done`, itemName(recipe.result)));
}

function interact(block, player) {
  const s = loadStation(PREFIX, block, normalizeStand);
  const held = heldItem(player);
  if (held) {
    const r = addToStand(s, held.typeId);
    if (!r.ok) { actionBar(player, t(`${MSG}${r.reason}`, itemName(held.typeId))); return; }
    consumeHeld(player, 1);
    sound(block.dimension, "random.pop", top(block), 0.5, 1.3);
    if (r.complete) finish(block, player, s, r.complete);
    else actionBar(player, ...status(s));
  } else if (player.isSneaking) {
    let id;
    while ((id = popStand(s))) giveItems(player, id, 1);
    actionBar(player, ...status(s));
  } else {
    const done = standRecipe(s);
    if (done) finish(block, player, s, done);
    else {
      const id = popStand(s);
      if (id) giveItems(player, id, 1);
      actionBar(player, ...status(s));
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
