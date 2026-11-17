// End-to-end run of the real block components against tests/mock/server.js.
// Requires: node --import ./tests/mock/register.mjs --test   (npm test does this)
import { test } from "node:test";
import assert from "node:assert/strict";
import { BlockPermutation, ItemStack, makePlayer, system, __mock } from "@minecraft/server";

await import("../BP/scripts/main.js");
const registry = __mock.startup();
const oven = registry.get("kaleidoscope_baking:oven");
const bowl = registry.get("kaleidoscope_baking:mixing_bowl");
const dim = __mock.overworld;
const OVEN = "kaleidoscope_baking:oven";

function placeOven(player, c) {
  const block = dim.getBlock(c);
  const e = { block, player, permutationToPlace: BlockPermutation.resolve(OVEN), cancel: false };
  oven.beforeOnPlayerPlace(e);
  if (e.cancel) return false;
  block.setPermutation(e.permutationToPlace); // what the engine does
  oven.onPlace({ block });
  __mock.flush();
  return true;
}
const ovenBlocks = () => [...dim._blocks.values()].filter(p => p.type.id === OVEN).length;
const lastMsg = p => JSON.stringify(p.messages.at(-1));

test("components are registered and Baking answers api_ping", () => {
  assert.ok(oven && bowl);
  system.sendScriptEvent("kaleidoscope_baking:api_ping", "test");
  const ready = __mock.sent.filter(s => s.id === "kaleidoscope_baking:api_ready").at(-1);
  assert.deepEqual(JSON.parse(ready.message).api, 1);
});

test("Cookery handshake registers the toast chopping-board recipe once", () => {
  assert.ok(__mock.sent.some(s => s.id === "kaleidoscope_cookery:api_ping"));
  const cap = JSON.stringify({ api: 1, capabilities: ["chopping_board", "display_rules"] });
  system.sendScriptEvent("kaleidoscope_cookery:api_ready", cap);
  system.sendScriptEvent("kaleidoscope_cookery:api_ready", cap);
  const regs = __mock.sent.filter(s => s.id === "kaleidoscope_cookery:register_recipe");
  assert.equal(regs.length, 1);
  assert.equal(JSON.parse(regs[0].message).recipe.input, "kaleidoscope_baking:toast_loaf");
});

test("oven: placing grows a 3x3x3 structure facing the player", () => {
  const p = makePlayer({ x: 0.5, z: 5.5 });
  assert.ok(placeOven(p, { x: 0, y: 64, z: 0 }));
  assert.equal(ovenBlocks(), 27);
  const door = dim.getBlock({ x: 0, y: 65, z: 1 }).permutation;
  assert.equal(door.getState("kaleidoscope_baking:facing"), "south");
  assert.equal(door.getState("kaleidoscope_baking:oven_part"), 16);
});

test("oven: placement is refused without a clear 3x3x3 space or when standing inside", () => {
  dim.getBlock({ x: 21, y: 65, z: 0 }).setType("minecraft:dirt");
  const p = makePlayer({ x: 20.5, z: 8.5 });
  assert.equal(placeOven(p, { x: 20, y: 64, z: 0 }), false);
  assert.match(lastMsg(p), /no_room/);
  const q = makePlayer({ x: 40.5, z: 0.5 });
  assert.equal(placeOven(q, { x: 40, y: 64, z: 0 }), false);
  assert.match(lastMsg(q), /too_close/);
  assert.equal(ovenBlocks(), 27);
});

test("oven: mold from inventory, fuel, bake to perfect, take out from any part", () => {
  const p = makePlayer({ x: 0.5, z: 5.5 });
  const corner = dim.getBlock({ x: 1, y: 66, z: -1 });
  p.inv.slots[5] = new ItemStack("kaleidoscope_baking:cake_mold", 1);
  p.hold("kaleidoscope_baking:cake_batter", 2);
  oven.onPlayerInteract({ block: corner, player: p });
  assert.match(lastMsg(p), /loaded_no_fuel/);
  assert.equal(p.inv.count("kaleidoscope_baking:cake_mold"), 0, "mold moved into the oven");
  assert.equal(p.inv.count("kaleidoscope_baking:cake_batter"), 1);

  // second batter: no mold left -> refused, batter kept
  oven.onPlayerInteract({ block: corner, player: p });
  assert.match(lastMsg(p), /need_mold/);
  assert.equal(p.inv.count("kaleidoscope_baking:cake_batter"), 1);

  p.hold("minecraft:coal", 3);
  oven.onPlayerInteract({ block: corner, player: p });
  assert.match(lastMsg(p), /fuel_added/);
  const firebox = () => dim.getBlock({ x: 0, y: 64, z: 1 }).permutation.getState("kaleidoscope_baking:lit");
  assert.equal(firebox(), true, "firebox lights while baking");

  __mock.tick(30); // 600 ticks = sponge cake time
  p.hold(undefined);
  oven.onPlayerInteract({ block: corner, player: p });
  assert.equal(p.inv.count("kaleidoscope_baking:sponge_cake"), 1);
  assert.equal(p.inv.count("kaleidoscope_baking:cake_mold"), 1, "mold returned");
  __mock.tick(1);
  assert.equal(firebox(), false, "fire goes out when nothing bakes");
});

