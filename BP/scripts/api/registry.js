// ## Kaleidoscope script role: Public extension/API contract (pure; no @minecraft imports).
// ============================================================================
// Kaleidoscope Baking recipe registry (API v1)
// ----------------------------------------------------------------------------
// Contract (mirrors Kaleidoscope Cookery's extension API so authors learn one style):
// - Built-in arrays are never mutated; extension entries live in Maps layered on top.
// - Registration is idempotent by (kind + source + recipe.id).
// - Extension entries are ordered by registration key, never by script load order.
// - Nothing is persisted; addons re-register on every world load.
// - Invalid payloads are rejected with a reason; they never touch built-in data.
// ============================================================================
import { cleanId, cleanSpec, nonnegativeInt, orderedValues, positiveInt, sourceName } from "../utils/ids.js";
import { matchesSpec, matchesSlot } from "./ingredients.js";
import { matchShapeless } from "./matcher.js";
import { BUILTIN_FUELS, BUILTIN_MIXING_RECIPES, BUILTIN_OVEN_RECIPES, DEFAULT_BURNT_RESULT } from "../data/recipes.js";

export const KB_API_VERSION = 1;
export const MAX_MIXING_INGREDIENTS = 9;

export const KB_CAPABILITIES = Object.freeze([
  "oven", "mixing_bowl", "ingredient_tags", "fuels", "whisk_tag", "mold_tag"
]);

const extensionOven = new Map();
const extensionMixing = new Map();
const extensionFuels = new Map();

function normalizeSlot(raw) {
  const options = (Array.isArray(raw) ? raw : [raw]).map(cleanSpec).filter(Boolean);
  return options.length ? Object.freeze([...new Set(options)]) : undefined;
}

export function normalizeMixing(raw, extension = true) {
  const id = cleanId(raw?.id), result = cleanId(raw?.result);
  if (!id || !result || !Array.isArray(raw?.ingredients)) return undefined;
  if (!raw.ingredients.length || raw.ingredients.length > MAX_MIXING_INGREDIENTS) return undefined;
  const slots = [];
  for (const s of raw.ingredients) {
    const slot = normalizeSlot(s);
    if (!slot) return undefined;
    slots.push(slot);
  }
  return Object.freeze({
    id, result, slots: Object.freeze(slots),
    count: positiveInt(raw?.count, 1, 64),
    whisks: positiveInt(raw?.whisks, 4, 64),
    extension
  });
}

export function normalizeOven(raw, extension = true) {
  const id = cleanId(raw?.id), input = cleanSpec(raw?.input), result = cleanId(raw?.result);
  if (!id || !input || !result) return undefined;
  // mold: optional. "" / missing = no mold. Invalid non-empty mold rejects the recipe so
  // a typo never silently turns a mold recipe into a mold-free one.
  let mold = "";
  if (raw?.mold !== undefined && raw?.mold !== "") {
    mold = cleanSpec(raw.mold);
    if (!mold) return undefined;
  }
  let burntResult = DEFAULT_BURNT_RESULT;
  if (raw?.burntResult !== undefined && raw?.burntResult !== "") {
    burntResult = cleanId(raw.burntResult);
    if (!burntResult) return undefined;
  }
  return Object.freeze({
    id, input, mold, result, burntResult,
    count: positiveInt(raw?.count, 1, 64),
    time: Math.max(20, nonnegativeInt(raw?.time, 400, 72000)),
    perfectWindow: Math.max(20, nonnegativeInt(raw?.perfectWindow, 200, 72000)),
    extension
  });
}

export function normalizeFuel(raw, extension = true) {
  const id = cleanSpec(raw?.id);
  if (!id) return undefined;
  const ticks = nonnegativeInt(raw?.ticks, 0, 72000);
  if (ticks < 20) return undefined;
  const returns = raw?.returns ? cleanId(raw.returns) : "";
  if (raw?.returns && !returns) return undefined;
  return Object.freeze({ id, ticks, returns, extension });
}

const BUILTIN_MIXING = BUILTIN_MIXING_RECIPES.map(r => normalizeMixing(r, false));
const BUILTIN_OVEN = BUILTIN_OVEN_RECIPES.map(r => normalizeOven(r, false));
const BUILTIN_FUEL = BUILTIN_FUELS.map(r => normalizeFuel(r, false));
if (BUILTIN_MIXING.some(r => !r) || BUILTIN_OVEN.some(r => !r) || BUILTIN_FUEL.some(r => !r)) {
  throw new Error("[Kaleidoscope Baking] Built-in recipe data failed validation.");
}

/**
 * payload: {api:1, kind:"oven"|"mixing_bowl", source:"my_addon", recipe:{...}}
 */
export function registerRecipe(payload) {
  if (!payload || Number(payload.api) !== KB_API_VERSION) return { ok: false, reason: "api_version" };
  const kind = String(payload.kind ?? "");
  const source = sourceName(payload.source);
  let recipe, map;
  if (kind === "oven") { recipe = normalizeOven(payload.recipe); map = extensionOven; }
  else if (kind === "mixing_bowl") { recipe = normalizeMixing(payload.recipe); map = extensionMixing; }
  else return { ok: false, reason: "kind" };
  if (!recipe) return { ok: false, reason: "schema" };
  map.set(`${kind}|${source}|${recipe.id}`, recipe);
  return { ok: true, kind, source, id: recipe.id };
}

/** payload: {api:1, source:"my_addon", fuel:{id:"my_addon:peat", ticks:1200, returns?}} */
export function registerFuel(payload) {
  if (!payload || Number(payload.api) !== KB_API_VERSION) return { ok: false, reason: "api_version" };
  const fuel = normalizeFuel(payload.fuel ?? payload);
  if (!fuel) return { ok: false, reason: "schema" };
  const source = sourceName(payload.source);
  extensionFuels.set(`${source}|${fuel.id}`, fuel);
  return { ok: true, id: fuel.id, ticks: fuel.ticks };
}

function allOven() { return [...BUILTIN_OVEN, ...orderedValues(extensionOven)]; }
function allMixing() { return [...BUILTIN_MIXING, ...orderedValues(extensionMixing)]; }
function allFuels() {
  // Exact ids before tags so a specific registration beats a broad tag.
  const list = [...BUILTIN_FUEL, ...orderedValues(extensionFuels)];
  return [...list.filter(f => !f.id.startsWith("#")), ...list.filter(f => f.id.startsWith("#"))];
}

export function getOvenRecipe(itemId) {
  if (!itemId) return undefined;
  for (const r of allOven()) if (matchesSpec(itemId, r.input)) return r;
  return undefined;
}

export function getOvenRecipeById(id) {
  return allOven().find(r => r.id === id);
}

export function getMixingRecipe(contents) {
  if (!Array.isArray(contents) || !contents.length) return undefined;
  for (const r of allMixing()) if (matchShapeless(contents, r.slots)) return r;
  return undefined;
}

/** Can this item go into the mixing bowl at all (does any recipe use it)? */
export function isMixingIngredient(itemId) {
  if (!itemId) return false;
  for (const r of allMixing()) for (const slot of r.slots) if (matchesSlot(itemId, slot)) return true;
  return false;
}

export function getFuel(itemId) {
  if (!itemId) return undefined;
  for (const f of allFuels()) if (matchesSpec(itemId, f.id)) return f;
  return undefined;
}

/** Read-only snapshot for the guidebook / debugging. */
export function listRecipes() {
  return { oven: allOven(), mixing_bowl: allMixing(), fuels: allFuels() };
}

export function _resetRegistryForTests() {
  extensionOven.clear();
  extensionMixing.clear();
  extensionFuels.clear();
}
