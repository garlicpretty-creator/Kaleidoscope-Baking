// ## Kaleidoscope script role: Custom block component (drink shaker).
// Hand-shaken drinks (bubble milk tea & co.).
//   ingredient       -> add (max 6); liquids hand their bottle / bucket / mug back
//   empty hand       -> shake once; the last shake asks for SWEETNESS and ICE in a form
//                       and takes a Takeaway Cup from your inventory
//   sneak + empty    -> pour everything back out
// The chosen sweetness / ice are stored on the drink (ItemStack dynamic properties + lore),
// which is why hand-shaken drinks do not stack. events/consumption.js applies them.
// No text prompts (the sweetness / ice form is opened deliberately, so it stays):
//   adding           -> pop, pitch rises with how full it is; a soft chime once the mix
//                       matches a recipe (= ready to shake)
//   shaking          -> rattle + splash, pitch rises with each shake until done
//   anything refused -> the short "refused" sound
import { ItemStack, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { addToShaker, normalizeShaker, shake, shakerRecipe, takeFromShaker, ICE, SWEETNESS } from "../api/stationLogic.js";
import { CONTAINER_RETURNS } from "../data/ingredientTags.js";
import { MAX_SHAKER_INGREDIENTS } from "../api/registry.js";
import { ICE_PROP, SWEET_PROP } from "../events/consumption.js";
import {
  consumeHeld, giveItems, giveStack, hasInInventory, heldItem, isCreative, particle, progressPitch, refuse, sound,
  spawnItems, takeCarrier
} from "../utils/runtime.js";
import { loadStation, saveStation } from "../utils/stations.js";

export const SHAKER_ID = "kaleidoscope_baking:drink_shaker";
const PREFIX = "kb_shaker";
const MSG = "kaleidoscope_baking.msg.shaker.";
const NS_MSG = "kaleidoscope_baking.msg.";
const isEmpty = s => !s.items.length;
const top = b => ({ x: b.x + 0.5, y: b.y + 0.9, z: b.z + 0.5 });


const COLD_ICE = ICE.filter(i => i !== "hot");
const HOT_ICE = ["warm", "hot"];

/** After adding: a soft chime when the mix now makes something. */
function readyCue(block, s) {
  if (shakerRecipe(s)) sound(block.dimension, "random.orb", top(block), 0.3, 1.8);
}

function makeDrink(recipe, sweet, ice) {
  let stack;
  try { stack = new ItemStack(recipe.result, 1); } catch { return undefined; }
  try { if (recipe.sweetness) stack.setDynamicProperty(SWEET_PROP, sweet); } catch {}
  try { stack.setDynamicProperty(ICE_PROP, ice); } catch {}
  const lore = [];
  if (recipe.sweetness) lore.push({ rawtext: [{ text: "§7" }, { translate: `${NS_MSG}sweet.${sweet}` }] });
  lore.push({ rawtext: [{ text: "§7" }, { translate: `${NS_MSG}ice.${ice}` }] });
  try { stack.setLore(lore); } catch {
    try { stack.setLore([sweet, ice].map(x => `§7${x}`)); } catch {}
  }
  return stack;
}

function deliver(player, block, recipe, sweet, ice) {
  const stack = makeDrink(recipe, sweet, ice);
  if (stack) giveStack(player, stack); else giveItems(player, recipe.result, recipe.count);
  sound(block.dimension, "random.orb", top(block), 0.6, 1.2);
  particle(block.dimension, "minecraft:villager_happy", top(block));
}

/** Ask for sweetness / ice, then hand over the drink. Falls back to defaults. */
function customise(player, block, recipe) {
  const iceOptions = recipe.temperature === "hot" ? ["hot"] : recipe.ice ? (recipe.temperature === "any" ? [...COLD_ICE, "hot"] : COLD_ICE) : ["none"];
  const defaults = { sweet: "half", ice: iceOptions[0] };
  if (!recipe.sweetness && iceOptions.length === 1) { deliver(player, block, recipe, defaults.sweet, defaults.ice); return; }
  try {
    const form = new ModalFormData().title({ translate: `${MSG}form_title` });
    if (recipe.sweetness) form.dropdown({ translate: `${MSG}form_sweet` }, SWEETNESS.map(k => ({ translate: `${NS_MSG}sweet.${k}` })), { defaultValueIndex: 2 });
    if (iceOptions.length > 1) form.dropdown({ translate: `${MSG}form_ice` }, iceOptions.map(k => ({ translate: `${NS_MSG}ice.${k}` })), { defaultValueIndex: 0 });
    form.show(player).then(res => {
      let sweet = defaults.sweet, ice = defaults.ice;
      if (!res.canceled && Array.isArray(res.formValues)) {
        let i = 0;
        if (recipe.sweetness) sweet = SWEETNESS[Number(res.formValues[i++])] ?? sweet;
        if (iceOptions.length > 1) ice = iceOptions[Number(res.formValues[i++])] ?? ice;
      }
      deliver(player, block, recipe, sweet, ice);
    }).catch(() => deliver(player, block, recipe, defaults.sweet, defaults.ice));
  } catch {
    deliver(player, block, recipe, defaults.sweet, defaults.ice);
  }
}

function interact(block, player) {
  const s = loadStation(PREFIX, block, normalizeShaker);
  const held = heldItem(player);
  if (held) {
    const back = CONTAINER_RETURNS[held.typeId];
    const r = addToShaker(s, held.typeId, !!back);
    if (!r.ok) { refuse(player, `shaker.${r.reason}`, held.typeId); return; }
    consumeHeld(player, 1);
    if (back && !isCreative(player)) giveItems(player, back, 1);
    sound(block.dimension, "random.pop", top(block), 0.4, progressPitch(s.items.length / MAX_SHAKER_INGREDIENTS));
    readyCue(block, s);
  } else if (player.isSneaking) {
    const back = takeFromShaker(s);
    if (!back.length) { refuse(player, "shaker.empty"); return; }
    for (const id of back) giveItems(player, id, 1);
    sound(block.dimension, "bucket.empty_water", top(block), 0.4, 1.3);
  } else {
    const recipe = shakerRecipe(s);
    if (!recipe) { refuse(player, s.items.length ? "shaker.no_recipe" : "shaker.empty"); return; }
    // Check the cup BEFORE the final shake so the ingredients are never lost.
    if (s.shakes + 1 >= recipe.shakes && recipe.carrier && !isCreative(player) && !hasInInventory(player, st => st.typeId === recipe.carrier)) {
      refuse(player, "shaker.need_cup", recipe.carrier);
      return;
    }
    const r = shake(s);
    if (r.result === "progress") {
      // Each shake rattles a little higher; the last one is the "done" chime in deliver().
      sound(block.dimension, "block.chain.place", top(block), 0.5, progressPitch(r.done / r.need));
      particle(block.dimension, "minecraft:water_splash_particle", top(block));
    } else if (r.result === "done") {
      takeCarrier(player, r.recipe.carrier);
      customise(player, block, r.recipe);
    }
  }
  saveStation(PREFIX, block, s, isEmpty);
}

function spill(dimension, loc) {
  const fake = { dimension, x: loc.x, y: loc.y, z: loc.z };
  const s = loadStation(PREFIX, fake, normalizeShaker);
  for (const id of takeFromShaker(s)) spawnItems(dimension, { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 }, id, 1);
  saveStation(PREFIX, fake, s, isEmpty);
}

export const drinkShakerComponent = {
  onPlayerInteract({ block, player }) { if (player) interact(block, player); },
  onPlayerBreak({ block }) { spill(block.dimension, block); }
};

world.afterEvents.blockExplode.subscribe(ev => {
  if (ev.explodedBlockPermutation?.type?.id === SHAKER_ID) spill(ev.dimension, ev.block);
});
