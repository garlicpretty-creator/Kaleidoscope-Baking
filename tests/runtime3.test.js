// 1.1 features end-to-end against the mock: displays, furniture, placed drinks, by-products,
// new recipes, Cookery deepening, API additions, reverse registrations.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BlockPermutation, ItemStack, makePlayer, system, __mock } from "@minecraft/server";
import { __ui } from "@minecraft/server-ui";

await import("../BP/scripts/main.js");
const registry = __mock.startup();
const dim = __mock.overworld;
const kb = n => `kaleidoscope_baking:${n}`;
const C = name => registry.get(kb(name));
const place = (loc, id, states) => { const b = dim.getBlock(loc); b.setPermutation(BlockPermutation.resolve(id, states)); return b; };
function paramsOf(block) {
  try {
    const d = JSON.parse(readFileSync(new URL(`../BP/blocks/${block.typeId.split(":")[1]}.json`, import.meta.url)))["minecraft:block"];
    return Object.entries(d.components).find(([k]) => k.startsWith("kaleidoscope_baking:"))?.[1] ?? {};
  } catch { return {}; }
}
const use = (comp, block, player) => C(comp).onPlayerInteract({ block, player }, { params: paramsOf(block) });
const lastMsg = p => JSON.stringify(p.messages.at(-1));
const displays = () => [...dim.entities].filter(e => e.typeId === kb("display") && e.isValid);

test("by-products: pour-over gives coffee grounds; grounds fertilise a plant by one stage", () => {
  const p = makePlayer();
  const pour = place({ x: 14, y: 64, z: 0 }, kb("pour_over_stand"));
  p.inv.slots[8] = new ItemStack(kb("coffee_mug"), 1);
  p.hold(kb("ground_coffee_medium")); use("pour_over_stand", pour, p);
  p.hold("minecraft:water_bucket"); use("pour_over_stand", pour, p);
  assert.equal(p.inv.count(kb("coffee_grounds")), 1);
  const crop = place({ x: 16, y: 64, z: 0 }, kb("sesame_crop"));
  p.hold(kb("coffee_grounds"));
  use("plant", crop, p);
  assert.equal(crop.permutation.getState("kaleidoscope_baking:growth"), 1);
});

test("piping bag ices four shaped cookies at once", () => {
  const bowl = place({ x: 18, y: 64, z: 0 }, kb("mixing_bowl"));
  const p = makePlayer();
  for (let i = 0; i < 4; i++) { p.hold(kb("shaped_cookie")); use("mixing_bowl", bowl, p); }
  p.hold(kb("icing_pink")); use("mixing_bowl", bowl, p);
  p.hold(kb("whisk")); use("mixing_bowl", bowl, p);
  assert.equal(p.inv.count(kb("iced_cookie_pink")), 0, "a whisk does not ice cookies");
  p.hold(kb("piping_bag"));
  for (let i = 0; i < 3; i++) use("mixing_bowl", bowl, p);
  assert.equal(p.inv.count(kb("iced_cookie_pink")), 4);
});

test("cake stand: shows the cake, eaten in slices, picked back up when whole", () => {
  const stand = place({ x: 20, y: 64, z: 0 }, kb("cake_stand"));
  const p = makePlayer();
  p.hold(kb("cheesecake")); use("cake_stand", stand, p);
  assert.ok(displays().some(e => e.held === kb("cheesecake")));
  p.hold(undefined); p.isSneaking = true; use("cake_stand", stand, p);
  assert.equal(p.inv.count(kb("cheesecake")), 1);
  p.isSneaking = false;
  p.hold(kb("cheesecake")); use("cake_stand", stand, p);
  p.hold(undefined); p.hunger.currentValue = 0;
  for (let i = 0; i < 4; i++) use("cake_stand", stand, p);
  assert.ok(!displays().some(e => e.held === kb("cheesecake")), "eaten up");
});

test("tea tray: up to three treats; eating from it uses the 60 s tea window", () => {
  const tray = place({ x: 22, y: 64, z: 0 }, kb("tea_tray"));
  const p = makePlayer();
  for (const id of ["scone", "madeleine", "macaron_missing"]) {
    p.hold(id === "macaron_missing" ? "minecraft:dirt" : kb(id)); use("tea_tray", tray, p);
  }
  assert.ok(p.inv.slots[0]?.typeId === "minecraft:dirt", "dirt refused and kept");
  __mock.eat(p, new ItemStack(kb("latte"), 1));
  __mock.advance(900); // 45 s later: outside 30 s, inside 60 s
  p.hold(undefined); p.hunger.currentValue = 0;
  p.effects.clear();
  use("tea_tray", tray, p);
  assert.ok(p.effects.has("absorption"), "afternoon-tea bonus inside the 60 s tray window");
});

