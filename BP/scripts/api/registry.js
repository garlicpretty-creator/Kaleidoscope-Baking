// ## Kaleidoscope script role: Public extension/API contract (pure; no @minecraft imports).
// ============================================================================
// Kaleidoscope Baking recipe registry (API v1)
// ----------------------------------------------------------------------------
// Contract (mirrors Kaleidoscope Cookery's extension API so authors learn one style):
// - Built-in arrays are never mutated; extension entries live in Maps layered on top.
// - Registration is idempotent by (kind + source + recipe.id).
// - Extension entries are ordered by registration key, never by script load order.
// - Built-in recipes are checked first, so they win for the same input.
// - Nothing is persisted; addons re-register on every world load.
// - Invalid payloads are rejected with a reason; they never touch built-in data.
// ============================================================================
import { cleanId, cleanSpec, nonnegativeInt, orderedValues, positiveInt, sourceName } from "../utils/ids.js";
import { matchesSpec, matchesSlot } from "./ingredients.js";
import { matchShapeless } from "./matcher.js";
import { BUILTIN_FUELS, BUILTIN_RECIPES, DEFAULT_BURNT_RESULT } from "../data/recipes.js";

export const KB_API_VERSION = 1;
export const MAX_MIXING_INGREDIENTS = 9;
export const MAX_SHAKER_INGREDIENTS = 6;
export const DEFAULT_WHISK = "#kaleidoscope_baking:whisk";

// ---------------------------------------------------------------------------
// Normalizers. Each returns a frozen recipe or undefined (= reject).
// ---------------------------------------------------------------------------
function slot(raw) {
  const options = (Array.isArray(raw) ? raw : [raw]).map(cleanSpec).filter(Boolean);
  return options.length ? Object.freeze([...new Set(options)]) : undefined;
}
function slots(raw, max) {
  if (!Array.isArray(raw) || !raw.length || raw.length > max) return undefined;
  const out = [];
  for (const s of raw) { const n = slot(s); if (!n) return undefined; out.push(n); }
  return Object.freeze(out);
}
/** Optional spec/id: missing or "" -> "", invalid -> undefined (reject the recipe). */
function optional(raw, clean) {
  if (raw === undefined || raw === null || raw === "") return "";
  const v = clean(raw);
  return v || undefined;
}
const base = (raw, extension) => {
  const id = cleanId(raw?.id), result = cleanId(raw?.result);
  return id && result ? { id, result, count: positiveInt(raw?.count, 1, 64), extension } : undefined;
};

