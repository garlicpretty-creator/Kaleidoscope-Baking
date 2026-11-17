// ## Kaleidoscope script role: Station rules (pure; no @minecraft imports).
// State machines for the smaller stations. The runtime components only translate player
// interactions into these calls and persist the returned state.
import {
  MAX_SHAKER_INGREDIENTS, decoratingCandidates, getEspressoRecipe, getProofingRecipe, getShakerRecipe,
  isDecoratingBase, isEspressoAdditive, isEspressoInput, isShakerIngredient
} from "./registry.js";

// ---------------------------------------------------------------------------
// Proofing basket: one stack (same item) rises over time.
// state: {input, count, recipe, progress}
// ---------------------------------------------------------------------------
export const PROOFING_MAX = 16;
export function emptyProofing() { return { input: "", count: 0, recipe: "", progress: 0 }; }
export function normalizeProofing(raw) {
  const s = emptyProofing();
  if (raw && typeof raw.input === "string" && raw.input) {
    s.input = raw.input;
    s.count = Math.max(0, Math.min(PROOFING_MAX, Math.floor(Number(raw.count) || 0)));
    s.recipe = typeof raw.recipe === "string" ? raw.recipe : "";
    s.progress = Math.max(0, Math.floor(Number(raw.progress) || 0));
  }
  if (!s.count) return emptyProofing();
  return s;
}
/** Add up to `n` items. Returns how many were accepted. Adding resets the rise. */
export function addProofing(s, id, n) {
  const recipe = getProofingRecipe(id);
  if (!recipe) return { added: 0, reason: "not_doughy" };
  if (s.count && s.input !== id) return { added: 0, reason: "different" };
  const added = Math.min(n, PROOFING_MAX - s.count);
  if (!added) return { added: 0, reason: "full" };
  s.input = id; s.count += added; s.recipe = recipe.id; s.progress = 0;
  return { added };
}
/** Advance by dt * multiplier (warmth). Returns true when it just finished. */
export function tickProofing(s, dt, multiplier, recipe) {
  if (!s.count || !recipe || s.progress >= recipe.time) return false;
  s.progress += Math.max(0, dt * multiplier);
  return s.progress >= recipe.time;
}
export function proofingYield(s, recipe) {
  if (!s.count) return [];
  const done = recipe && s.progress >= recipe.time;
  return [{ id: done ? recipe.result : s.input, count: done ? s.count * recipe.count : s.count }];
}

// ---------------------------------------------------------------------------
// Decorating stand: a base then ordered layers.
// state: {base, layers:[]}
// ---------------------------------------------------------------------------
export function emptyStand() { return { base: "", layers: [] }; }
export function normalizeStand(raw) {
  const s = emptyStand();
  if (raw && typeof raw.base === "string") s.base = raw.base;
  if (s.base && Array.isArray(raw.layers)) s.layers = raw.layers.filter(x => typeof x === "string").slice(0, 6);
  return s;
}
/**
 * Put an item on the stand.
 * -> {ok:false, reason} | {ok:true, complete?: recipe}  (complete = finished, give result now)
 */
export function addToStand(s, id) {
  if (!s.base) {
    if (!isDecoratingBase(id)) return { ok: false, reason: "not_base" };
    s.base = id;
    return { ok: true };
  }
  const next = [...s.layers, id];
  const cands = decoratingCandidates(s.base, next);
  if (!cands.length) return { ok: false, reason: "wrong_layer" };
  s.layers = next;
  const exact = cands.find(r => r.layers.length === next.length);
  // Auto-finish only when nothing longer could still be built on top.
  if (exact && cands.every(r => r.layers.length === next.length)) return { ok: true, complete: exact };
  return { ok: true };
}
/** Exact recipe for the current stack, if any (used for an empty-hand "finish"). */
export function standRecipe(s) {
  if (!s.base) return undefined;
  return decoratingCandidates(s.base, s.layers).find(r => r.layers.length === s.layers.length);
}
/** What the next layer could be (ids/specs), for hints. */
export function standNextOptions(s) {
  if (!s.base) return [];
  const out = new Set();
  for (const r of decoratingCandidates(s.base, s.layers)) if (r.layers[s.layers.length]) for (const o of r.layers[s.layers.length]) out.add(o);
  return [...out];
}
/** Undo one step: returns the item id given back. */
export function popStand(s) {
  if (s.layers.length) return s.layers.pop();
  const b = s.base; s.base = ""; return b || undefined;
}

