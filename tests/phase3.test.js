// Convenience update, phase 3: stand mixer, cooling rack, mug rack (and the espresso machine's container above).
// Pure rules in api/rackLogic.js, then the real block components against tests/mock/server.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BlockPermutation, ItemStack, makePlayer, __mock } from "@minecraft/server";
import {
  addBake, coolTick, hangMugs, normalizeCooling, normalizeMugs, risingEdge, takeBakes, takeMugs, COOL_TICKS, COOLING_SLOTS, MUG_SLOTS
} from "../BP/scripts/api/rackLogic.js";

await import("../BP/scripts/main.js");
const registry = __mock.startup();
const dim = __mock.overworld;
const kb = n => `kaleidoscope_baking:${n}`;
const C = name => registry.get(kb(name));
const place = (loc, id) => { const b = dim.getBlock(loc); b.setPermutation(BlockPermutation.resolve(id)); return b; };
const use = (name, block, player) => C(name).onPlayerInteract({ block, player });
const refused = () => dim.sounds.at(-1) === "note.bass";
const visualAt = b => dim.getEntities({ type: kb("station_visual"), location: { x: b.x + 0.5, y: b.y, z: b.z + 0.5 }, maxDistance: 1 })[0];
const shown = (b, type = kb("display")) => dim.getEntities({ type, location: { x: b.x + 0.5, y: b.y + 0.5, z: b.z + 0.5 }, maxDistance: 1.5 })
  .map(e => e.held).sort();

function placeOven(player, c) {
  const block = dim.getBlock(c);
  const e = { block, player, permutationToPlace: BlockPermutation.resolve(kb("oven")), cancel: false };
  C("oven").beforeOnPlayerPlace(e);
  assert.ok(!e.cancel);
  block.setPermutation(e.permutationToPlace);
  C("oven").onPlace({ block });
  __mock.flush();
  return block;
}
function stock(p, entries) {
  let i = 1;
  for (const [id, n] of entries) {
    let left = n;
    while (left > 0) {
      const s = new ItemStack(id, 1);
      s.amount = Math.min(left, s.maxAmount);
      left -= s.amount;
      p.inv.slots[i++] = s;
    }
  }
}
/** Move whatever is in the hand into the back of the inventory (taken items land in slot 0 = the hand). */
function emptyHand(p) {
  const s = p.inv.slots[0];
  p.inv.slots[0] = undefined;
  if (s) p.inv.slots[p.inv.slots.findLastIndex(x => !x)] = s;
}
function loadCakeBatter(b, p) {
  for (const id of ["kaleidoscope_cookery:flour", "minecraft:egg", "minecraft:sugar", "minecraft:milk_bucket"]) { p.hold(id); use("stand_mixer", b, p); }
}

// --------------------------------------------------------------------------------------------- pure rules
test("rack rules: cooling rack holds 4 bakes, cools them, gives the oldest first", () => {
  const s = normalizeCooling(undefined);
  for (let i = 0; i < COOLING_SLOTS; i++) assert.ok(addBake(s, [{ id: `b${i}`, count: 1 }, { id: "mold", count: 1 }]));
  assert.equal(addBake(s, [{ id: "x", count: 1 }]), false, "full");
  assert.deepEqual(coolTick(s, 20), [0, 1, 2, 3]);
  assert.deepEqual(coolTick(s, COOL_TICKS), [], "all cool");
  assert.deepEqual(takeBakes(s), [[{ id: "b0", count: 1 }, { id: "mold", count: 1 }]]);
  assert.equal(takeBakes(s, true).length, 3);
  assert.deepEqual(normalizeCooling({ bakes: [{ items: [{ id: "a", count: 0 }] }, { items: [{ id: "b", count: 2 }], warm: 99999 }] }),
    { bakes: [{ items: [{ id: "b", count: 2 }], warm: COOL_TICKS }] }, "bad records dropped, warmth clamped");
});

