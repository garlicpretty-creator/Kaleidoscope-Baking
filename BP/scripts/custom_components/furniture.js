// ## Kaleidoscope script role: Custom block components (1.1 display furniture & placed drinks).
// ============================================================================
// cake_stand      one whole dessert on a raised plate, eaten slice by slice like a placed dessert
// tea_tray        three small foods; eating from it widens the afternoon-tea window to 60 s
// bread_display   9 stacks of food, first three shown behind the glass
// pastry_case     same as bread_display, glass-fronted
// drink_cups      up to 4 hand-shaken drinks placed by SNEAKING with the drink on a block top;
//                 each cup keeps its sweetness / ice (stored in world data per block)
// Contents never vanish: breaking any of these drops everything (drinks with their choices).
// No on-screen text (Baking's immersive rule): what is on the block shows itself; a refusal is a
// low note and a puff of smoke.
// ============================================================================
import { ItemStack, system, world } from "@minecraft/server";
import { CONTENT } from "../data/generated/content.js";
import { displayMode } from "../api/displayRules.js";
import { applyConsumption, feed, ICE_PROP, isHungry, SWEET_PROP } from "../events/consumption.js";
import { dessertMeta, interactDessert, isPlaceableDessert } from "./dessert.js";
import { clearDisplays, syncDisplay } from "../utils/display.js";
import {
  consumeHeld, giveItems, giveStack, heldItem, isCreative, locKey, mainhand, readJson, refuse, safeBlock, sound,
  spawnItems, writeJson
} from "../utils/runtime.js";

const centre = b => ({ x: b.x + 0.5, y: b.y + 0.5, z: b.z + 0.5 });
const keyOf = (prefix, b) => locKey(prefix, b.dimension.id, b);

const VANILLA_FOOD = new Set(["minecraft:bread", "minecraft:cookie", "minecraft:pumpkin_pie", "minecraft:cake", "minecraft:apple",
  "minecraft:golden_apple", "minecraft:baked_potato", "minecraft:sweet_berries", "minecraft:glow_berries", "minecraft:melon_slice"]);
/** Food that may be displayed: Baking foods, a few vanilla foods, or anything an addon allowed. */
function displayable(id) {
  const mode = displayMode(id);
  if (mode) return mode === "allow";
  return !!CONTENT.items[id]?.food || VANILLA_FOOD.has(id) || id.startsWith("kaleidoscope_cookery:");
}
function foodValues(id) {
  const f = CONTENT.items[id]?.food;
  return f ? { nutrition: f.nutrition, saturation: f.saturation } : { nutrition: 2, saturation: 0.3 };
}

// ---------------------------------------------------------------------------
// Cake stand
// ---------------------------------------------------------------------------
const STAND = "kb_cakestand";
export const cakeStandComponent = {
  onPlayerInteract({ block, player }) {
    if (!player) return;
    const key = keyOf(STAND, block);
    const s = readJson(key) ?? {};
    const held = heldItem(player);
    if (!s.id) {
      if (held && isPlaceableDessert(held.typeId)) {
        writeJson(key, { id: held.typeId, bites: 0 });
        consumeHeld(player, 1);
        syncDisplay(block, "cake", held.typeId, { x: 0.5, y: 0.5, z: 0.5 });
        sound(block.dimension, "random.pop", centre(block), 0.5, 1.2);
      } else refuse(block.dimension, centre(block));
      return;
    }
    if (!held && player.isSneaking && !s.bites) {
      giveItems(player, s.id, 1);
      writeJson(key, undefined);
      syncDisplay(block, "cake", undefined);
      return;
    }
    const meta = dessertMeta(s.id);
    const r = interactDessert(player, s.id, s.bites ?? 0, meta, centre(block), block.dimension);
    if (!r) return;
    if (r.bites >= meta.slices) { writeJson(key, undefined); syncDisplay(block, "cake", undefined); }
    else writeJson(key, { id: s.id, bites: r.bites });
  },
  onPlayerBreak({ block }) {
    const key = keyOf(STAND, block);
    const s = readJson(key);
    if (s?.id && !s.bites) spawnItems(block.dimension, centre(block), s.id, 1);
    writeJson(key, undefined);
    clearDisplays(block.dimension, block);
  }
};

