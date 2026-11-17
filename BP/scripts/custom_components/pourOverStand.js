// ## Kaleidoscope script role: Custom block component (pour-over stand).
// The no-redstone way to make coffee:
//   ground coffee   -> load the filter
//   water bucket    -> pour: brews immediately into a Coffee Mug from your inventory
//   sneak + empty   -> take the coffee back out
import { world } from "@minecraft/server";
import { getPourOverRecipe } from "../api/registry.js";
import { actionBar, consumeHeld, giveItems, heldItem, isCreative, itemName, particle, readJson, sound, spawnItems, t, takeCarrier, writeJson, locKey } from "../utils/runtime.js";

export const POUR_ID = "kaleidoscope_baking:pour_over_stand";
const PREFIX = "kb_pour";
const MSG = "kaleidoscope_baking.msg.pour.";
const keyOf = b => locKey(PREFIX, b.dimension.id, b);
const at = b => ({ x: b.x + 0.5, y: b.y + 0.6, z: b.z + 0.5 });

function interact(block, player) {
  const key = keyOf(block);
  const coffee = readJson(key)?.coffee ?? "";
  const held = heldItem(player);
  if (!held) {
    if (coffee && player.isSneaking) { giveItems(player, coffee, 1); writeJson(key, undefined); return; }
    actionBar(player, coffee ? t(`${MSG}waiting`, itemName(coffee)) : t(`${MSG}empty`));
    return;
  }
  if (held.typeId === "minecraft:water_bucket" && coffee) {
    const recipe = getPourOverRecipe(coffee);
    if (!recipe) { writeJson(key, undefined); giveItems(player, coffee, 1); return; }
    if (!takeCarrier(player, recipe.carrier)) { actionBar(player, t(`${MSG}need_cup`, itemName(recipe.carrier))); return; }
    consumeHeld(player, 1);
    if (!isCreative(player)) giveItems(player, "minecraft:bucket", 1);
    giveItems(player, recipe.result, recipe.count);
    writeJson(key, undefined);
    sound(block.dimension, "bucket.empty_water", at(block), 0.6, 1.2);
    particle(block.dimension, "minecraft:basic_smoke_particle", at(block));
    actionBar(player, t(`${MSG}done`, itemName(recipe.result)));
    return;
  }
  if (!coffee && getPourOverRecipe(held.typeId)) {
    writeJson(key, { coffee: held.typeId });
    consumeHeld(player, 1);
    sound(block.dimension, "random.click", at(block), 0.6, 1.0);
    actionBar(player, t(`${MSG}loaded`, itemName(held.typeId)));
    return;
  }
  actionBar(player, coffee ? t(`${MSG}waiting`, itemName(coffee)) : t(`${MSG}not_coffee`, itemName(held.typeId)));
}

function spill(dimension, loc) {
  const key = locKey(PREFIX, dimension.id, loc);
  const coffee = readJson(key)?.coffee;
  if (coffee) spawnItems(dimension, { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 }, coffee, 1);
  writeJson(key, undefined);
}

export const pourOverStandComponent = {
  onPlayerInteract({ block, player }) { if (player) interact(block, player); },
  onPlayerBreak({ block }) { spill(block.dimension, block); }
};

world.afterEvents.blockExplode.subscribe(ev => {
  if (ev.explodedBlockPermutation?.type?.id === POUR_ID) spill(ev.dimension, ev.block);
});