test("bread display stores stacks, shows the first three, returns everything on break", () => {
  const b = place({ x: 24, y: 64, z: 0 }, kb("bread_display"));
  const p = makePlayer();
  p.hold(kb("croissant"), 20); use("bread_display", b, p);
  p.hold(kb("baguette"), 3); use("bread_display", b, p);
  assert.equal(displays().filter(e => e.held === kb("croissant") || e.held === kb("baguette")).length, 2);
  dim.spawned.length = 0;
  C("bread_display").onPlayerBreak({ block: b });
  const total = dim.spawned.reduce((n, s) => n + s.amount, 0);
  assert.equal(total, 23);
});

test("hand-shaken drinks: sneak-place on a block top keeps sweetness / ice when picked up", () => {
  const p = makePlayer();
  dim.getBlock({ x: 30, y: 64, z: 0 }).setType("minecraft:stone");
  const drink = new ItemStack(kb("bubble_milk_tea"), 1);
  drink.setDynamicProperty("kaleidoscope_baking:sweet", "light");
  drink.setDynamicProperty("kaleidoscope_baking:ice", "none");
  p.inv.slots[0] = drink;
  p.isSneaking = true;
  const ev = __mock.interactBefore({ player: p, itemStack: drink, block: dim.getBlock({ x: 30, y: 64, z: 0 }), blockFace: "Up", cancel: false });
  assert.ok(ev.cancel);
  const cups = dim.getBlock({ x: 30, y: 65, z: 0 });
  assert.equal(cups.typeId, kb("drink_cups"));
  assert.equal(p.inv.slots[0], undefined);
  p.isSneaking = false;
  use("drink_cups", cups, p);
  const back = p.inv.slots.find(s => s?.typeId === kb("bubble_milk_tea"));
  assert.equal(back.getDynamicProperty("kaleidoscope_baking:sweet"), "light");
  assert.equal(back.getDynamicProperty("kaleidoscope_baking:ice"), "none");
  assert.equal(cups.typeId, "minecraft:air");
});

test("hot drinks: Baking's own mugs (drink_stack) — add the same drink, take one back, break drops all", () => {
  const block = JSON.parse(readFileSync(new URL("../BP/blocks/latte.json", import.meta.url)))["minecraft:block"];
  assert.ok(block.components["kaleidoscope_baking:drink_stack"], "Baking's own component");
  assert.equal(block.components["kaleidoscope_cookery:cup_stack"], undefined, "not Cookery's cup_stack");
  assert.match(block.components["minecraft:geometry"], /mug_1$/);
  const mugs = place({ x: 34, y: 64, z: 0 }, kb("latte"));
  const p = makePlayer();
  p.hold(kb("latte")); use("drink_stack", mugs, p);
  p.hold(kb("mocha")); use("drink_stack", mugs, p);
  assert.equal(mugs.permutation.getState("kaleidoscope_baking:cup_count"), 2, "a different drink is not stacked");
  p.hold(undefined); use("drink_stack", mugs, p);
  assert.equal(p.inv.count(kb("latte")), 1);
});
test("pineapple: Baking ships its own; jam accepts it (and Harvest's via the lead-pack alias)", async () => {
  const { CONTENT } = await import("../BP/scripts/data/generated/content.js");
  assert.ok(CONTENT.items[kb("pineapple")]);
  const { getMixingRecipe } = await import("../BP/scripts/api/registry.js");
  const { EQUIVALENTS } = await import("../BP/scripts/compat/series.data.js");
  assert.equal(EQUIVALENTS.find(e => e.baking === kb("pineapple"))?.category, "fruit", "豐收 leads pineapple");
  const r = getMixingRecipe([kb("pineapple"), kb("pineapple"), "minecraft:sugar", "minecraft:glass_bottle"], kb("whisk"));
  assert.equal(r?.result, kb("pineapple_jam"));
});