const NORMALIZE = {
  mixing_bowl(raw, ext) {
    const b = base(raw, ext); const s = slots(raw?.ingredients, MAX_MIXING_INGREDIENTS);
    const tool = optional(raw?.tool, cleanSpec);
    if (!b || !s || tool === undefined) return undefined;
    return { ...b, slots: s, whisks: positiveInt(raw?.whisks, 4, 64), tool: tool || DEFAULT_WHISK };
  },
  oven(raw, ext) {
    const b = base(raw, ext); const input = cleanSpec(raw?.input);
    const mold = optional(raw?.mold, cleanSpec);
    const burnt = optional(raw?.burntResult, cleanId);
    if (!b || !input || mold === undefined || burnt === undefined) return undefined;
    // roast: [light, medium, dark] — the perfect window is split in thirds (coffee beans).
    let roast;
    if (raw?.roast !== undefined) {
      roast = Array.isArray(raw.roast) && raw.roast.length === 3 ? raw.roast.map(cleanId) : [];
      if (roast.length !== 3 || roast.some(x => !x)) return undefined;
      roast = Object.freeze(roast);
    }
    return {
      ...b, input, mold, burntResult: burnt || DEFAULT_BURNT_RESULT, roast,
      time: Math.max(20, nonnegativeInt(raw?.time, 400)),
      perfectWindow: Math.max(20, nonnegativeInt(raw?.perfectWindow, 200))
    };
  },
  proofing(raw, ext) {
    const b = base(raw, ext); const input = cleanSpec(raw?.input);
    if (!b || !input) return undefined;
    return { ...b, input, time: Math.max(20, nonnegativeInt(raw?.time, 1200)) };
  },
  decorating(raw, ext) {
    const b = base(raw, ext); const baseItem = cleanSpec(raw?.base); const layers = slots(raw?.layers, 6);
    if (!b || !baseItem || !layers) return undefined;
    return { ...b, base: baseItem, layers };
  },
  espresso(raw, ext) {
    const b = base(raw, ext); const input = cleanSpec(raw?.input);
    const additive = optional(raw?.additive, cleanSpec); const carrier = optional(raw?.carrier, cleanId);
    if (!b || !input || additive === undefined || carrier === undefined) return undefined;
    return { ...b, input, additive, carrier, time: Math.max(20, nonnegativeInt(raw?.time, 200)) };
  },
  pour_over(raw, ext) {
    const b = base(raw, ext); const input = cleanSpec(raw?.input); const carrier = optional(raw?.carrier, cleanId);
    if (!b || !input || carrier === undefined) return undefined;
    return { ...b, input, carrier };
  },
  shaker(raw, ext) {
    const b = base(raw, ext); const s = slots(raw?.ingredients, MAX_SHAKER_INGREDIENTS);
    const carrier = optional(raw?.carrier, cleanId);
    const temperature = ["cold", "hot", "any"].includes(raw?.temperature) ? raw.temperature : "cold";
    if (!b || !s || carrier === undefined) return undefined;
    return {
      ...b, slots: s, carrier, temperature,
      shakes: positiveInt(raw?.shakes, 5, 64),
      sweetness: raw?.allowSweetness !== false, ice: raw?.allowIce !== false && temperature !== "hot"
    };
  }
};
export const RECIPE_KINDS = Object.freeze(Object.keys(NORMALIZE));

export const KB_CAPABILITIES = Object.freeze([
  ...RECIPE_KINDS, "ingredient_tags", "fuels", "food_effects", "bulk", "whisk_tag", "frother_tag", "mold_tag"
]);

export function normalizeRecipe(kind, raw, extension = true) {
  const fn = NORMALIZE[kind];
  const r = fn ? fn(raw, extension) : undefined;
  return r ? Object.freeze(r) : undefined;
}

