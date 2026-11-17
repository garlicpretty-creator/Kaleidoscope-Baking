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
// Baking never writes text to the screen; a refusal is a low note (and a puff of smoke) instead.
const refused = () => dim.sounds.at(-1) === "note.bass";

test("components are registered and Baking answers api_ping", () => {
  assert.ok(oven && bowl);
  system.sendScriptEvent("kaleidoscope_baking:api_ping", "test");
  const ready = __mock.sent.filter(s => s.id === "kaleidoscope_baking:api_ready").at(-1);
  assert.deepEqual(JSON.parse(ready.message).api, 1);
});

test("Cookery handshake: registrations are queued once and filtered by capability", () => {
  assert.ok(__mock.sent.some(s => s.id === "kaleidoscope_cookery:api_ping"));
  const cap = JSON.stringify({ api: 1, capabilities: ["chopping_board", "display_rules"] });
  system.sendScriptEvent("kaleidoscope_cookery:api_ready", cap);
  system.sendScriptEvent("kaleidoscope_cookery:api_ready", cap);
  __mock.advance(40);
  const regs = __mock.sent.filter(s => s.id === "kaleidoscope_cookery:register_recipe").map(s => JSON.parse(s.message));
  assert.ok(regs.length > 0);
  assert.ok(regs.every(r => r.kind === "chopping_board"), "only advertised capabilities");
  assert.equal(regs.filter(r => r.recipe.input === "kaleidoscope_baking:toast_loaf").length, 1, "sent once");
  assert.ok(__mock.sent.some(s => s.id === "kaleidoscope_cookery:register_display_rule"));
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
  assert.ok(refused(), "no room: placement refused with the low note");
  assert.equal(p.messages.length, 0, "no text");
  const q = makePlayer({ x: 40.5, z: 0.5 });
  assert.equal(placeOven(q, { x: 40, y: 64, z: 0 }), false);
  assert.ok(refused(), "standing inside: refused");
  assert.equal(ovenBlocks(), 27);
});

test("oven: mold from inventory, fuel, bake to perfect, take out from any part", () => {
  const p = makePlayer({ x: 0.5, z: 5.5 });
  const corner = dim.getBlock({ x: 1, y: 66, z: -1 });
  p.inv.slots[5] = new ItemStack("kaleidoscope_baking:cake_mold", 1);
  p.hold("kaleidoscope_baking:cake_batter", 2);
  oven.onPlayerInteract({ block: corner, player: p });
  assert.equal(p.inv.count("kaleidoscope_baking:cake_mold"), 0, "mold moved into the oven");
  assert.equal(p.inv.count("kaleidoscope_baking:cake_batter"), 1);

  // second batter: no mold left -> refused, batter kept
  oven.onPlayerInteract({ block: corner, player: p });
  assert.ok(refused(), "no mold: refused");
  assert.equal(p.inv.count("kaleidoscope_baking:cake_batter"), 1);

  p.hold("minecraft:coal", 3);
  oven.onPlayerInteract({ block: corner, player: p });
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
  assert.ok(refused(), "dirt is not an ingredient");

  p.hold("minecraft:milk_bucket");
  bowl.onPlayerInteract({ block: b, player: p });
  assert.equal(p.inv.count("minecraft:bucket"), 1);

  p.hold("kaleidoscope_baking:whisk");
  for (let i = 0; i < 8; i++) bowl.onPlayerInteract({ block: b, player: p });
  assert.equal(p.inv.count("kaleidoscope_baking:butter"), 2);
  assert.equal(p.messages.length, 0, "no text");
});

test("mixing bowl: cake batter from tagged ingredients; breaking spills solids only", () => {
  const b = dim.getBlock({ x: 12, y: 64, z: 10 });
  b.setPermutation(BlockPermutation.resolve("kaleidoscope_baking:mixing_bowl"));
  const p = makePlayer();
  for (const id of ["kaleidoscope_cookery:flour", "minecraft:egg", "minecraft:sugar", "minecraft:milk_bucket"]) {
    p.hold(id); bowl.onPlayerInteract({ block: b, player: p });
  }
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

test("oven door visual: opens when loading, glows while baking, removed with the oven", () => {
  const VIS = "kaleidoscope_baking:station_visual";
  const p = makePlayer({ x: 30.5, z: 5.5 });
  assert.ok(placeOven(p, { x: 30, y: 64, z: 0 }));
  const near = () => dim.getEntities({ type: VIS, location: { x: 30.5, y: 65, z: 1.5 }, maxDistance: 0.6 });
  assert.equal(near().length, 1, "the door appears with the oven");
  const v = near()[0];
  assert.equal(v.getProperty("kaleidoscope_baking:kind"), 7);
  assert.equal(v.rotation.y, 0, "south-facing oven: door faces south");
  p.hold("minecraft:potato", 1);
  oven.onPlayerInteract({ block: dim.getBlock({ x: 30, y: 64, z: 0 }), player: p });
  assert.equal(v.getProperty("kaleidoscope_baking:active"), true, "loading opens the door");
  p.hold("minecraft:coal", 1);
  oven.onPlayerInteract({ block: dim.getBlock({ x: 30, y: 64, z: 0 }), player: p });
  __mock.tick(1);
  assert.equal(v.getProperty("kaleidoscope_baking:progress"), 1, "the window glows while baking");
  const ctrl = dim.getBlock({ x: 30, y: 64, z: 0 });
  oven.onPlayerBreak({ block: ctrl, brokenBlockPermutation: ctrl.permutation, player: p });
  assert.equal(near().length, 0, "breaking the oven removes the door");
});