// ---------------------------------------------------------------------------
// Tea tray (3 small foods)
// ---------------------------------------------------------------------------
const TRAY = "kb_teatray";
const TRAY_MAX = 3;
const TRAY_SPOTS = [{ x: 0.5, y: 0.25, z: 0.5 }, { x: 0.5, y: 0.55, z: 0.5 }, { x: 0.5, y: 0.85, z: 0.5 }];
function refreshTray(block, items) {
  for (let i = 0; i < TRAY_MAX; i++) syncDisplay(block, `tier${i}`, items[i], TRAY_SPOTS[i]);
}
export const teaTrayComponent = {
  onPlayerInteract({ block, player }) {
    if (!player) return;
    const key = keyOf(TRAY, block);
    const items = readJson(key) ?? [];
    const held = heldItem(player);
    if (held) {
      if (isPlaceableDessert(held.typeId) || !displayable(held.typeId) || items.length >= TRAY_MAX) { refuse(block.dimension, centre(block)); return; }
      items.push(held.typeId);
      consumeHeld(player, 1);
    } else if (player.isSneaking) {
      for (const id of items.splice(0)) giveItems(player, id, 1);
    } else if (items.length) {
      if (!isHungry(player) && !isCreative(player)) { refuse(block.dimension, centre(block)); return; }
      const id = items.pop();
      const f = foodValues(id);
      feed(player, f.nutrition, f.saturation);
      applyConsumption(player, id, undefined, { teaWindow: 1200 });
      sound(block.dimension, "random.burp", centre(block), 0.5, 1.1);
    } else {
      refuse(block.dimension, centre(block));
      return;
    }
    writeJson(key, items.length ? items : undefined);
    refreshTray(block, items);
  },
  onPlayerBreak({ block }) {
    const key = keyOf(TRAY, block);
    for (const id of readJson(key) ?? []) spawnItems(block.dimension, centre(block), id, 1);
    writeJson(key, undefined);
    clearDisplays(block.dimension, block);
  }
};

// ---------------------------------------------------------------------------
// Bread display / pastry case (9 stacks)
// ---------------------------------------------------------------------------
const CASE_SLOTS = 9;
const CASE_SPOTS = [{ x: 0.2, y: 0.55, z: 0.45 }, { x: 0.5, y: 0.55, z: 0.45 }, { x: 0.8, y: 0.55, z: 0.45 }];
function caseComponent(prefix) {
  const refresh = (block, slots) => { for (let i = 0; i < 3; i++) syncDisplay(block, `shelf${i}`, slots[i]?.id, CASE_SPOTS[i]); };
  return {
    onPlayerInteract({ block, player }) {
      if (!player) return;
      const key = keyOf(prefix, block);
      const slots = readJson(key) ?? [];
      const held = heldItem(player);
      if (held) {
        if (!displayable(held.typeId)) { refuse(block.dimension, centre(block)); return; }
        let left = held.amount;
        for (const s of slots) {
          if (s.id !== held.typeId) continue;
          const n = Math.min(left, (held.maxAmount || 64) - s.count);
          s.count += n; left -= n;
        }
        while (left > 0 && slots.length < CASE_SLOTS) {
          const n = Math.min(left, held.maxAmount || 64);
          slots.push({ id: held.typeId, count: n }); left -= n;
        }
        const placed = held.amount - left;
        if (!placed) { refuse(block.dimension, centre(block)); return; }
        if (!isCreative(player)) {
          const slot = mainhand(player);
          try { if (left > 0) { held.amount = left; slot.setItem(held); } else slot.setItem(undefined); } catch {}
        }
      } else if (slots.length) {
        const take = player.isSneaking ? slots.splice(0) : slots.splice(-1, 1);
        for (const s of take) giveItems(player, s.id, s.count);
      } else {
        refuse(block.dimension, centre(block));
        return;
      }
      sound(block.dimension, "random.pop", centre(block), 0.4, 1.3);
      writeJson(key, slots.length ? slots : undefined);
      refresh(block, slots);
    },
    onPlayerBreak({ block }) {
      const key = keyOf(prefix, block);
      for (const s of readJson(key) ?? []) spawnItems(block.dimension, centre(block), s.id, s.count);
      writeJson(key, undefined);
      clearDisplays(block.dimension, block);
    }
  };
}
export const breadDisplayComponent = caseComponent("kb_breaddisplay");
export const pastryCaseComponent = caseComponent("kb_pastrycase");

// ---------------------------------------------------------------------------
// Placed hand-shaken drinks
// ---------------------------------------------------------------------------
export const CUPS_ID = "kaleidoscope_baking:drink_cups";
const CUPS = "kb_cups";
const CUPS_STATE = "kaleidoscope_baking:cups";
const SHAKEN = new Set(CONTENT.shakenDrinks ?? []);

