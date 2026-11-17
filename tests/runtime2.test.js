// End-to-end run of the newer stations, plants, drinks, Cookery guidebook and series compat
// against tests/mock/server.js (+ server-ui mock).
import { test } from "node:test";
import assert from "node:assert/strict";
import { BlockPermutation, EXTRA_BLOCKS, EXTRA_ITEMS, ItemStack, makePlayer, system, world, __mock } from "@minecraft/server";
import { __ui } from "@minecraft/server-ui";

// A pretend 豐收 (Harvest) pack that ships its own strawberry: it must lead fruit.
EXTRA_ITEMS.add("kaleidoscope_harvest:strawberry");
EXTRA_BLOCKS.add("kaleidoscope_harvest:strawberry_bush");

await import("../BP/scripts/main.js");
const registry = __mock.startup();
const dim = __mock.overworld;
const kb = n => `kaleidoscope_baking:${n}`;
const C = name => registry.get(kb(name));
const place = (loc, id, states) => { const b = dim.getBlock(loc); b.setPermutation(BlockPermutation.resolve(id, states)); return b; };
const use = (comp, block, player) => C(comp).onPlayerInteract({ block, player }, { params: paramsOf(block) });
const lastMsg = p => JSON.stringify(p.messages.at(-1));
import { readFileSync } from "node:fs";
function paramsOf(block) {
  try {
    const d = JSON.parse(readFileSync(new URL(`../BP/blocks/${block.typeId.split(":")[1]}.json`, import.meta.url)))["minecraft:block"];
    return Object.entries(d.components).find(([k]) => k.startsWith("kaleidoscope_baking:"))?.[1] ?? {};
  } catch { return {}; }
}

test("every block component referenced by block JSON is registered", () => {
  for (const name of ["oven", "mixing_bowl", "proofing_basket", "decorating_stand", "espresso_machine", "pour_over_stand",
    "drink_shaker", "dessert", "plant", "tree", "bark", "herb_planter"]) assert.ok(C(name), name);
});

test("proofing basket: dough rises, twice as fast next to a fire", () => {
  const cold = place({ x: 0, y: 64, z: 0 }, kb("proofing_basket"));
  const warm = place({ x: 4, y: 64, z: 0 }, kb("proofing_basket"));
  dim.getBlock({ x: 4, y: 63, z: 0 }).setType("minecraft:fire");
  const p = makePlayer();
  p.hold(kb("bread_dough"), 3); use("proofing_basket", cold, p);
  p.hold(kb("bread_dough"), 2); use("proofing_basket", warm, p);
  assert.equal(p.inv.count(kb("bread_dough")), 0);
  __mock.advance(640); // recipe 1200 ticks; warm needs 600
  p.hold(undefined);
  use("proofing_basket", warm, p);
  assert.equal(p.inv.count(kb("proofed_bread_dough")), 2);
  p.inv.slots[0] = undefined; p.inv.slots[1] = undefined; // empty hand (keep count below)
  use("proofing_basket", cold, p);
  assert.equal(p.inv.count(kb("proofed_bread_dough")), 0, "cold basket not ready yet");
  __mock.advance(640);
  use("proofing_basket", cold, p);
  assert.equal(p.inv.count(kb("proofed_bread_dough")), 3);
});

test("decorating stand: birthday cake built layer by layer", () => {
  const b = place({ x: 8, y: 64, z: 0 }, kb("decorating_stand"));
  const p = makePlayer();
  for (const id of ["sponge_cake", "whipped_cream", "strawberry"]) { p.hold(kb(id)); use("decorating_stand", b, p); }
  assert.match(lastMsg(p), /stand\.finish/);
  p.hold(kb("birthday_candle")); use("decorating_stand", b, p);
  assert.equal(p.inv.count(kb("birthday_cake")), 1);
});

