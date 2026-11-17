import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { cleanId, cleanSpec, sourceName } from "../BP/scripts/utils/ids.js";
import {
  registerIngredient, hasIngredientTag, matchesSpec, setItemTagResolver, _resetIngredientsForTests
} from "../BP/scripts/api/ingredients.js";
import { matchShapeless } from "../BP/scripts/api/matcher.js";
import {
  registerRecipe, registerFuel, getOvenRecipe, getMixingRecipe, isMixingIngredient, getFuel,
  _resetRegistryForTests
} from "../BP/scripts/api/registry.js";
import {
  emptyOvenState, normalizeOvenState, tickOven, phaseOf, slotYield, isLit
} from "../BP/scripts/api/ovenLogic.js";
import { emptyBowl, addToBowl, whiskBowl, takeFromBowl } from "../BP/scripts/api/mixingLogic.js";
import {
  partIndex, partOffset, CONTROLLER_PART, ALL_PARTS, controllerFrom, footprint, doorPart,
  fireboxPart, facingToward
} from "../BP/scripts/utils/ovenGeometry.js";
import { getOvenRecipeById } from "../BP/scripts/api/registry.js";

beforeEach(() => {
  _resetIngredientsForTests();
  _resetRegistryForTests();
});

test("ids: namespaced ids and tag specs are validated", () => {
  assert.equal(cleanId("minecraft:egg"), "minecraft:egg");
  assert.equal(cleanId("egg"), "");
  assert.equal(cleanId("Minecraft:Egg"), "");
  assert.equal(cleanSpec("#kaleidoscope:egg"), "#kaleidoscope:egg");
  assert.equal(cleanSpec("#egg"), "");
  assert.equal(sourceName("my addon!"), "my_addon_");
});

test("ingredients: built-in aliases, runtime registration, item-json resolver", () => {
  assert.ok(hasIngredientTag("minecraft:egg", "kaleidoscope:egg"));
  assert.ok(hasIngredientTag("kaleidoscope_cookery:flour", "kaleidoscope:flour"));
  assert.ok(!hasIngredientTag("minecraft:dirt", "kaleidoscope:egg"));

  assert.deepEqual(registerIngredient({ api: 1, source: "fish", id: "fish:tuna", tags: ["#kaleidoscope:fish"] }).ok, true);
  assert.ok(matchesSpec("fish:tuna", "#kaleidoscope:fish"));
  assert.equal(registerIngredient({ api: 2, id: "a:b", tags: ["x:y"] }).reason, "api_version");
  assert.equal(registerIngredient({ api: 1, id: "a:b", tags: [] }).reason, "schema");

  setItemTagResolver((id, tag) => id === "herb:mint" && tag === "kaleidoscope:herb");
  assert.ok(matchesSpec("herb:mint", "#kaleidoscope:herb"));
  setItemTagResolver(() => { throw new Error("boom"); });
  assert.ok(!matchesSpec("herb:mint", "#kaleidoscope:herb"), "resolver errors are swallowed");
});

test("matcher: backtracking avoids greedy mis-assignment", () => {
  // slot A accepts egg OR milk, slot B accepts only egg. Greedy A<-egg would fail.
  const slots = [["minecraft:egg", "minecraft:milk_bucket"], ["minecraft:egg"]];
  assert.ok(matchShapeless(["minecraft:egg", "minecraft:milk_bucket"], slots));
  assert.ok(!matchShapeless(["minecraft:milk_bucket", "minecraft:milk_bucket"], slots));
  assert.ok(!matchShapeless(["minecraft:egg"], slots), "count must match exactly");
});

test("registry: built-in mixing recipes match via tags", () => {
  const batter = getMixingRecipe(["minecraft:milk_bucket", "kaleidoscope_cookery:flour", "minecraft:sugar", "minecraft:blue_egg"]);
  assert.equal(batter?.result, "kaleidoscope_baking:cake_batter");
  assert.ok(isMixingIngredient("minecraft:honey_bottle"));
  assert.ok(!isMixingIngredient("minecraft:dirt"));
});

test("registry: extension recipes are idempotent and validated", () => {
  const r = { api: 1, kind: "oven", source: "x", recipe: { id: "x:oven/a", input: "x:dough", result: "x:bread", time: 100 } };
  assert.ok(registerRecipe(r).ok);
  assert.ok(registerRecipe(r).ok);
  assert.equal(getOvenRecipe("x:dough")?.result, "x:bread");
  assert.equal(registerRecipe({ ...r, kind: "nope" }).reason, "kind");
  assert.equal(registerRecipe({ ...r, recipe: { ...r.recipe, mold: "bad mold" } }).reason, "schema");
  assert.equal(registerRecipe({ api: 1, kind: "mixing_bowl", recipe: { id: "x:m", result: "x:r", ingredients: new Array(10).fill("x:a") } }).reason, "schema");
});

test("registry: built-in oven recipe wins over extension for the same input", () => {
  registerRecipe({ api: 1, kind: "oven", source: "x", recipe: { id: "x:o", input: "kaleidoscope_baking:cake_batter", result: "x:other" } });
  assert.equal(getOvenRecipe("kaleidoscope_baking:cake_batter").result, "kaleidoscope_baking:sponge_cake");
});

