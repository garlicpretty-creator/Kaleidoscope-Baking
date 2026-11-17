// Prints every item id referenced by built-in Baking data (recipes, fuels, effects,
// Cookery registrations) as JSON. Used by tools/validate.py.
import { listRecipes } from "../BP/scripts/api/registry.js";
import { BUILTIN_FOOD_EFFECTS } from "../BP/scripts/data/effects.js";
import { CONTAINER_RETURNS } from "../BP/scripts/data/ingredientTags.js";
import { COOKERY_REGISTRATIONS } from "../BP/scripts/integrations/cookeryData.js";

const refs = new Set();
const add = v => { if (typeof v === "string" && v && !v.startsWith("#")) refs.add(v); };
const walk = v => {
  if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (k !== "id" || typeof x !== "string" || !x.includes("/")) walk(x); }
  else if (typeof v === "string" && /^[a-z0-9_]+:[a-z0-9_]+$/.test(v)) add(v);
};
walk(listRecipes());
Object.keys(BUILTIN_FOOD_EFFECTS).forEach(add);
Object.entries(CONTAINER_RETURNS).forEach(([a, b]) => { add(a); add(b); });
walk(COOKERY_REGISTRATIONS);
console.log(JSON.stringify([...refs].sort()));
