// ## Kaleidoscope script role: Small reusable runtime helpers (Bedrock-facing).
import { EquipmentSlot, GameMode, ItemStack, system, world } from "@minecraft/server";

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
/** Run once the world is ready (dynamic properties readable, script events sendable). */
export function onWorldReady(fn) {
  let done = false;
  const run = () => { if (done) return; done = true; try { fn(); } catch (e) { console.warn(`[Kaleidoscope Baking] init failed: ${e}`); } };
  try {
    const ev = world.afterEvents?.worldLoad;
    if (ev) { ev.subscribe(run); return; }
  } catch {}
  system.run(run);
}

// ---------------------------------------------------------------------------
// JSON world storage (world dynamic properties are scoped to THIS pack only)
// ---------------------------------------------------------------------------
export function readJson(key) {
  try {
    const s = world.getDynamicProperty(key);
    return typeof s === "string" && s ? JSON.parse(s) : undefined;
  } catch { return undefined; }
}
export function writeJson(key, value) {
  try { world.setDynamicProperty(key, value === undefined ? undefined : JSON.stringify(value)); } catch (e) {
    console.warn(`[Kaleidoscope Baking] failed to save ${key}: ${e}`);
  }
}
export function locKey(prefix, dimensionId, loc) {
  return `${prefix}:${dimensionId}:${loc.x},${loc.y},${loc.z}`;
}
export function parseLocKey(prefix, key) {
  const m = String(key).match(new RegExp(`^${prefix}:(.+):(-?\\d+),(-?\\d+),(-?\\d+)$`));
  return m ? { dimensionId: m[1], loc: { x: +m[2], y: +m[3], z: +m[4] } } : undefined;
}

/** getBlock that returns undefined (instead of throwing) for unloaded chunks. */
export function safeBlock(dimension, loc) {
  try { return dimension.getBlock(loc); } catch { return undefined; }
}

// ---------------------------------------------------------------------------
// Player helpers
// ---------------------------------------------------------------------------
export function mainhand(player) {
  try { return player.getComponent("minecraft:equippable")?.getEquipmentSlot(EquipmentSlot.Mainhand); } catch { return undefined; }
}
export function heldItem(player) {
  const slot = mainhand(player);
  try { return slot?.hasItem() ? slot.getItem() : undefined; } catch { return undefined; }
}
export function isCreative(player) {
  try { return player.getGameMode() === GameMode.Creative; } catch { return false; }
}
/** Remove n of the held stack (never in Creative). */
export function consumeHeld(player, n = 1) {
  if (isCreative(player)) return;
  const slot = mainhand(player);
  try {
    if (!slot?.hasItem()) return;
    const s = slot.getItem();
    if (s.amount > n) { s.amount -= n; slot.setItem(s); } else slot.setItem(undefined);
  } catch {}
}

// Series compat may redirect what Baking hands out (e.g. Harvest's strawberry instead of
// ours when Harvest leads fruit). Installed by compat/index.js; identity by default.
let outputMapper = id => id;
export function setOutputMapper(fn) { outputMapper = typeof fn === "function" ? fn : id => id; }

function stacksOf(rawId, count) {
  const id = outputMapper(rawId) || rawId;
  const out = [];
  let left = Math.max(0, Math.floor(count));
  while (left > 0) {
    let s;
    try { s = new ItemStack(id, 1); } catch { console.warn(`[Kaleidoscope Baking] unknown item ${id}`); return out; }
    const n = Math.min(left, s.maxAmount || 64);
    s.amount = n;
    out.push(s);
    left -= n;
  }
  return out;
}

/** Spawn items as entities at a location (used when no player is involved). */
export function spawnItems(dimension, loc, id, count = 1) {
  for (const s of stacksOf(id, count)) try { dimension.spawnItem(s, loc); } catch {}
}

/** Give to the player's inventory; whatever does not fit drops at their feet. Never lost. */
export function giveItems(player, id, count = 1) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  for (const s of stacksOf(id, count)) {
    let rest = s;
    try { rest = inv ? inv.addItem(s) : s; } catch {}
    if (rest) try { player.dimension.spawnItem(rest, player.location); } catch {}
  }
}

/** Give a prepared ItemStack (keeps lore / dynamic properties). Drops it if the inventory is full. */
export function giveStack(player, stack) {
  let rest = stack;
  try { rest = player.getComponent("minecraft:inventory")?.container?.addItem(stack); } catch {}
  if (rest) try { player.dimension.spawnItem(rest, player.location); } catch {}
}

/** Does the inventory hold an item matching `pred(stack)`? */
export function hasInInventory(player, pred) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  if (!inv) return false;
  for (let i = 0; i < inv.size; i++) {
    try { const s = inv.getItem(i); if (s && pred(s)) return true; } catch {}
  }
  return false;
}

export function stackHasTag(stack, tag) {
  try { return !!stack?.hasTag(tag); } catch { return false; }
}

/** Takes a carrier (cup, mold...) from the inventory unless Creative. Returns false if missing. */
export function takeCarrier(player, id) {
  if (!id || isCreative(player)) return true;
  return !!takeOneFromInventory(player, s => s.typeId === id);
}

/** Find and remove one item matching `pred(stack)` from the inventory. Returns its id. */
export function takeOneFromInventory(player, pred) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  if (!inv) return undefined;
  for (let i = 0; i < inv.size; i++) {
    let s;
    try { s = inv.getItem(i); } catch { continue; }
    if (!s || !pred(s)) continue;
    const id = s.typeId;
    if (s.amount > 1) { s.amount -= 1; inv.setItem(i, s); } else inv.setItem(i, undefined);
    return id;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Feedback (no on-screen text: sound and particles only)
// ---------------------------------------------------------------------------
/** "Not like that": a low note and a small puff, instead of a text prompt. The held item is never taken. */
export function refuse(dimension, loc) {
  try { dimension.playSound("note.bass", loc, { volume: 0.6, pitch: 0.6 }); } catch {}
  try { dimension.spawnParticle("minecraft:basic_smoke_particle", loc); } catch {}
}

export function sound(dimension, id, loc, volume = 1, pitch = 1) {
  try { dimension.playSound(id, loc, { volume, pitch }); } catch {}
}
export function particle(dimension, id, loc) {
  try { dimension.spawnParticle(id, loc); } catch {}
}
