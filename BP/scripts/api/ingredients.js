// ## Kaleidoscope script role: Public extension/API contract (pure; no @minecraft imports).
// ============================================================================
// Kaleidoscope ingredient tags
// ----------------------------------------------------------------------------
// Recipes refer to ingredients either by exact id ("minecraft:egg") or by a shared
// series tag ("#kaleidoscope:egg"). An item satisfies a tag when EITHER:
//   1) its own item JSON declares the tag in minecraft:tags (preferred, zero code), or
//   2) some pack registered it at runtime (needed for vanilla items and for items from
//      packs that cannot carry the tag, e.g. Cookery's own flour).
// Item-JSON tags are looked up through an injected resolver so this module stays pure;
// the runtime installs a resolver backed by ItemStack#hasTag in api/runtimeTags.js.
// ============================================================================
import { cleanId, isTagSpec, orderedValues, sourceName } from "../utils/ids.js";
import { BUILTIN_INGREDIENT_TAGS } from "../data/ingredientTags.js";

const TAG_NAME_RE = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;

// key: `${source}|${id}` -> {id, tags:Set}
const registrations = new Map();
// Rebuilt lazily: id -> Set(tags)
let byId = null;

let itemTagResolver = () => false;
// Series compat: another pack's item that stands in for a Baking item
// (e.g. Herbal's mint for Baking's mint). primaryId -> bakingId
const aliases = new Map();

/** Install the active equivalents (compat layer). Replaces previous aliases. */
export function setIngredientAliases(map) {
  aliases.clear();
  for (const [primary, baking] of map instanceof Map ? map : Object.entries(map ?? {})) aliases.set(primary, baking);
}

/** Runtime installs the real resolver (ItemStack#hasTag). Tests may install a fake. */
export function setItemTagResolver(fn) {
  itemTagResolver = typeof fn === "function" ? fn : () => false;
}

function rebuild() {
  byId = new Map();
  const add = (id, tags) => {
    let set = byId.get(id);
    if (!set) byId.set(id, (set = new Set()));
    for (const t of tags) set.add(t);
  };
  for (const [id, tags] of Object.entries(BUILTIN_INGREDIENT_TAGS)) add(id, tags);
  for (const r of orderedValues(registrations)) add(r.id, r.tags);
}

/**
 * Register runtime tags for an item.
 * payload: {api:1, source:"my_addon", id:"minecraft:cod", tags:["kaleidoscope:fish"]}
 */
export function registerIngredient(payload) {
  if (!payload || Number(payload.api) !== 1) return { ok: false, reason: "api_version" };
  const id = cleanId(payload.id);
  const tags = (Array.isArray(payload.tags) ? payload.tags : [])
    .map(t => String(t ?? "").trim().replace(/^#/, ""))
    .filter(t => TAG_NAME_RE.test(t))
    .slice(0, 32);
  if (!id || !tags.length) return { ok: false, reason: "schema" };
  const source = sourceName(payload.source);
  registrations.set(`${source}|${id}`, Object.freeze({ id, tags: Object.freeze([...new Set(tags)]) }));
  byId = null;
  return { ok: true, id, tags };
}

/** Runtime-registered + built-in tags for an id (does not include item-JSON tags). */
export function registeredTagsFor(id) {
  if (!byId) rebuild();
  return [...(byId.get(id) ?? [])];
}

function hasOwnTag(id, tag) {
  if (byId.get(id)?.has(tag)) return true;
  try { return !!itemTagResolver(id, tag); } catch { return false; }
}

export function hasIngredientTag(id, tag) {
  if (!id || !tag) return false;
  if (!byId) rebuild();
  if (hasOwnTag(id, tag)) return true;
  const alias = aliases.get(id);
  return !!alias && hasOwnTag(alias, tag);
}

/** Does item `id` satisfy one ingredient spec ("ns:id" or "#ns:tag")? */
export function matchesSpec(id, spec) {
  if (!id || !spec) return false;
  if (isTagSpec(spec)) return hasIngredientTag(id, spec.slice(1));
  return id === spec || aliases.get(id) === spec;
}

/** A slot is a list of alternative specs; any one match satisfies it. */
export function matchesSlot(id, slot) {
  for (const spec of slot) if (matchesSpec(id, spec)) return true;
  return false;
}

/** Test helper: forget runtime registrations. */
export function _resetIngredientsForTests() {
  registrations.clear();
  aliases.clear();
  byId = null;
  itemTagResolver = () => false;
}
