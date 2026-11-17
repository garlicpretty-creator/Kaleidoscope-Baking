// ## Kaleidoscope script role: Public extension/API contract (pure).
// Food / drink consumption effects registry (`kaleidoscope_baking:register_food_effect`).
import { cleanId, orderedValues, sourceName } from "../utils/ids.js";
import { BUILTIN_FOOD_EFFECTS } from "../data/effects.js";

const EFFECT_RE = /^[a-z_]+$/;
const CATEGORIES = new Set(["dessert", "drink", "food"]);

export function normalizeFoodEffect(raw) {
  const category = CATEGORIES.has(raw?.category) ? raw.category : "food";
  const int = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  const effects = [];
  for (const e of Array.isArray(raw?.effects) ? raw.effects.slice(0, 8) : []) {
    const [name, seconds, amp] = Array.isArray(e) ? e : [e?.effect, e?.seconds, e?.amplifier];
    if (!EFFECT_RE.test(String(name ?? ""))) return undefined;
    effects.push(Object.freeze([String(name), Math.max(1, int(seconds, 3600)), int(amp, 4)]));
  }
  const clear = (Array.isArray(raw?.clear) ? raw.clear : []).map(String).filter(x => EFFECT_RE.test(x)).slice(0, 8);
  return Object.freeze({
    category, caffeine: int(raw?.caffeine, 5), reduces: int(raw?.reduces, 5),
    effects: Object.freeze(effects), clear: Object.freeze(clear)
  });
}

const builtin = new Map();
for (const [id, raw] of Object.entries(BUILTIN_FOOD_EFFECTS)) {
  const n = normalizeFoodEffect(raw);
  if (!n) throw new Error(`[Kaleidoscope Baking] Built-in food effect failed validation: ${id}`);
  builtin.set(id, n);
}
const extension = new Map();

/** payload: {api:1, source, id, category, caffeine?, reduces?, effects?:[[effect, seconds, amp]], clear?} */
export function registerFoodEffect(payload) {
  if (!payload || Number(payload.api) !== 1) return { ok: false, reason: "api_version" };
  const id = cleanId(payload.id);
  const effect = id && normalizeFoodEffect(payload);
  if (!effect) return { ok: false, reason: "schema" };
  extension.set(`${sourceName(payload.source)}|${id}`, { id, effect });
  return { ok: true, id };
}

/** Built-in data wins; among extensions, the last by registration key wins. */
export function getFoodEffect(id) {
  if (builtin.has(id)) return builtin.get(id);
  let found;
  for (const r of orderedValues(extension)) if (r.id === id) found = r.effect;
  return found;
}

export function _resetEffectsForTests() { extension.clear(); }