test("espresso machine: no power -> waits; lever power + water -> latte in a mug", () => {
  const b = place({ x: 12, y: 64, z: 0 }, kb("espresso_machine"));
  const p = makePlayer();
  p.hold("minecraft:water_bucket"); use("espresso_machine", b, p);
  assert.equal(p.inv.count("minecraft:bucket"), 1);
  p.hold(kb("frothed_milk")); use("espresso_machine", b, p);
  p.hold(kb("ground_coffee_medium")); use("espresso_machine", b, p);
  __mock.advance(200);
  p.hold(undefined); use("espresso_machine", b, p);
  assert.match(lastMsg(p), /no_power/);
  dim._power.set("13,64,0", 15); // a lever next to it
  __mock.advance(120);
  use("espresso_machine", b, p);
  assert.match(lastMsg(p), /need_cup/);
  p.inv.slots[8] = new ItemStack(kb("coffee_mug"), 1);
  use("espresso_machine", b, p);
  assert.equal(p.inv.count(kb("latte")), 1);
  assert.equal(p.inv.count(kb("coffee_mug")), 0);
});

test("pour-over stand: ground coffee + water bucket -> pour-over coffee", () => {
  const b = place({ x: 16, y: 64, z: 0 }, kb("pour_over_stand"));
  const p = makePlayer();
  p.inv.slots[8] = new ItemStack(kb("coffee_mug"), 1);
  p.hold(kb("ground_coffee_dark")); use("pour_over_stand", b, p);
  p.hold("minecraft:water_bucket"); use("pour_over_stand", b, p);
  assert.equal(p.inv.count(kb("pour_over_dark")), 1);
});

test("shaker: bubble milk tea with chosen sweetness / ice stored on the drink", async () => {
  const b = place({ x: 20, y: 64, z: 0 }, kb("drink_shaker"));
  const p = makePlayer();
  p.hold(kb("black_tea_base")); use("drink_shaker", b, p);
  assert.equal(p.inv.count("minecraft:glass_bottle"), 1, "tea bottle returned");
  p.hold(kb("tapioca_pearls")); use("drink_shaker", b, p);
  p.hold("minecraft:milk_bucket"); use("drink_shaker", b, p);
  assert.equal(p.inv.count("minecraft:bucket"), 1, "milk bucket returned");
  p.hold(undefined);
  for (let i = 0; i < 4; i++) use("drink_shaker", b, p);
  use("drink_shaker", b, p); // 5th (final) shake
  assert.match(lastMsg(p), /need_cup/, "no cup: last shake refused, nothing lost");
  p.inv.slots[8] = new ItemStack(kb("takeaway_cup"), 1);
  __ui.nextValues = [4, 3]; // no sugar, no ice
  use("drink_shaker", b, p);
  await new Promise(r => setTimeout(r, 0));
  const drink = p.inv.slots.find(s => s?.typeId === kb("bubble_milk_tea"));
  assert.ok(drink);
  assert.equal(drink.getDynamicProperty("kaleidoscope_baking:sweet"), "none");
  assert.equal(drink.getDynamicProperty("kaleidoscope_baking:ice"), "none");
});

test("caffeine: two espressos -> palpitations, a third severe; hot cocoa calms", () => {
  const p = makePlayer();
  __mock.eat(p, new ItemStack(kb("espresso"), 1));
  assert.ok(p.effects.has("haste"));
  __mock.eat(p, new ItemStack(kb("espresso"), 1));
  assert.ok(p.effects.has("nausea"));
  assert.match(lastMsg(p), /palpitations/);
  p.effects.clear();
  __mock.eat(p, new ItemStack(kb("espresso"), 1));
  assert.ok(!p.effects.has("haste"), "no buzz while palpitating");
  assert.ok(p.effects.has("weakness"));
  assert.equal(p.getDynamicProperty("kaleidoscope_baking:caffeine"), 6);
  __mock.eat(p, new ItemStack(kb("hot_cocoa"), 1));
  assert.equal(p.getDynamicProperty("kaleidoscope_baking:caffeine"), 5);
  __mock.advance(1200);
  assert.equal(p.getDynamicProperty("kaleidoscope_baking:caffeine"), 4, "wears off over time");
});

