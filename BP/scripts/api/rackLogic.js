// ## Kaleidoscope script role: Station rules (pure; no @minecraft imports). Convenience update, phase 3.
// Cooling rack and mug rack state, and the stand mixer's batch output.
//
// Cooling rack: { bakes: [{ items:[{id, count}], warm }] }, at most COOLING_SLOTS bakes.
//   A bake is one oven slot's whole yield (the result and its mold), so taking it back is lossless.
//   `warm` = ticks of visible steam left; it only drives particles, the food is the same.
// Mug rack:     { mugs: [id] }, at most MUG_SLOTS: empty mugs or finished mug drinks.
//   The espresso machine takes an empty mug and puts the drink back in the same place, so it always fits.

export const COOLING_SLOTS = 4;
export const COOL_TICKS = 1200; // one minute of steam
export const MUG_SLOTS = 6;

const posInt = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

export function normalizeCooling(raw) {
  const bakes = [];
  for (const b of Array.isArray(raw?.bakes) ? raw.bakes : []) {
    if (bakes.length >= COOLING_SLOTS) break;
    const items = (Array.isArray(b?.items) ? b.items : [])
      .filter(i => i && typeof i.id === "string" && i.id && Number(i.count) > 0)
      .map(i => ({ id: i.id, count: Math.floor(Number(i.count)) }));
    if (items.length) bakes.push({ items, warm: posInt(b.warm, COOL_TICKS) });
  }
  return { bakes };
}
export const coolingEmpty = s => !s.bakes.length;

/** Puts one oven slot's yield on the rack. False (and nothing changes) when the rack is full. */
export function addBake(s, items, warm = COOL_TICKS) {
  const list = (items ?? []).filter(i => i?.id && i.count > 0).map(i => ({ id: i.id, count: i.count }));
  if (!list.length || s.bakes.length >= COOLING_SLOTS) return false;
  s.bakes.push({ items: list, warm: posInt(warm, COOL_TICKS) });
  return true;
}

/** Cools every bake by dt ticks. Returns the indices still steaming. */
export function coolTick(s, dt) {
  const warm = [];
  s.bakes.forEach((b, i) => {
    b.warm = Math.max(0, b.warm - dt);
    if (b.warm > 0) warm.push(i);
  });
  return warm;
}

/** By hand: the oldest bake (it has cooled longest); `all` takes every bake. Returns the item lists. */
export function takeBakes(s, all = false) {
  return (all ? s.bakes.splice(0) : s.bakes.splice(0, 1)).map(b => b.items);
}

/** What the rack shows in spot i: the bake itself (its first item), not the mold. */
export const shownBake = (s, i) => s.bakes[i]?.items[0]?.id;

export function normalizeMugs(raw) {
  const mugs = (Array.isArray(raw?.mugs) ? raw.mugs : []).filter(id => typeof id === "string" && id).slice(0, MUG_SLOTS);
  return { mugs };
}
export const mugsEmpty = s => !s.mugs.length;

/** Hang up to `n` items of `id` (an empty mug or a mug drink). Returns how many went on. */
export function hangMugs(s, id, n = 1) {
  const k = Math.max(0, Math.min(n, MUG_SLOTS - s.mugs.length));
  for (let i = 0; i < k; i++) s.mugs.push(id);
  return k;
}

/**
 * By hand: a finished drink first (the newest), otherwise an empty mug; `all` takes everything.
 * `isEmptyMug(id)` tells the empty carriers apart from drinks. Returns the ids taken.
 */
export function takeMugs(s, isEmptyMug, all = false) {
  if (all) return s.mugs.splice(0);
  for (let i = s.mugs.length - 1; i >= 0; i--) if (!isEmptyMug(s.mugs[i])) return s.mugs.splice(i, 1);
  return s.mugs.length ? s.mugs.splice(-1, 1) : [];
}

/** The index of an empty `carrier` on the rack, or -1. */
export const emptyMugIndex = (s, carrier) => s.mugs.indexOf(carrier);

/** The machine fills the mug at index i with `drink` (in place). */
export function fillMug(s, i, drink) {
  if (i < 0 || i >= s.mugs.length) return false;
  s.mugs[i] = drink;
  return true;
}

// ---------------------------------------------------------------------------
// Stand mixer: the bowl state of api/mixingLogic.js plus what it made, waiting to be taken
// { bowl, out: {id, count} | null, powered }
// ---------------------------------------------------------------------------
export function normalizeMixerOut(raw) {
  return raw && typeof raw.id === "string" && raw.id && Number(raw.count) > 0 ? { id: raw.id, count: Math.floor(Number(raw.count)) } : null;
}

/** A redstone pulse runs the mixer once per rising edge, so a lever left on does not mix half-loaded bowls. */
export function risingEdge(s, power) {
  const on = power > 0;
  const edge = on && !s.powered;
  s.powered = on;
  return edge;
}