export function normalizeFuel(raw, extension = true) {
  const id = cleanSpec(raw?.id);
  const ticks = nonnegativeInt(raw?.ticks, 0);
  const returns = optional(raw?.returns, cleanId);
  if (!id || ticks < 20 || returns === undefined) return undefined;
  return Object.freeze({ id, ticks, returns, extension });
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
const builtin = {};
const extension = {};
for (const kind of RECIPE_KINDS) {
  extension[kind] = new Map();
  builtin[kind] = (BUILTIN_RECIPES[kind] ?? []).map(r => {
    const n = normalizeRecipe(kind, r, false);
    if (!n) throw new Error(`[Kaleidoscope Baking] Built-in ${kind} recipe failed validation: ${r?.id}`);
    return n;
  });
}
const builtinFuels = BUILTIN_FUELS.map(f => {
  const n = normalizeFuel(f, false);
  if (!n) throw new Error(`[Kaleidoscope Baking] Built-in fuel failed validation: ${f?.id}`);
  return n;
});
const extensionFuels = new Map();
// Bumped on every change so runtime caches (guidebook, lookups) know when to rebuild.
let revision = 0;
export function registryRevision() { return revision; }

export function all(kind) {
  return builtin[kind] ? [...builtin[kind], ...orderedValues(extension[kind])] : [];
}

/** payload: {api:1, kind, source, recipe} */
export function registerRecipe(payload) {
  if (!payload || Number(payload.api) !== KB_API_VERSION) return { ok: false, reason: "api_version" };
  const kind = String(payload.kind ?? "");
  if (!NORMALIZE[kind]) return { ok: false, reason: "kind" };
  const recipe = normalizeRecipe(kind, payload.recipe);
  if (!recipe) return { ok: false, reason: "schema" };
  const source = sourceName(payload.source);
  extension[kind].set(`${kind}|${source}|${recipe.id}`, recipe);
  revision++;
  return { ok: true, kind, source, id: recipe.id };
}

/** payload: {api:1, source, fuel:{id, ticks, returns?}} */
export function registerFuel(payload) {
  if (!payload || Number(payload.api) !== KB_API_VERSION) return { ok: false, reason: "api_version" };
  const fuel = normalizeFuel(payload.fuel ?? payload);
  if (!fuel) return { ok: false, reason: "schema" };
  extensionFuels.set(`${sourceName(payload.source)}|${fuel.id}`, fuel);
  revision++;
  return { ok: true, id: fuel.id, ticks: fuel.ticks };
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------
export function getRecipeById(kind, id) { return all(kind).find(r => r.id === id); }
const byInput = (kind, itemId) => (itemId ? all(kind).find(r => matchesSpec(itemId, r.input)) : undefined);

export const getOvenRecipe = itemId => byInput("oven", itemId);
export const getOvenRecipeById = id => getRecipeById("oven", id);
export const getProofingRecipe = itemId => byInput("proofing", itemId);
export const getPourOverRecipe = itemId => byInput("pour_over", itemId);

/** Any espresso recipe for this coffee (ignoring additive)? */
export const isEspressoInput = itemId => !!byInput("espresso", itemId);
export function isEspressoAdditive(itemId) {
  return !!itemId && all("espresso").some(r => r.additive && matchesSpec(itemId, r.additive));
}
export function getEspressoRecipe(inputId, additiveId = "") {
  return all("espresso").find(r =>
    matchesSpec(inputId, r.input) && (additiveId ? (r.additive && matchesSpec(additiveId, r.additive)) : !r.additive));
}

/** Mixing: contents must match exactly; `toolId` must satisfy the recipe's tool spec. */
export function getMixingRecipe(contents, toolId) {
  if (!Array.isArray(contents) || !contents.length) return undefined;
  return all("mixing_bowl").find(r =>
    (toolId === undefined || matchesSpec(toolId, r.tool)) && matchShapeless(contents, r.slots));
}
export function isMixingIngredient(itemId) {
  return !!itemId && all("mixing_bowl").some(r => r.slots.some(s => matchesSlot(itemId, s)));
}

export function getShakerRecipe(contents) {
  if (!Array.isArray(contents) || !contents.length) return undefined;
  return all("shaker").find(r => matchShapeless(contents, r.slots));
}
export function isShakerIngredient(itemId) {
  return !!itemId && all("shaker").some(r => r.slots.some(s => matchesSlot(itemId, s)));
}

/** Decorating: recipes whose base matches and whose first layers match `layers` so far. */
export function decoratingCandidates(baseId, layers) {
  return all("decorating").filter(r =>
    matchesSpec(baseId, r.base) && layers.length <= r.layers.length &&
    layers.every((id, i) => matchesSlot(id, r.layers[i])));
}
export const isDecoratingBase = itemId => !!itemId && all("decorating").some(r => matchesSpec(itemId, r.base));

function allFuels() {
  // Exact ids before tags so a specific registration beats a broad tag.
  const list = [...builtinFuels, ...orderedValues(extensionFuels)];
  return [...list.filter(f => !f.id.startsWith("#")), ...list.filter(f => f.id.startsWith("#"))];
}
export function getFuel(itemId) {
  return itemId ? allFuels().find(f => matchesSpec(itemId, f.id)) : undefined;
}

/** Read-only snapshot for the guidebook / debugging. */
export function listRecipes() {
  const out = { fuels: allFuels() };
  for (const kind of RECIPE_KINDS) out[kind] = all(kind);
  return out;
}

export function _resetRegistryForTests() {
  for (const kind of RECIPE_KINDS) extension[kind].clear();
  extensionFuels.clear();
  revision++;
}