test("rack rules: mug rack holds 6, hands a drink back before an empty mug; redstone runs on a rising edge only", () => {
  const s = normalizeMugs({ mugs: ["m", "m", 3, ""] });
  assert.deepEqual(s.mugs, ["m", "m"]);
  assert.equal(hangMugs(s, "m", 10), MUG_SLOTS - 2);
  s.mugs[2] = "latte";
  assert.deepEqual(takeMugs(s, id => id === "m"), ["latte"]);
  assert.deepEqual(takeMugs(s, id => id === "m"), ["m"]);
  const m = { powered: false };
  assert.equal(risingEdge(m, 15), true);
  assert.equal(risingEdge(m, 15), false, "held on: no second run");
  assert.equal(risingEdge(m, 0), false);
  assert.equal(risingEdge(m, 7), true);
});

// --------------------------------------------------------------------------------------------- stand mixer
test("stand mixer: load like the bowl, the crank runs every stroke by itself, the result waits in the bowl", () => {
  const b = place({ x: 0, y: 64, z: 20 }, kb("stand_mixer"));
  C("stand_mixer").onPlace({ block: b });
  assert.equal(visualAt(b)?.getProperty(kb("kind")), 8, "the beater and crank are shown from the start");
  const p = makePlayer();
  loadCakeBatter(b, p);
  assert.equal(p.inv.count("minecraft:bucket"), 1, "the milk bucket comes back");
  p.hold(undefined);
  dim.sounds.length = 0;
  use("stand_mixer", b, p);
  use("stand_mixer", b, p); // clicks while it runs are ignored
  __mock.flush();
  assert.equal(dim.sounds.filter(s => s === "block.composter.fill").length, 6, "every stroke sounds");
  assert.equal(dim.sounds.filter(s => s === "random.orb").length, 1);
  assert.equal(p.inv.count(kb("cake_batter")), 0, "not handed over: it waits in the bowl");
  assert.equal(visualAt(b).getProperty(kb("fill")), 5, "the batter shows");
  p.hold("minecraft:egg");
  use("stand_mixer", b, p);
  assert.ok(refused(), "take the result first");
  p.hold(undefined);
  use("stand_mixer", b, p);
  assert.equal(p.inv.count(kb("cake_batter")), 1);
  assert.equal(p.messages.length, 0, "no text");
});

test("stand mixer: sneak with a stack loads whole sets; a container below takes the result", () => {
  const chest = __mock.placeContainer({ x: 4, y: 63, z: 20 });
  const b = place({ x: 4, y: 64, z: 20 }, kb("stand_mixer"));
  const p = makePlayer();
  p.hold("kaleidoscope_cookery:flour", 8);
  stock(p, [["minecraft:egg", 8], ["minecraft:sugar", 8], ["minecraft:milk_bucket", 2]]);
  p.isSneaking = true;
  use("stand_mixer", b, p);
  assert.equal(p.inv.count("kaleidoscope_cookery:flour"), 6, "two sets");
  p.isSneaking = false;
  p.inv.slots[30] = p.inv.slots[0];
  p.hold(undefined);
  use("stand_mixer", b, p);
  __mock.flush();
  assert.equal(chest.count(kb("cake_batter")), 2, "result x2 went down");
  p.hold(undefined);
  use("stand_mixer", b, p);
  assert.ok(refused(), "empty mixer");
});

test("stand mixer: a redstone pulse mixes; a signal already on while loading does not", () => {
  const b = place({ x: 8, y: 64, z: 20 }, kb("stand_mixer"));
  const p = makePlayer();
  dim._power.set("9,64,20", 15); // a lever beside it, already on
  loadCakeBatter(b, p);
  dim.sounds.length = 0;
  __mock.advance(40);
  assert.equal(dim.sounds.filter(s => s === "random.orb").length, 0, "no rising edge yet");
  dim._power.set("9,64,20", 0);
  __mock.advance(10);
  dim.sounds.length = 0;
  dim._power.set("9,64,20", 15);
  __mock.advance(10);
  assert.equal(dim.sounds.filter(s => s === "random.orb").length, 1, "the pulse ran it");
  p.hold(undefined);
  use("stand_mixer", b, p);
  assert.equal(p.inv.count(kb("cake_batter")), 1);
});

