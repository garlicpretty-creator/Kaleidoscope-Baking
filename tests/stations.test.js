import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { setItemTagResolver, setIngredientAliases, matchesSpec, _resetIngredientsForTests } from "../BP/scripts/api/ingredients.js";
import { registerRecipe, getOvenRecipe, listRecipes, RECIPE_KINDS, _resetRegistryForTests } from "../BP/scripts/api/registry.js";
import { slotYield } from "../BP/scripts/api/ovenLogic.js";
import {
  emptyProofing, addProofing, tickProofing, proofingYield,
  emptyStand, addToStand, standRecipe, popStand, standNextOptions,
  emptyShaker, addToShaker, shake, takeFromShaker,
  emptyEspresso, loadEspressoCoffee, loadEspressoAdditive, tickEspresso, drinkCaffeine
} from "../BP/scripts/api/stationLogic.js";
import { getFoodEffect, registerFoodEffect, _resetEffectsForTests } from "../BP/scripts/api/effects.js";
import { bulkBegin, bulkChunk, bulkEnd, toChunks } from "../BP/scripts/api/chunks.js";
import { resolveEquivalents, leaderOf, mapGrowth } from "../BP/scripts/api/compat.js";
import { getRecipeById } from "../BP/scripts/api/registry.js";

const kb = n => `kaleidoscope_baking:${n}`;
const GROUND = new Set(["light", "medium", "dark"].map(r => kb(`ground_coffee_${r}`)));

beforeEach(() => {
  _resetIngredientsForTests(); _resetRegistryForTests(); _resetEffectsForTests();
  // Item-JSON tags that the real items declare
  setItemTagResolver((id, tag) =>
    (tag === "kaleidoscope:ground_coffee" && GROUND.has(id)) ||
    (tag === "kaleidoscope:cookie" && id === kb("butter_cookie")));
});

test("every built-in recipe kind loads and ids are unique per kind", () => {
  const all = listRecipes();
  for (const kind of RECIPE_KINDS) {
    assert.ok(all[kind].length > 0, `${kind} has recipes`);
    const ids = all[kind].map(r => r.id);
    assert.equal(new Set(ids).size, ids.length, `${kind} ids unique`);
  }
  const total = RECIPE_KINDS.reduce((n, k) => n + all[k].length, 0);
  assert.ok(total >= 100, `expected a full recipe set, got ${total}`);
});

test("proofing: rises faster when warm, yields proofed dough", () => {
  const s = emptyProofing();
  assert.equal(addProofing(s, "minecraft:dirt", 1).reason, "not_doughy");
  assert.equal(addProofing(s, kb("bread_dough"), 3).added, 3);
  assert.equal(addProofing(s, kb("croissant_dough"), 1).reason, "different");
  const r = getRecipeById("proofing", s.recipe);
  let done = false, ticks = 0;
  while (!done) { done = tickProofing(s, 20, 2, r); ticks += 20; }
  assert.equal(ticks, r.time / 2);
  assert.deepEqual(proofingYield(s, r), [{ id: kb("proofed_bread_dough"), count: 3 }]);
});

test("decorating: layered cake, prefix recipe needs an explicit finish, undo returns items", () => {
  const s = emptyStand();
  assert.equal(addToStand(s, kb("whipped_cream")).reason, "not_base");
  assert.ok(addToStand(s, kb("sponge_cake")).ok);
  assert.deepEqual(standNextOptions(s), [kb("whipped_cream")]);
  assert.equal(addToStand(s, kb("strawberry")).reason, "wrong_layer");
  assert.ok(addToStand(s, kb("whipped_cream")).ok);
  const r = addToStand(s, kb("strawberry"));
  assert.ok(r.ok && !r.complete, "strawberry cream cake is a prefix of birthday cake");
  assert.equal(standRecipe(s).result, kb("strawberry_cream_cake"));
  const b = addToStand(s, kb("birthday_candle"));
  assert.equal(b.complete.result, kb("birthday_cake"));

  const t = emptyStand();
  addToStand(t, kb("tart_shell")); addToStand(t, kb("custard"));
  assert.equal(addToStand(t, kb("lemon_slice")).complete.result, kb("lemon_tart"));
  const u = emptyStand();
  addToStand(u, kb("tart_shell")); addToStand(u, kb("custard"));
  assert.equal(popStand(u), kb("custard"));
  assert.equal(popStand(u), kb("tart_shell"));
  assert.equal(popStand(u), undefined);
});