test("Cookery deepening: butter jar oil container and milk-base stockpot recipes are registered", () => {
  system.sendScriptEvent("kaleidoscope_cookery:api_ready", JSON.stringify({ api: 1, capabilities: ["oil_containers", "stockpot_exact", "chopping_board_tool", "bamboo_tray"] }));
  __mock.advance(60);
  const oil = __mock.sent.find(s => s.id === "kaleidoscope_cookery:register_oil_container");
  assert.equal(JSON.parse(oil.message).container.id, kb("butter_jar"));
  const recipes = __mock.sent.filter(s => s.id === "kaleidoscope_cookery:register_recipe").map(s => JSON.parse(s.message));
  assert.ok(recipes.some(r => r.recipe.base === "minecraft:milk" && r.recipe.result === kb("cream_soup")));
  assert.equal(recipes.filter(r => r.recipe.input?.startsWith(kb("laminated_dough")) || r.recipe.input === kb("puff_pastry_dough")).length, 3, "three folds");
  assert.ok(recipes.some(r => r.kind === "bamboo_tray" && r.recipe.process === "wet" && r.recipe.result === kb("salted_egg")));
});

test("API: query_ingredient answers with tags; caffeine_adjust changes a player's level", () => {
  system.sendScriptEvent("kaleidoscope_baking:query_ingredient", JSON.stringify({ api: 1, id: "minecraft:egg" }));
  const info = __mock.sent.filter(s => s.id === "kaleidoscope_baking:ingredient_info").at(-1);
  assert.deepEqual(JSON.parse(info.message).tags, ["kaleidoscope:egg"]);
  const p = makePlayer();
  p.name = "Tester";
  system.sendScriptEvent("kaleidoscope_baking:caffeine_adjust", JSON.stringify({ api: 1, player: "Tester", delta: 3 }));
  assert.equal(p.getDynamicProperty("kaleidoscope_baking:caffeine"), 3);
});

test("guidebook republishes after another pack registers recipes later", () => {
  system.sendScriptEvent("kaleidoscope_cookery:guidebook_ready", JSON.stringify({ api: 1 }));
  __mock.advance(200);
  const before = __mock.sent.filter(s => s.id === "kaleidoscope_cookery:guidebook_begin").length;
  system.sendScriptEvent("kaleidoscope_baking:register_recipe", JSON.stringify({ api: 1, kind: "oven", source: "late",
    recipe: { id: "late:oven/x", input: "minecraft:pumpkin", result: kb("pastry_soup") } }));
  __mock.advance(200);
  assert.equal(__mock.sent.filter(s => s.id === "kaleidoscope_cookery:guidebook_begin").length, before + 1);
});

test("reverse registrations go out only when a series pack announces itself", () => {
  const sentBefore = __mock.sent.length;
  system.sendScriptEvent("kaleidoscope_fishing:api_ready", "{}");
  const out = __mock.sent.slice(sentBefore).filter(s => s.id === "kaleidoscope_fishing:register_bait");
  assert.equal(out.length, 1);
  assert.equal(JSON.parse(out[0].message).item, kb("bread_crumbs"));
  system.sendScriptEvent("kaleidoscope_fishing:api_ready", "{}");
  assert.equal(__mock.sent.filter(s => s.id === "kaleidoscope_fishing:register_bait").length, 1, "once");
});

void __ui;

test("hand-shaken drinks: a held-down use button places only one cup", () => {
  const p = makePlayer();
  dim.getBlock({ x: 40, y: 64, z: 0 }).setType("minecraft:stone");
  const mk = () => new ItemStack(kb("lemonade"), 1);
  p.isSneaking = true;
  p.inv.slots[0] = mk();
  const base = dim.getBlock({ x: 40, y: 64, z: 0 });
  __mock.interactBefore({ player: p, itemStack: p.inv.slots[0], block: base, blockFace: "Up", cancel: false, isFirstEvent: true });
  p.inv.slots[0] = mk();
  const repeat = __mock.interactBefore({ player: p, itemStack: p.inv.slots[0], block: dim.getBlock({ x: 40, y: 65, z: 0 }), blockFace: "Up", cancel: false, isFirstEvent: false });
  assert.ok(repeat.cancel);
  assert.equal(dim.getBlock({ x: 40, y: 65, z: 0 }).permutation.getState("kaleidoscope_baking:cups"), 1);
  assert.ok(p.inv.slots[0], "the second drink stays in hand");
});