test("oven: leaving it in too long burns it", () => {
  const p = makePlayer({ x: 0.5, z: 5.5 });
  const door = dim.getBlock({ x: 0, y: 65, z: 1 });
  p.hold("minecraft:potato", 1);
  oven.onPlayerInteract({ block: door, player: p });
  __mock.tick(40); // 200 bake + 400 window = 600 ticks -> burnt at 30, extra margin
  p.hold(undefined);
  oven.onPlayerInteract({ block: door, player: p });
  assert.equal(p.inv.count("kaleidoscope_baking:burnt_food"), 1);
});

test("oven: sneak + empty hand pulls out unfinished items", () => {
  const p = makePlayer({ x: 0.5, z: 5.5 });
  const door = dim.getBlock({ x: 0, y: 65, z: 1 });
  p.hold("minecraft:potato", 1);
  oven.onPlayerInteract({ block: door, player: p });
  p.hold(undefined);
  oven.onPlayerInteract({ block: door, player: p });
  assert.equal(p.inv.count("minecraft:potato"), 0, "unfinished stays without sneaking");
  p.isSneaking = true;
  oven.onPlayerInteract({ block: door, player: p });
  assert.equal(p.inv.count("minecraft:potato"), 1);
});

test("oven: breaking any part removes all 27 and returns contents + the oven", () => {
  const p = makePlayer({ x: 0.5, z: 5.5 });
  const door = dim.getBlock({ x: 0, y: 65, z: 1 });
  p.hold("minecraft:potato", 1);
  oven.onPlayerInteract({ block: door, player: p });
  const corner = dim.getBlock({ x: -1, y: 66, z: 1 });
  const broken = corner.permutation;
  corner.setType("minecraft:air");
  dim.spawned.length = 0;
  oven.onPlayerBreak({ block: corner, brokenBlockPermutation: broken, player: p });
  assert.equal(ovenBlocks(), 0);
  const ids = dim.spawned.map(s => s.id).sort();
  assert.deepEqual(ids, ["kaleidoscope_baking:oven", "minecraft:potato"]);
  assert.equal(__mock.dynamic.get("kb_oven:minecraft:overworld:0,64,0"), undefined, "state cleared");
});

test("oven: explosions tear it down once and refund", () => {
  const p = makePlayer({ x: 50.5, z: 5.5 });
  assert.ok(placeOven(p, { x: 50, y: 64, z: 0 }));
  dim.spawned.length = 0;
  for (const loc of [{ x: 49, y: 64, z: -1 }, { x: 51, y: 66, z: 1 }]) {
    const b = dim.getBlock(loc); const perm = b.permutation; b.setType("minecraft:air");
    __mock.explode(b, perm);
  }
  assert.equal(ovenBlocks(), 0);
  assert.equal(dim.spawned.filter(s => s.id === OVEN).length, 1);
});

test("mixing bowl: liquids return their container, whisking makes butter", () => {
  const b = dim.getBlock({ x: 10, y: 64, z: 10 });
  b.setPermutation(BlockPermutation.resolve("kaleidoscope_baking:mixing_bowl"));
  const p = makePlayer();
  p.hold("minecraft:dirt");
  bowl.onPlayerInteract({ block: b, player: p });
  assert.match(lastMsg(p), /not_ingredient/);

  p.hold("minecraft:milk_bucket");
  bowl.onPlayerInteract({ block: b, player: p });
  assert.equal(p.inv.count("minecraft:bucket"), 1);

  p.hold("kaleidoscope_baking:whisk");
  for (let i = 0; i < 8; i++) bowl.onPlayerInteract({ block: b, player: p });
  assert.equal(p.inv.count("kaleidoscope_baking:butter"), 2);
  assert.match(lastMsg(p), /bowl\.done/);
});

test("mixing bowl: cake batter from tagged ingredients; breaking spills solids only", () => {
  const b = dim.getBlock({ x: 12, y: 64, z: 10 });
  b.setPermutation(BlockPermutation.resolve("kaleidoscope_baking:mixing_bowl"));
  const p = makePlayer();
  for (const id of ["kaleidoscope_cookery:flour", "minecraft:egg", "minecraft:sugar", "minecraft:milk_bucket"]) {
    p.hold(id); bowl.onPlayerInteract({ block: b, player: p });
  }
  assert.match(lastMsg(p), /bowl\.ready/);
  dim.spawned.length = 0;
  bowl.onPlayerBreak({ block: b });
  assert.deepEqual(dim.spawned.map(s => s.id).sort(), ["kaleidoscope_cookery:flour", "minecraft:egg", "minecraft:sugar"]);
});

test("oven: a late duplicate teardown never refunds a second oven", () => {
  const p = makePlayer({ x: 70.5, z: 5.5 });
  assert.ok(placeOven(p, { x: 70, y: 64, z: 0 }));
  const b = dim.getBlock({ x: 70, y: 65, z: 0 }); const perm = b.permutation; b.setType("minecraft:air");
  dim.spawned.length = 0;
  oven.onPlayerBreak({ block: b, brokenBlockPermutation: perm, player: p });
  oven.onPlayerBreak({ block: b, brokenBlockPermutation: perm, player: p });
  assert.equal(dim.spawned.filter(s => s.id === OVEN).length, 1);
});