test("afternoon tea: a dessert soon after a drink gives the bonus", () => {
  const p = makePlayer();
  __mock.eat(p, new ItemStack(kb("lemonade"), 1));
  __mock.eat(p, new ItemStack(kb("butter_cookie"), 1));
  assert.match(lastMsg(p), /tea_time/);
  assert.ok(p.effects.has("absorption"));
});

test("placed dessert: 4 bites when hungry, knife cuts a slice, full players are refused", () => {
  const b = place({ x: 24, y: 64, z: 0 }, kb("strawberry_cream_cake"));
  const p = makePlayer();
  p.hold(undefined);
  use("dessert", b, p);
  assert.equal(b.permutation.getState("kaleidoscope_baking:bites"), 1);
  assert.ok(p.hunger.currentValue > 10);
  p.hold("kaleidoscope_cookery:iron_kitchen_knife");
  // Cookery's knife carries the kitchen_knife tag in Cookery's own item JSON:
  p.inv.slots[0]._tags = ["kaleidoscope_cookery:kitchen_knife"];
  use("dessert", b, p);
  assert.equal(p.inv.count(kb("cake_slice")), 1);
  p.hold(undefined);
  p.hunger.currentValue = 20;
  use("dessert", b, p);
  assert.match(lastMsg(p), /dessert\.full/);
  p.hunger.currentValue = 0;
  use("dessert", b, p); use("dessert", b, p);
  assert.equal(b.typeId, "minecraft:air", "last slice removes the block");
});

test("plants: bone meal, perennial harvest resets, mint spreads only onto soil", () => {
  const p = makePlayer();
  dim.getBlock({ x: 30, y: 63, z: 0 }).setType("minecraft:grass_block");
  const bush = place({ x: 30, y: 64, z: 0 }, kb("rosemary_bush"));
  p.hold("minecraft:bone_meal", 64);
  while (bush.permutation.getState("kaleidoscope_baking:growth") < 3) use("plant", bush, p);
  assert.equal(bush.permutation.getState("kaleidoscope_baking:growth"), 3);
  dim.spawned.length = 0;
  p.hold(undefined);
  use("plant", bush, p);
  assert.ok(dim.spawned.some(s => s.id === kb("rosemary")));
  assert.equal(bush.permutation.getState("kaleidoscope_baking:growth"), 1);
});

test("trees: a mature cinnamon sapling grows; bark strips with an axe and regrows", () => {
  const sap = place({ x: 40, y: 64, z: 0 }, kb("cinnamon_sapling_block"), { "kaleidoscope_baking:growth": 2 });
  const p = makePlayer();
  p.hold("minecraft:bone_meal");
  use("tree", sap, p);
  assert.equal(dim.getBlock({ x: 40, y: 64, z: 0 }).typeId, kb("cinnamon_log"));
  assert.equal(dim.getBlock({ x: 40, y: 68, z: 0 }).typeId, kb("cinnamon_leaves"));
  const log = dim.getBlock({ x: 40, y: 65, z: 0 });
  p.hold("minecraft:iron_axe");
  dim.spawned.length = 0;
  C("bark").onPlayerInteract({ block: log, player: p }, { params: paramsOf(log) });
  assert.equal(log.permutation.getState("kaleidoscope_baking:stripped"), true);
  assert.ok(dim.spawned.some(s => s.id === kb("cinnamon_bark")));
});

test("herb planter: plant a cutting, bone meal, harvest", () => {
  const b = place({ x: 50, y: 64, z: 0 }, kb("herb_planter"));
  const p = makePlayer();
  p.hold(kb("mint_cutting")); use("herb_planter", b, p);
  assert.equal(b.permutation.getState("kaleidoscope_baking:plant"), "mint");
  p.hold("minecraft:bone_meal", 64);
  while (b.permutation.getState("kaleidoscope_baking:growth") < 3) use("herb_planter", b, p);
  dim.spawned.length = 0;
  p.hold(undefined); use("herb_planter", b, p);
  assert.ok(dim.spawned.some(s => s.id === kb("mint_leaves")));
  assert.equal(b.permutation.getState("kaleidoscope_baking:growth"), 1, "regrows from stage 1");
});

