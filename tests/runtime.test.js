// End-to-end run of the real block components against tests/mock/server.js.
// Requires: node --import ./tests/mock/register.mjs --test   (npm test does this)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { BlockPermutation, ItemStack, makePlayer, system, world, __mock } from "@minecraft/server";

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
// No text prompts: refusals are a per-player "note.bass" (rate-limited), everything else is a
// sound / particle at the block.
const refusals = p => p.sounds.filter(s => s.id === "note.bass").length;
function expectRefused(p, fn, why) {
  system.currentTick += 10; // past the refusal rate limit
  const before = refusals(p);
  const r = fn();
  __mock.flush();
  assert.equal(refusals(p), before + 1, why ?? "refused sound");
  return r;
}
const lastSound = () => dim.soundLog.at(-1);
const lastParticle = () => dim.particles.at(-1)?.id;

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
  assert.equal(expectRefused(p, () => placeOven(p, { x: 20, y: 64, z: 0 }), "no room"), false);
  const q = makePlayer({ x: 40.5, z: 0.5 });
  assert.equal(expectRefused(q, () => placeOven(q, { x: 40, y: 64, z: 0 }), "too close"), false);
  assert.equal(ovenBlocks(), 27);
});

test("oven: mold from inventory, fuel, bake to perfect, take out from any part", () => {
  const p = makePlayer({ x: 0.5, z: 5.5 });
  const corner = dim.getBlock({ x: 1, y: 66, z: -1 });
  p.inv.slots[5] = new ItemStack("kaleidoscope_baking:cake_mold", 1);
  p.hold("kaleidoscope_baking:cake_batter", 2);
  oven.onPlayerInteract({ block: corner, player: p });
  assert.equal(lastSound().id, "random.click", "loaded");
  assert.equal(lastParticle(), "minecraft:basic_smoke_particle", "no fuel yet: the door smokes");
  assert.equal(refusals(p), 0);
  assert.equal(p.inv.count("kaleidoscope_baking:cake_mold"), 0, "mold moved into the oven");
  assert.equal(p.inv.count("kaleidoscope_baking:cake_batter"), 1);

  // second batter: no mold left -> refused, batter kept
  expectRefused(p, () => oven.onPlayerInteract({ block: corner, player: p }), "needs a mold");
  assert.equal(p.inv.count("kaleidoscope_baking:cake_batter"), 1);

  p.hold("minecraft:coal", 3);
  oven.onPlayerInteract({ block: corner, player: p });
  assert.equal(lastSound().id, "fire.ignite");
  const lowFuelPitch = lastSound().pitch;
  oven.onPlayerInteract({ block: corner, player: p });
  assert.ok(lastSound().pitch > lowFuelPitch, "the ignite pitch rises with the fuel level");
  assert.equal(lastParticle(), "minecraft:basic_flame_particle");
  const firebox = () => dim.getBlock({ x: 0, y: 64, z: 1 }).permutation.getState("kaleidoscope_baking:lit");
  assert.equal(firebox(), true, "firebox lights while baking");

  __mock.tick(30); // 600 ticks = sponge cake time
  // Inspecting with an unrelated item is refused; nothing changes.
  p.hold("minecraft:dirt");
  expectRefused(p, () => oven.onPlayerInteract({ block: corner, player: p }));
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
  p.hold(undefined);
  expectRefused(p, () => bowl.onPlayerInteract({ block: b, player: p }), "empty bowl");
  p.hold("minecraft:dirt");
  expectRefused(p, () => bowl.onPlayerInteract({ block: b, player: p }), "not an ingredient");

  p.hold("minecraft:milk_bucket");
  bowl.onPlayerInteract({ block: b, player: p });
  assert.equal(p.inv.count("minecraft:bucket"), 1);

  p.hold("kaleidoscope_baking:whisk");
  for (let i = 0; i < 8; i++) bowl.onPlayerInteract({ block: b, player: p });
  assert.equal(p.inv.count("kaleidoscope_baking:butter"), 2);
  assert.equal(lastSound().id, "random.orb", "done chime");
  assert.equal(lastParticle(), "minecraft:villager_happy");
  const strokes = dim.soundLog.filter(s => s.id === "block.composter.fill").slice(-7).map(s => s.pitch);
  assert.ok(strokes.every((v, i) => !i || v > strokes[i - 1]), "each stroke sounds higher");
});

test("mixing bowl: cake batter from tagged ingredients; breaking spills solids only", () => {
  const b = dim.getBlock({ x: 12, y: 64, z: 10 });
  b.setPermutation(BlockPermutation.resolve("kaleidoscope_baking:mixing_bowl"));
  const p = makePlayer();
  for (const id of ["kaleidoscope_cookery:flour", "minecraft:egg", "minecraft:sugar", "minecraft:milk_bucket"]) {
    p.hold(id); bowl.onPlayerInteract({ block: b, player: p });
  }
  assert.deepEqual([lastSound().id, lastSound().pitch], ["random.orb", 1.8], "soft chime: the mix makes something");
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

test("oven: an empty-hand poke with nothing to take shows the fuel level, no text", () => {
  const p = makePlayer({ x: 90.5, z: 5.5 });
  assert.ok(placeOven(p, { x: 90, y: 64, z: 0 }));
  const door = dim.getBlock({ x: 90, y: 65, z: 1 });
  p.hold(undefined);
  oven.onPlayerInteract({ block: door, player: p });
  assert.equal(lastParticle(), "minecraft:basic_smoke_particle", "cold: a puff of smoke");
  p.hold("minecraft:coal", 2);
  oven.onPlayerInteract({ block: door, player: p });
  p.hold(undefined);
  oven.onPlayerInteract({ block: door, player: p });
  assert.equal(lastSound().id, "fire.fire", "fuelled: the firebox crackles");
  assert.equal(lastParticle(), "minecraft:basic_flame_particle");
  assert.equal(refusals(p), 0);
});

test("refuse(): one bass note per player, rate-limited, forgotten when they leave", async () => {
  const { refuse } = await import("../BP/scripts/utils/runtime.js");
  const p = makePlayer();
  system.currentTick += 100;
  refuse(p, "test.a"); refuse(p, "test.b");
  assert.equal(refusals(p), 1, "spam is rate-limited");
  const q = makePlayer();
  refuse(q, "test.a");
  assert.equal(refusals(q), 1, "per player");
  system.currentTick += 10;
  refuse(p, "test.c");
  assert.equal(refusals(p), 2);
  world.afterEvents.playerLeave._fire({ playerId: p.id });
  refuse(p, "test.d");
  assert.equal(refusals(p), 3, "leaving clears the limiter");
  refuse(undefined, "test.e"); // no player: no throw
});

test("series rule: no on-screen text is ever pushed", () => {
  for (const p of world.getAllPlayers()) assert.deepEqual(p.messages, [], `player ${p.id}`);
  const dir = new URL("../BP/scripts/", import.meta.url);
  const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(new URL(e.name + "/", d)) : e.name.endsWith(".js") ? [new URL(e.name, d)] : []);
  for (const f of walk(dir)) {
    const src = readFileSync(f, "utf8");
    assert.doesNotMatch(src, /onScreenDisplay|setActionBar|setTitle|updateSubtitle|sendMessage|\btellraw\b|\btitleraw\b|runCommand[^)]*\btitle\b/, f.pathname);
  }
});