function cupStack(c) {
  let s;
  try { s = new ItemStack(c.id, 1); } catch { return undefined; }
  try { if (c.sweet) s.setDynamicProperty(SWEET_PROP, c.sweet); if (c.ice) s.setDynamicProperty(ICE_PROP, c.ice); } catch {}
  const lore = [];
  if (c.sweet) lore.push({ rawtext: [{ text: "§7" }, { translate: `kaleidoscope_baking.msg.sweet.${c.sweet}` }] });
  if (c.ice) lore.push({ rawtext: [{ text: "§7" }, { translate: `kaleidoscope_baking.msg.ice.${c.ice}` }] });
  try { if (lore.length) s.setLore(lore); } catch {}
  return s;
}
function readCup(stack) {
  let sweet, ice;
  try { sweet = stack.getDynamicProperty(SWEET_PROP); ice = stack.getDynamicProperty(ICE_PROP); } catch {}
  return { id: stack.typeId, sweet: typeof sweet === "string" ? sweet : "", ice: typeof ice === "string" ? ice : "" };
}
function setCups(block, n) {
  try { block.setPermutation(block.permutation.withState(CUPS_STATE, n)); } catch {}
}

/** Put one held drink at `target` (air above a block, or an existing drink_cups block). */
function placeCup(player, target) {
  const held = heldItem(player);
  if (!held || !SHAKEN.has(held.typeId) || !target) return false;
  const key = keyOf(CUPS, target);
  let cups;
  if (target.typeId === CUPS_ID) {
    cups = readJson(key) ?? [];
    if (cups.length >= 4) return false;
  } else {
    let air = false;
    try { air = target.isAir; } catch {}
    if (!air) return false;
    try { target.setType(CUPS_ID); } catch { return false; }
    cups = [];
  }
  cups.push(readCup(held));
  writeJson(key, cups);
  setCups(target, cups.length);
  if (!isCreative(player)) { try { mainhand(player).setItem(undefined); } catch {} }
  sound(target.dimension, "random.glass", centre(target), 0.5, 1.4);
  return true;
}

// Sneak + use a hand-shaken drink on the top of a block (or on placed cups) to put it down.
world.beforeEvents?.playerInteractWithBlock?.subscribe?.(ev => {
  const player = ev.player;
  const id = ev.itemStack?.typeId;
  if (!player?.isSneaking || !id || !SHAKEN.has(id)) return;
  const onCups = ev.block?.typeId === CUPS_ID;
  if (!onCups && ev.blockFace !== "Up") return;
  ev.cancel = true;
  // ## Holding the use button repeats this before-event several times a second; only the
  // first one of a press places a cup (the repeats are still cancelled so nothing else fires).
  if (ev.isFirstEvent === false) return;
  const { dimension } = ev.block;
  const loc = onCups ? ev.block : { x: ev.block.x, y: ev.block.y + 1, z: ev.block.z };
  system.run(() => placeCup(player, safeBlock(dimension, loc)));
});

export const drinkCupsComponent = {
  onPlayerInteract({ block, player }) {
    if (!player || heldItem(player)) return;
    const key = keyOf(CUPS, block);
    const cups = readJson(key) ?? [];
    const c = cups.pop();
    if (c) { const st = cupStack(c); if (st) giveStack(player, st); }
    if (!cups.length) { writeJson(key, undefined); try { block.setType("minecraft:air"); } catch {} return; }
    writeJson(key, cups);
    setCups(block, cups.length);
  },
  onPlayerBreak({ block }) {
    const key = keyOf(CUPS, block);
    for (const c of readJson(key) ?? []) {
      const st = cupStack(c);
      if (st) try { block.dimension.spawnItem(st, centre(block)); } catch {}
    }
    writeJson(key, undefined);
  }
};

// Explosions: same teardown for every furniture block.
const FURNITURE = {
  "kaleidoscope_baking:cake_stand": cakeStandComponent, "kaleidoscope_baking:tea_tray": teaTrayComponent,
  "kaleidoscope_baking:bread_display": breadDisplayComponent, "kaleidoscope_baking:pastry_case": pastryCaseComponent,
  [CUPS_ID]: drinkCupsComponent
};
world.afterEvents.blockExplode.subscribe(ev => {
  const c = FURNITURE[ev.explodedBlockPermutation?.type?.id];
  if (c) c.onPlayerBreak({ block: ev.block, brokenBlockPermutation: ev.explodedBlockPermutation });
});