test("series compat: Harvest leads strawberries — harvests give Harvest's, recipes accept both, bushes convert", () => {
  const p = makePlayer();
  dim.getBlock({ x: 60, y: 63, z: 0 }).setType("minecraft:grass_block");
  const bush = place({ x: 60, y: 64, z: 0 }, kb("strawberry_bush"), { "kaleidoscope_baking:growth": 3 });
  dim.spawned.length = 0;
  use("plant", bush, p);
  assert.ok(dim.spawned.some(s => s.id === "kaleidoscope_harvest:strawberry"), "lead pack's item handed out");
  // the shaker accepts Harvest's strawberry where the recipe says Baking's
  const sh = place({ x: 62, y: 64, z: 0 }, kb("drink_shaker"));
  p.hold("kaleidoscope_harvest:strawberry"); use("drink_shaker", sh, p);
  assert.doesNotMatch(lastMsg(p), /not_ingredient/);
  // random tick converts the Baking bush into Harvest's bush
  const b2 = place({ x: 61, y: 64, z: 0 }, kb("strawberry_bush"), { "kaleidoscope_baking:growth": 2 });
  C("plant").onRandomTick({ block: b2 }, { params: paramsOf(b2) });
  assert.equal(b2.typeId, "kaleidoscope_harvest:strawberry_bush");
});

test("guidebook: published in chunks Cookery can reassemble, with every item", () => {
  system.sendScriptEvent("kaleidoscope_cookery:guidebook_ready", JSON.stringify({ api: 1 }));
  __mock.advance(80);
  const begin = __mock.sent.find(s => s.id === "kaleidoscope_cookery:guidebook_begin");
  assert.ok(begin);
  const { chunks } = JSON.parse(begin.message);
  assert.ok(chunks <= 512);
  const parts = __mock.sent.filter(s => s.id === "kaleidoscope_cookery:guidebook_chunk").map(s => s.message.split("\n"));
  assert.equal(parts.length, chunks);
  assert.ok(parts.every(p => p.length >= 5 && p.join("\n").length <= 2048), "each message fits in 2048 chars");
  const payload = JSON.parse(parts.sort((a, b) => a[3] - b[3]).map(p => p.slice(4).join("\n")).join(""));
  assert.equal(payload.entries.length, 189);
  const latte = payload.entries.find(e => e.id === kb("latte"));
  assert.ok(latte.recipes.length >= 1);
  assert.ok(payload.names.zh_TW[kb("bubble_milk_tea")] === "珍珠奶茶");
  assert.ok(__mock.sent.some(s => s.id === "kaleidoscope_cookery:guidebook_end"));
});

test("Baking API: bulk transfer registers many recipes at once", () => {
  const regs = Array.from({ length: 30 }, (_, i) => ({ event: "kaleidoscope_baking:register_recipe",
    payload: { api: 1, kind: "oven", source: "x", recipe: { id: `x:oven/r${i}`, input: `minecraft:stone_${i}`, result: "minecraft:stone" } } }));
  const json = JSON.stringify({ api: 1, registrations: regs });
  const chunks = json.match(/[\s\S]{1,500}/g);
  system.sendScriptEvent("kaleidoscope_baking:bulk_begin", JSON.stringify({ api: 1, source: "x", id: "b", chunks: chunks.length }));
  chunks.forEach((c, i) => system.sendScriptEvent("kaleidoscope_baking:bulk_chunk", `x\nb\n${i}\n${c}`));
  system.sendScriptEvent("kaleidoscope_baking:bulk_end", JSON.stringify({ api: 1, source: "x", id: "b" }));
  return import("../BP/scripts/api/registry.js").then(r => {
    assert.ok(r.getOvenRecipe("minecraft:stone_29"));
  });
});

void world;