test("registry: fuels by id, by tag, and exact beats tag", () => {
  assert.equal(getFuel("minecraft:coal").ticks, 1600);
  setItemTagResolver((id, tag) => id === "minecraft:oak_log" && tag === "minecraft:logs");
  assert.equal(getFuel("minecraft:oak_log").ticks, 300);
  registerFuel({ api: 1, source: "x", fuel: { id: "minecraft:oak_log", ticks: 999 } });
  assert.equal(getFuel("minecraft:oak_log").ticks, 999);
  assert.equal(getFuel("minecraft:lava_bucket").returns, "minecraft:bucket");
  assert.equal(registerFuel({ api: 1, fuel: { id: "x:y", ticks: 5 } }).reason, "schema");
});

test("oven: bake -> perfect -> burnt, fuel only burns while active", () => {
  const recipe = getOvenRecipe("kaleidoscope_baking:cake_batter");
  const lookup = id => getOvenRecipeById(id);
  const s = emptyOvenState("south");
  s.slots[0] = { recipe: recipe.id, input: recipe.input, mold: "kaleidoscope_baking:cake_mold", progress: 0 };

  assert.equal(tickOven(s, 20, lookup).changed, false, "no fuel -> no progress");
  s.fuel = 10000;
  assert.ok(isLit(s, lookup));
  for (let t = 0; t < recipe.time; t += 20) tickOven(s, 20, lookup);
  assert.equal(phaseOf(s.slots[0], recipe), "perfect");
  assert.deepEqual(slotYield(s.slots[0], recipe), [
    { id: "kaleidoscope_baking:sponge_cake", count: 1 },
    { id: "kaleidoscope_baking:cake_mold", count: 1 }
  ]);
  for (let t = 0; t < recipe.perfectWindow; t += 20) tickOven(s, 20, lookup);
  assert.equal(phaseOf(s.slots[0], recipe), "burnt");
  const fuelAtBurn = s.fuel;
  tickOven(s, 20, lookup);
  assert.equal(s.fuel, fuelAtBurn, "burnt slot does not keep burning fuel");
  assert.ok(!isLit(s, lookup));
  assert.equal(slotYield(s.slots[0], recipe)[0].id, "kaleidoscope_baking:burnt_food");
});

test("oven: aborted slot returns raw input; bad records normalize safely", () => {
  const recipe = getOvenRecipe("minecraft:potato");
  assert.deepEqual(slotYield({ recipe: recipe.id, input: "minecraft:potato", mold: "", progress: 5 }, recipe), [
    { id: "minecraft:potato", count: 1 }
  ]);
  const n = normalizeOvenState({ fuel: "abc", slots: [{ recipe: 3 }, { recipe: "a:b", input: "a:c" }] });
  assert.equal(n.fuel, 0);
  assert.equal(n.slots[0], null);
  assert.equal(n.slots[1].input, "a:c");
  assert.equal(n.slots.length, 4);
});

test("mixing bowl: add, whisk to completion, spilled liquids never return", () => {
  setItemTagResolver((id, tag) =>
    (id === "kaleidoscope_baking:whisk" && tag === "kaleidoscope_baking:whisk") ||
    (id === "kaleidoscope_baking:milk_frother" && tag === "kaleidoscope_baking:frother"));
  const b = emptyBowl();
  assert.equal(addToBowl(b, "minecraft:dirt").reason, "not_ingredient");
  assert.ok(addToBowl(b, "minecraft:milk_bucket", true).ok);
  let r;
  for (let i = 0; i < 7; i++) r = whiskBowl(b, "kaleidoscope_baking:whisk");
  assert.equal(r.result, "progress");
  r = whiskBowl(b, "kaleidoscope_baking:whisk");
  assert.equal(r.result, "done");
  assert.equal(r.recipe.result, "kaleidoscope_baking:butter");
  assert.equal(b.items.length, 0);

  // same milk + frother = frothed milk (tool decides the recipe)
  addToBowl(b, "minecraft:milk_bucket", true);
  for (let i = 0; i < 4; i++) r = whiskBowl(b, "kaleidoscope_baking:milk_frother");
  assert.equal(r.recipe.result, "kaleidoscope_baking:frothed_milk");

  addToBowl(b, "minecraft:milk_bucket", true);
  addToBowl(b, "minecraft:egg");
  assert.deepEqual(takeFromBowl(b, true), ["minecraft:egg"]);
});

test("oven geometry: 27 unique parts, controller round-trips, door/firebox on the front", () => {
  assert.equal(CONTROLLER_PART, 4);
  assert.equal(ALL_PARTS[0], CONTROLLER_PART);
  assert.equal(new Set(ALL_PARTS).size, 27);
  for (const i of ALL_PARTS) {
    const o = partOffset(i);
    assert.equal(partIndex(o.dx, o.dy, o.dz), i);
    const c = { x: 10, y: 64, z: -5 };
    assert.deepEqual(controllerFrom({ x: c.x + o.dx, y: c.y + o.dy, z: c.z + o.dz }, i), c);
  }
  assert.equal(footprint({ x: 0, y: 0, z: 0 }).length, 27);
  assert.deepEqual(partOffset(doorPart("north")), { dx: 0, dy: 1, dz: -1 });
  assert.deepEqual(partOffset(fireboxPart("east")), { dx: 1, dy: 0, dz: 0 });
  assert.equal(facingToward(0.2, -3), "north");
  assert.equal(facingToward(-4, 1), "west");
});
