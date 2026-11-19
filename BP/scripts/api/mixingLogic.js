// ## Kaleidoscope script role: Station rules (pure; no @minecraft imports).
// Mixing bowl state: { items:[{id, spilled}], whisks }
//   - `spilled: true` marks a liquid whose container was already handed back (milk bucket,
//     water bucket, honey bottle). It counts as an ingredient but is never dropped back
//     as an item, so the container can't be duplicated.
//   - Any content change resets the whisk counter.
import { getMixingRecipe, isMixingIngredient, MAX_MIXING_INGREDIENTS } from "./registry.js";

export function emptyBowl() {
  return { items: [], whisks: 0 };
}

export function normalizeBowl(raw) {
  const s = emptyBowl();
  for (const it of Array.isArray(raw?.items) ? raw.items : []) {
    if (s.items.length >= MAX_MIXING_INGREDIENTS) break;
    if (it && typeof it.id === "string") s.items.push({ id: it.id, spilled: !!it.spilled });
  }
  s.whisks = Math.max(0, Math.floor(Number(raw?.whisks) || 0));
  return s;
}

/** Returns {ok, reason} and mutates state on success. */
export function addToBowl(state, id, spilled = false) {
  if (state.items.length >= MAX_MIXING_INGREDIENTS) return { ok: false, reason: "full" };
  if (!isMixingIngredient(id)) return { ok: false, reason: "not_ingredient" };
  state.items.push({ id, spilled });
  state.whisks = 0;
  return { ok: true };
}

/** Removes items for the player. Spilled liquids are discarded, not returned. */
export function takeFromBowl(state, all = false) {
  const removed = all ? state.items.splice(0) : state.items.splice(-1, 1);
  if (removed.length) state.whisks = 0;
  return removed.filter(i => !i.spilled).map(i => i.id);
}

/** Best recipe for the current contents, ignoring which tool will be used (for hints). */
export function currentRecipe(state) {
  return getMixingRecipe(state.items.map(i => i.id));
}

/**
 * One stroke with `toolId` (a whisk, a milk frother, ... — the recipe's tool spec decides).
 * {result:"none"} no matching recipe | {result:"progress", done, need} | {result:"done", recipe}
 */
export function whiskBowl(state, toolId) {
  const recipe = getMixingRecipe(state.items.map(i => i.id), toolId);
  if (!recipe) return { result: "none" };
  state.whisks += 1;
  if (state.whisks < recipe.whisks) return { result: "progress", done: state.whisks, need: recipe.whisks, recipe };
  state.items = [];
  state.whisks = 0;
  return { result: "done", recipe };
}
