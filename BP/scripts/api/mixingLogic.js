// ## Kaleidoscope script role: Station rules (pure; no @minecraft imports).
// Mixing bowl state: { items:[{id, spilled}], whisks, batch }
//   - `spilled: true` marks a liquid whose container was already handed back (milk bucket,
//     water bucket, honey bottle). It counts as an ingredient but is never dropped back
//     as an item, so the container can't be duplicated.
//   - Any content change resets the whisk counter.
//   - `batch` (1..MAX_BATCH): the bowl holds that many full sets of `items` (sneak-use with a
//     stack fills it that way); the result is multiplied by it. A batched bowl takes nothing
//     more by hand, and gives everything back at once.
import { all, getMixingRecipe, isMixingIngredient, MAX_MIXING_INGREDIENTS } from "./registry.js";
import { matchesSlot } from "./ingredients.js";

export const MAX_BATCH = 4;

export function emptyBowl() {
  return { items: [], whisks: 0, batch: 1 };
}

export function normalizeBowl(raw) {
  const s = emptyBowl();
  for (const it of Array.isArray(raw?.items) ? raw.items : []) {
    if (s.items.length >= MAX_MIXING_INGREDIENTS) break;
    if (it && typeof it.id === "string") s.items.push({ id: it.id, spilled: !!it.spilled });
  }
  s.whisks = Math.max(0, Math.floor(Number(raw?.whisks) || 0));
  s.batch = s.items.length ? Math.max(1, Math.min(MAX_BATCH, Math.floor(Number(raw?.batch) || 1))) : 1;
  return s;
}

/** Returns {ok, reason} and mutates state on success. */
export function addToBowl(state, id, spilled = false) {
  if (state.batch > 1) return { ok: false, reason: "batched" };
  if (state.items.length >= MAX_MIXING_INGREDIENTS) return { ok: false, reason: "full" };
  if (!isMixingIngredient(id)) return { ok: false, reason: "not_ingredient" };
  state.items.push({ id, spilled });
  state.whisks = 0;
  return { ok: true };
}

/** Removes items for the player (one id per item). Spilled liquids are discarded, not returned. */
export function takeFromBowl(state, all = false) {
  const batch = state.batch > 1 ? state.batch : 1;
  const removed = all || batch > 1 ? state.items.splice(0) : state.items.splice(-1, 1);
  if (removed.length) { state.whisks = 0; state.batch = 1; }
  const out = [];
  for (const i of removed) if (!i.spilled) for (let n = 0; n < batch; n++) out.push(i.id);
  return out;
}

/** Best recipe for the current contents, ignoring which tool will be used (for hints). */
export function currentRecipe(state) {
  return getMixingRecipe(state.items.map(i => i.id));
}

/**
 * One stroke with `toolId` (a whisk, a milk frother, ... — the recipe's tool spec decides).
 * {result:"none"} no matching recipe | {result:"progress", done, need} | {result:"done", recipe, count}
 */
export function whiskBowl(state, toolId) {
  const recipe = getMixingRecipe(state.items.map(i => i.id), toolId);
  if (!recipe) return { result: "none" };
  state.whisks += 1;
  if (state.whisks < recipe.whisks) return { result: "progress", done: state.whisks, need: recipe.whisks, recipe };
  const count = recipe.count * (state.batch > 1 ? state.batch : 1);
  state.items = [];
  state.whisks = 0;
  state.batch = 1;
  return { result: "done", recipe, count };
}

/** Strokes still needed with `toolId` (0 when that tool mixes nothing here). */
export function strokesLeft(state, toolId) {
  const recipe = getMixingRecipe(state.items.map(i => i.id), toolId);
  return recipe ? Math.max(1, recipe.whisks - state.whisks) : 0;
}

/**
 * Sneak-use with a stack: find the first recipe (registry order: specific before general)
 * that the bowl's current contents plus the player's inventory complete, using the held item.
 *   inventory: Map(id -> count), the held stack included
 * Returns {recipe, add:[ids for one set], take: Map(id -> count to remove), batch} or undefined.
 * The batch is as many full sets as the inventory holds, at most MAX_BATCH, and never more
 * than one stack of the result. Contents already in the bowl count as one set; later sets
 * take those ingredients from the inventory too.
 */
export function planFullSet(state, heldId, inventory, maxBatch = MAX_BATCH, maxStack = () => 64) {
  if (state.batch > 1 || !heldId || !(inventory?.get(heldId) > 0)) return undefined;
  const contents = state.items.map(i => i.id);
  for (const recipe of all("mixing_bowl")) {
    if (recipe.slots.length <= contents.length || !recipe.slots.some(sl => matchesSlot(heldId, sl))) continue;
    const add = fillSlots(recipe.slots, contents, heldId, inventory);
    if (!add) continue;
    const perSet = countIds(add);
    const again = countIds(contents);
    const limit = Math.max(1, Math.min(maxBatch, Math.floor(maxStack(recipe.result) / Math.max(1, recipe.count))));
    let batch = 0;
    for (let n = 1; n <= limit; n++) {
      const need = new Map();
      for (const [id, c] of perSet) need.set(id, c * n);
      for (const [id, c] of again) need.set(id, (need.get(id) ?? 0) + c * (n - 1));
      if ([...need].every(([id, c]) => (inventory.get(id) ?? 0) >= c)) batch = n; else break;
    }
    if (!batch) continue;
    const take = new Map();
    for (const [id, c] of perSet) take.set(id, c * batch);
    for (const [id, c] of again) take.set(id, (take.get(id) ?? 0) + c * (batch - 1));
    return { recipe, add, take, batch };
  }
  return undefined;
}

function countIds(ids) {
  const m = new Map();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

/**
 * Assign the bowl contents to distinct slots, then fill the remaining slots from the
 * inventory (held item preferred, and used at least once). Returns the added ids or undefined.
 */
function fillSlots(slots, contents, heldId, inventory) {
  const used = new Array(slots.length).fill(false);
  const ids = [heldId, ...[...inventory.keys()].filter(id => id !== heldId)];
  const left = new Map(inventory);
  const placeContents = k => {
    if (k === contents.length) return fillRest();
    for (let i = 0; i < slots.length; i++) {
      if (used[i] || !matchesSlot(contents[k], slots[i])) continue;
      used[i] = true;
      const r = placeContents(k + 1);
      if (r) return r;
      used[i] = false;
    }
    return undefined;
  };
  const fillRest = () => {
    // narrowest slots first; give up at once when one has no candidate at all
    const options = i => ids.filter(id => matchesSlot(id, slots[i])).length;
    const free = slots.map((s, i) => i).filter(i => !used[i]).sort((a, b) => options(a) - options(b));
    if (free.some(i => !options(i)) || !free.some(i => matchesSlot(heldId, slots[i]))) return undefined;
    const picks = [];
    const go = j => {
      if (j === free.length) return picks.includes(heldId) ? [...picks] : undefined;
      for (const id of ids) {
        if (!(left.get(id) > 0) || !matchesSlot(id, slots[free[j]])) continue;
        left.set(id, left.get(id) - 1);
        picks.push(id);
        const r = go(j + 1);
        if (r) return r;
        picks.pop();
        left.set(id, left.get(id) + 1);
      }
      return undefined;
    };
    return go(0);
  };
  return placeContents(0);
}