test("stand mixer: frother recipes too; breaking it gives everything back", () => {
  const b = place({ x: 12, y: 64, z: 20 }, kb("stand_mixer"));
  const p = makePlayer();
  p.hold(kb("whipped_cream")); use("stand_mixer", b, p);
  p.hold("minecraft:milk_bucket"); use("stand_mixer", b, p);
  p.hold(undefined); use("stand_mixer", b, p);
  __mock.flush();
  use("stand_mixer", b, p);
  assert.equal(p.inv.count(kb("milk_foam_cap")), 2);
  p.hold("minecraft:egg", 2); use("stand_mixer", b, p);
  dim.spawned.length = 0;
  C("stand_mixer").onPlayerBreak({ block: b });
  assert.deepEqual(dim.spawned.map(s => s.id), ["minecraft:egg"]);
});

// --------------------------------------------------------------------------------------------- cooling rack
test("cooling rack: under the oven it catches perfect bakes, shows them steaming, and gives them back by hand", () => {
  const rack = place({ x: 30, y: 63, z: 20 }, kb("cooling_rack"));
  const p = makePlayer({ x: 30.5, z: 25.5 });
  const ctrl = placeOven(p, { x: 30, y: 64, z: 20 });
  p.hold("minecraft:potato", 2); use("oven", ctrl, p); use("oven", ctrl, p);
  p.hold("minecraft:coal", 2); use("oven", ctrl, p);
  __mock.tick(11);
  assert.deepEqual(shown(rack), ["minecraft:baked_potato", "minecraft:baked_potato"], "both on the rack");
  dim.particles.length = 0;
  __mock.tick(2);
  assert.ok(dim.particles.filter(x => x.id === kb("steam")).length >= 4, "steaming");
  __mock.tick(60);
  dim.particles.length = 0;
  __mock.tick(2);
  assert.equal(dim.particles.filter(x => x.id === kb("steam")).length, 0, "cooled down");
  p.hold(undefined);
  use("cooling_rack", rack, p);
  assert.equal(p.inv.count("minecraft:baked_potato"), 1, "the oldest one");
  assert.deepEqual(shown(rack), ["minecraft:baked_potato"]);
  emptyHand(p);
  p.isSneaking = true;
  use("cooling_rack", rack, p);
  assert.equal(p.inv.count("minecraft:baked_potato"), 2);
  assert.deepEqual(shown(rack), []);
});

test("cooling rack: in front of the oven too; a chest below still comes first; molds come back", () => {
  // oven facing south (player at +z): the front is z + 2
  const p = makePlayer({ x: 40.5, z: 25.5 });
  const rack = place({ x: 40, y: 64, z: 22 }, kb("cooling_rack"));
  const ctrl = placeOven(p, { x: 40, y: 64, z: 20 });
  p.hold(kb("cake_batter")); p.inv.slots[5] = new ItemStack(kb("cake_mold"), 1);
  use("oven", ctrl, p);
  p.hold("minecraft:coal", 4); use("oven", ctrl, p);
  __mock.tick(40);
  assert.equal(shown(rack).length, 1, "the cake is on the rack in front");
  p.hold(undefined);
  use("cooling_rack", rack, p);
  assert.equal(p.inv.count(kb("cake_mold")), 1, "mold back with the bake");
  assert.equal(p.inv.count(kb("sponge_cake")), 1);

  const chest = __mock.placeContainer({ x: 40, y: 63, z: 20 });
  p.hold("minecraft:potato"); use("oven", ctrl, p);
  __mock.tick(12);
  assert.equal(chest.count("minecraft:baked_potato"), 1, "chest first");
  assert.deepEqual(shown(rack), []);
});

test("cooling rack: a full rack leaves the bake in the oven; breaking it drops everything", () => {
  const rack = place({ x: 50, y: 63, z: 20 }, kb("cooling_rack"));
  const p = makePlayer({ x: 50.5, z: 25.5 });
  const ctrl = placeOven(p, { x: 50, y: 64, z: 20 });
  for (let round = 0; round < 2; round++) {
    p.hold("minecraft:potato", 4); p.isSneaking = true; use("oven", ctrl, p); p.isSneaking = false;
    p.hold("minecraft:coal", 2); use("oven", ctrl, p);
    __mock.tick(12);
  }
  assert.equal(shown(rack).length, 4);
  p.hold(undefined);
  use("oven", ctrl, p);
  assert.equal(p.inv.count("minecraft:baked_potato"), 4, "the second batch stayed in the oven");
  dim.spawned.length = 0;
  C("cooling_rack").onPlayerBreak({ block: rack });
  assert.equal(dim.spawned.filter(s => s.id === "minecraft:baked_potato").length, 4);
});