test("shaker: bubble milk tea; spilled liquids are not returned", () => {
  const s = emptyShaker();
  assert.ok(addToShaker(s, kb("black_tea_base"), true).ok);
  assert.ok(addToShaker(s, "minecraft:milk_bucket", true).ok);
  assert.ok(addToShaker(s, kb("tapioca_pearls")).ok);
  let r;
  for (let i = 0; i < 5; i++) r = shake(s);
  assert.equal(r.result, "done");
  assert.equal(r.recipe.result, kb("bubble_milk_tea"));
  assert.equal(r.recipe.carrier, kb("takeaway_cup"));
  assert.ok(r.recipe.sweetness && r.recipe.ice);

  addToShaker(s, "minecraft:milk_bucket", true);
  addToShaker(s, kb("tapioca_pearls"));
  assert.deepEqual(takeFromShaker(s), [kb("tapioca_pearls")]);
  const hot = getRecipeById("shaker", kb("shaker/hot_cocoa"));
  assert.equal(hot.ice, false, "hot drinks have no ice option");
});

test("espresso: needs power and water; additive decides the drink; power speeds it up", () => {
  const s = emptyEspresso();
  assert.equal(loadEspressoCoffee(s, "minecraft:dirt").reason, "not_coffee");
  assert.ok(loadEspressoCoffee(s, kb("ground_coffee_dark")).ok);
  assert.ok(loadEspressoAdditive(s, kb("frothed_milk")).ok);
  assert.equal(tickEspresso(s, 20, 0).state, "no_power");
  assert.equal(tickEspresso(s, 20, 15).state, "no_water");
  s.water = 4;
  let st, n = 0;
  do { st = tickEspresso(s, 20, 15); n++; } while (st.state === "brewing");
  assert.equal(st.state, "done");
  assert.equal(s.ready, kb("latte"));
  assert.equal(s.water, 3);
  assert.ok(n * 20 < 120, "signal 15 brews faster than the base 120 ticks");
  assert.equal(loadEspressoCoffee(s, kb("ground_coffee_dark")).reason, "take_first");
});

test("coffee roasting: early/middle/late in the window give light/medium/dark", () => {
  const r = getOvenRecipe(kb("green_coffee_beans"));
  const at = p => slotYield({ recipe: r.id, input: r.input, mold: "", progress: p }, r)[0].id;
  assert.equal(at(r.time + 10), kb("roasted_coffee_beans_light"));
  assert.equal(at(r.time + r.perfectWindow / 2), kb("roasted_coffee_beans_medium"));
  assert.equal(at(r.time + r.perfectWindow - 1), kb("roasted_coffee_beans_dark"));
  assert.equal(at(r.time + r.perfectWindow), kb("burnt_food"));
});

test("caffeine: palpitations at 3, severe at 5, positives stop once palpitating; calm drinks reduce", () => {
  let c = drinkCaffeine(0, 2);
  assert.deepEqual(c, { level: 2, positive: true, stage: 0 });
  c = drinkCaffeine(c.level, 1);
  assert.equal(c.stage, 1);
  c = drinkCaffeine(c.level, 2);
  assert.deepEqual(c, { level: 5, positive: false, stage: 2 });
  assert.equal(drinkCaffeine(5, 0, 1).level, 4);
  assert.equal(drinkCaffeine(0, 0, 3).level, 0);
});

