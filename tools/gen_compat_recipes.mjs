// Generates 1:1 crafting-table swap recipes (Baking item <-> lead pack item) for every
// EQUIVALENTS entry marked `confirmed: true` in BP/scripts/compat/series.data.js.
// Unconfirmed (placeholder) ids get no recipe, because a recipe naming an unknown item is a
// content error in Bedrock.   Run: node tools/gen_compat_recipes.mjs
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EQUIVALENTS } from "../BP/scripts/compat/series.data.js";

const dir = fileURLToPath(new URL("../BP/recipes/compat/", import.meta.url));
mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) rmSync(dir + f);
let n = 0;
const recipe = (id, from, to) => ({
  format_version: "1.20.10",
  "minecraft:recipe_shapeless": {
    description: { identifier: id }, tags: ["crafting_table"],
    ingredients: [{ item: from }], result: { item: to, count: 1 }, unlock: [{ item: from }]
  }
});
for (const e of EQUIVALENTS) {
  if (!e.confirmed) continue;
  const primary = e.primary[0];
  const short = e.baking.split(":")[1];
  writeFileSync(`${dir}${short}_to_lead.json`, JSON.stringify(recipe(`kaleidoscope_baking:compat/${short}_to_lead`, e.baking, primary), null, 2) + "\n");
  writeFileSync(`${dir}${short}_from_lead.json`, JSON.stringify(recipe(`kaleidoscope_baking:compat/${short}_from_lead`, primary, e.baking), null, 2) + "\n");
  n += 2;
}
console.log(`compat swap recipes: ${n} (from ${EQUIVALENTS.filter(e => e.confirmed).length} confirmed equivalents)`);