// ---------------------------------------------------------------------------
// Shaker: up to 6 ingredients, shaken N times, then sweetness/ice choice.
// state: {items:[{id, spilled}], shakes}
// ---------------------------------------------------------------------------
export function emptyShaker() { return { items: [], shakes: 0 }; }
export function normalizeShaker(raw) {
  const s = emptyShaker();
  for (const it of Array.isArray(raw?.items) ? raw.items : []) {
    if (s.items.length >= MAX_SHAKER_INGREDIENTS) break;
    if (it && typeof it.id === "string") s.items.push({ id: it.id, spilled: !!it.spilled });
  }
  s.shakes = Math.max(0, Math.floor(Number(raw?.shakes) || 0));
  return s;
}
export function addToShaker(s, id, spilled = false) {
  if (s.items.length >= MAX_SHAKER_INGREDIENTS) return { ok: false, reason: "full" };
  if (!isShakerIngredient(id)) return { ok: false, reason: "not_ingredient" };
  s.items.push({ id, spilled }); s.shakes = 0;
  return { ok: true };
}
export function shakerRecipe(s) { return getShakerRecipe(s.items.map(i => i.id)); }
/** {result:"none"} | {result:"progress", done, need, recipe} | {result:"done", recipe} (contents cleared) */
export function shake(s) {
  const recipe = shakerRecipe(s);
  if (!recipe) return { result: "none" };
  s.shakes += 1;
  if (s.shakes < recipe.shakes) return { result: "progress", done: s.shakes, need: recipe.shakes, recipe };
  s.items = []; s.shakes = 0;
  return { result: "done", recipe };
}
export function takeFromShaker(s) {
  const out = s.items.filter(i => !i.spilled).map(i => i.id);
  s.items = []; s.shakes = 0;
  return out;
}

export const SWEETNESS = Object.freeze(["full", "less", "half", "light", "none", "stevia"]);
export const ICE = Object.freeze(["regular", "less", "light", "none", "warm", "hot"]);
/** Saturation bonus by sweetness (stevia: sweet taste, no extra saturation). */
export const SWEETNESS_SATURATION = Object.freeze({ full: 2, less: 1.5, half: 1, light: 0.5, none: 0, stevia: 0 });

// ---------------------------------------------------------------------------
// Espresso machine: water tank, coffee + optional additive, needs redstone power.
// state: {water, coffee, additive, cup, progress, ready}
// ---------------------------------------------------------------------------
export const ESPRESSO_WATER_MAX = 4;
export function emptyEspresso() { return { water: 0, coffee: "", additive: "", cup: "", progress: 0, ready: "" }; }
export function normalizeEspresso(raw) {
  const s = emptyEspresso();
  if (!raw || typeof raw !== "object") return s;
  s.water = Math.max(0, Math.min(ESPRESSO_WATER_MAX, Math.floor(Number(raw.water) || 0)));
  for (const f of ["coffee", "additive", "cup", "ready"]) if (typeof raw[f] === "string") s[f] = raw[f];
  s.progress = Math.max(0, Math.floor(Number(raw.progress) || 0));
  return s;
}
/** Which recipe would brew from the current coffee + additive (undefined = invalid combo). */
export function espressoRecipe(s) {
  return s.coffee ? getEspressoRecipe(s.coffee, s.additive) : undefined;
}
export function loadEspressoCoffee(s, id) {
  if (s.ready) return { ok: false, reason: "take_first" };
  if (s.coffee) return { ok: false, reason: "busy" };
  if (!isEspressoInput(id)) return { ok: false, reason: "not_coffee" };
  if (s.additive && !getEspressoRecipe(id, s.additive)) return { ok: false, reason: "bad_combo" };
  s.coffee = id; s.progress = 0;
  return { ok: true };
}
export function loadEspressoAdditive(s, id) {
  if (s.ready) return { ok: false, reason: "take_first" };
  if (s.additive) return { ok: false, reason: "busy" };
  if (!isEspressoAdditive(id)) return { ok: false, reason: "not_additive" };
  if (s.coffee && !getEspressoRecipe(s.coffee, id)) return { ok: false, reason: "bad_combo" };
  s.additive = id; s.progress = 0;
  return { ok: true };
}
/**
 * Brewing tick. `power` = redstone signal 0..15. Strength 15 brews ~50% faster.
 * Returns {state:"idle"|"no_power"|"no_water"|"brewing"|"done"}.
 */
export function tickEspresso(s, dt, power) {
  const recipe = espressoRecipe(s);
  if (!recipe || s.ready) return { state: "idle" };
  if (power <= 0) return { state: "no_power" };
  if (s.water <= 0) return { state: "no_water" };
  s.progress += dt * (1 + Math.min(15, power) / 30);
  if (s.progress < recipe.time) return { state: "brewing" };
  s.water -= 1; s.ready = recipe.result; s.coffee = ""; s.additive = ""; s.progress = 0;
  return { state: "done", recipe };
}

// ---------------------------------------------------------------------------
// Caffeine & palpitations (proposal §3.4.5)
// ---------------------------------------------------------------------------
export const CAFFEINE_DECAY_TICKS = 1200;
/**
 * Apply one drink. Returns {level, positive, stage}
 *   positive: whether the coffee's good effects should still apply (only below 3 before drinking)
 *   stage: 0 normal, 1 palpitations (3-4), 2 severe (>=5)
 */
export function drinkCaffeine(level, caffeine, reduces = 0) {
  const before = Math.max(0, Math.floor(level) || 0);
  const after = Math.max(0, before + Math.max(0, caffeine) - Math.max(0, reduces));
  const stage = caffeine > 0 ? (after >= 5 ? 2 : after >= 3 ? 1 : 0) : 0;
  return { level: after, positive: before < 3, stage };
}