test("food effects: built-ins, extension registration, validation", () => {
  assert.equal(getFoodEffect(kb("espresso")).caffeine, 2);
  assert.equal(getFoodEffect("kaleidoscope_cookery:oolong").reduces, 1);
  assert.ok(registerFoodEffect({ api: 1, source: "x", id: "x:tea", category: "drink", reduces: 1, effects: [["speed", 10, 0]] }).ok);
  assert.deepEqual(getFoodEffect("x:tea").effects, [["speed", 10, 0]]);
  assert.equal(registerFoodEffect({ api: 1, id: "x:bad", effects: [["Not Valid", 1, 0]] }).reason, "schema");
});

test("bulk chunks: round trip and missing-chunk rejection", () => {
  const data = { api: 1, registrations: Array.from({ length: 40 }, (_, i) => ({ event: "e", payload: { i, pad: "x".repeat(50) } })) };
  const chunks = toChunks(data, 300);
  assert.ok(chunks.length > 1);
  assert.ok(bulkBegin({ api: 1, source: "s", id: "d", chunks: chunks.length }).ok);
  chunks.forEach((c, i) => assert.ok(bulkChunk(`s\nd\n${i}\n${c}`).ok));
  assert.deepEqual(bulkEnd({ source: "s", id: "d" }).data, data);
  bulkBegin({ api: 1, source: "s", id: "d", chunks: 2 });
  bulkChunk(`s\nd\n0\n{}`);
  assert.equal(bulkEnd({ source: "s", id: "d" }).reason, "missing_chunks");
});

test("series compat: lead pack per category, aliases make recipes accept the other pack's item", () => {
  assert.equal(leaderOf("herb"), "herbal");
  assert.equal(leaderOf("fruit"), "harvest");
  assert.equal(leaderOf("material"), "ranch");
  const existing = new Set(["kaleidoscope_harvest:strawberry", "kaleidoscope_harvest:strawberry_bush", "kaleidoscope_ranch:butter"]);
  const res = resolveEquivalents(id => existing.has(id));
  assert.equal(res.items.get(kb("strawberry")), "kaleidoscope_harvest:strawberry");
  assert.equal(res.items.get(kb("butter")), "kaleidoscope_ranch:butter");
  assert.ok(!res.items.has(kb("mint_leaves")), "absent pack = no mapping");
  assert.equal(res.blocks.get(kb("strawberry_bush")).primary, "kaleidoscope_harvest:strawberry_bush");

  setIngredientAliases(res.aliases);
  assert.ok(matchesSpec("kaleidoscope_harvest:strawberry", kb("strawberry")));
  setItemTagResolver((id, tag) => id === kb("butter") && tag === "kaleidoscope:butter");
  assert.ok(matchesSpec("kaleidoscope_ranch:butter", "#kaleidoscope:butter"), "alias inherits Baking's tags");
  assert.equal(mapGrowth(3, 3, 7), 7);
  assert.equal(mapGrowth(1, 3, 7), 2);
});

test("extension kinds validate their own schema", () => {
  assert.ok(registerRecipe({ api: 1, kind: "shaker", source: "x", recipe: { id: "x:s", result: "x:d", ingredients: ["x:a"] } }).ok);
  assert.equal(registerRecipe({ api: 1, kind: "shaker", recipe: { id: "x:s", result: "x:d", ingredients: new Array(7).fill("x:a") } }).reason, "schema");
  assert.equal(registerRecipe({ api: 1, kind: "oven", recipe: { id: "x:o", input: "x:i", result: "x:r", roast: ["x:a"] } }).reason, "schema");
  assert.ok(registerRecipe({ api: 1, kind: "espresso", recipe: { id: "x:e", input: "x:c", result: "x:r" } }).ok);
  assert.ok(registerRecipe({ api: 1, kind: "decorating", recipe: { id: "x:d", base: "x:b", layers: ["#x:t"], result: "x:r" } }).ok);
});