// --------------------------------------------------------------------------------------------- mug rack + espresso
function brewLatte(machine, p) {
  p.hold("minecraft:water_bucket"); use("espresso_machine", machine, p);
  p.hold(kb("frothed_milk")); use("espresso_machine", machine, p);
  p.hold(kb("ground_coffee_medium")); use("espresso_machine", machine, p);
}

test("mug rack: the espresso machine takes a mug from it and hangs the drink back; grounds wait in the machine", () => {
  const machine = place({ x: 60, y: 64, z: 20 }, kb("espresso_machine"));
  const rack = place({ x: 61, y: 64, z: 20 }, kb("mug_rack"));
  const p = makePlayer();
  p.hold(kb("coffee_mug"), 8); p.isSneaking = true;
  use("mug_rack", rack, p);
  p.isSneaking = false;
  assert.equal(p.inv.count(kb("coffee_mug")), 2, "six hung");
  assert.equal(shown(rack, kb("display_small")).length, 6);
  p.hold(kb("whisk"));
  use("mug_rack", rack, p);
  assert.ok(refused(), "only mugs and mug drinks");
  brewLatte(machine, p);
  dim._power.set("60,63,20", 15);
  __mock.advance(200);
  assert.deepEqual(shown(rack, kb("display_small")).filter(x => x !== kb("coffee_mug")), [kb("latte")], "the latte hangs on the rack");
  p.hold(undefined);
  p.inv.slots[1] = undefined;
  use("espresso_machine", machine, p);
  assert.equal(p.inv.count(kb("coffee_grounds")), 1, "grounds handed over on the next click");
  emptyHand(p);
  use("mug_rack", rack, p);
  assert.equal(p.inv.count(kb("latte")), 1, "a drink comes off first");
  assert.equal(p.inv.count(kb("coffee_mug")), 0);
});

test("mug rack: with a chest under the machine the drink goes in there; a waiting drink is served once mugs are hung", () => {
  const chest = __mock.placeContainer({ x: 70, y: 63, z: 20 });
  const machine = place({ x: 70, y: 64, z: 20 }, kb("espresso_machine"));
  const rack = place({ x: 70, y: 64, z: 21 }, kb("mug_rack"));
  const p = makePlayer();
  brewLatte(machine, p);
  dim._power.set("71,64,20", 15);
  __mock.advance(200);
  assert.equal(chest.count(kb("latte")), 0, "no mug on the rack: the drink waits in the machine");
  p.hold(kb("coffee_mug"), 1);
  use("mug_rack", rack, p);
  assert.equal(chest.count(kb("latte")), 1, "served as soon as a mug was hung");
  assert.equal(chest.count(kb("coffee_grounds")), 1);
  assert.deepEqual(shown(rack, kb("display_small")), [], "the mug left the rack with the drink");
});

test("espresso machine: a chest on top feeds water buckets (empty bucket back) and ground coffee", () => {
  const machine = place({ x: 80, y: 64, z: 20 }, kb("espresso_machine"));
  const top = __mock.placeContainer({ x: 80, y: 65, z: 20 });
  const rack = place({ x: 81, y: 64, z: 20 }, kb("mug_rack"));
  top.setItem(0, new ItemStack("minecraft:water_bucket", 1));
  top.setItem(1, new ItemStack(kb("ground_coffee_medium"), 2));
  const p = makePlayer();
  p.hold(kb("coffee_mug"), 2); p.isSneaking = true; use("mug_rack", rack, p); p.isSneaking = false;
  dim._power.set("80,63,20", 15);
  p.hold(undefined);
  use("espresso_machine", machine, p);
  assert.equal(top.count("minecraft:bucket"), 1, "the empty bucket went back into the chest");
  assert.equal(top.count(kb("ground_coffee_medium")), 1);
  __mock.advance(400);
  assert.equal(top.count(kb("ground_coffee_medium")), 0, "the next coffee was pulled when the first was done");
  assert.deepEqual(shown(rack, kb("display_small")), [kb("espresso"), kb("espresso")], "two espressos, brewed one after another");
  assert.equal(p.messages.length, 0, "no text");
});
