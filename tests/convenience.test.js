// Convenience update, phase 1: "sneak = do it all" (mixing bowl, oven), the oven's container
// below, and series duplicates (accepted everywhere, swapped 1:1 at the proofing basket).
// Runs the real block components against tests/mock/server.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BlockPermutation, EXTRA_ITEMS, ItemStack, makePlayer, __mock } from "@minecraft/server";

// Pretend 豐收 and 樂牧 are installed with (some of) their real duplicate items.
for (const id of ["kaleidoscope_harvest:strawberry", "kaleidoscope_harvest:cinnamon_bark", "kaleidoscope_ranching:butter",
  "kaleidoscope_ranching:custard", "kaleidoscope_ranching:raw_egg_tart"]) EXTRA_ITEMS.add(id);

await import("../BP/scripts/main.js");
const registry = __mock.startup();
const dim = __mock.overworld;
const kb = n => `kaleidoscope_baking:${n}`;
const C = name => registry.get(kb(name));
const place = (loc, id) => { const b = dim.getBlock(loc); b.setPermutation(BlockPermutation.resolve(id)); return b; };
const use = (name, block, player) => C(name).onPlayerInteract({ block, player });
const refused = () => dim.sounds.at(-1) === "note.bass";
const OVEN = kb("oven");

function placeOven(player, c) {
  const block = dim.getBlock(c);
  const e = { block, player, permutationToPlace: BlockPermutation.resolve(OVEN), cancel: false };
  C("oven").beforeOnPlayerPlace(e);
  assert.ok(!e.cancel);
  block.setPermutation(e.permutationToPlace);
  C("oven").onPlace({ block });
  __mock.flush();
  return block;
}

/** Fill inventory slots from index 1 on (slot 0 is the hand). */
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

test("mixing bowl: sneak with a stack adds full sets (x3, limited by the milk), sneak with the whisk does every stroke", () => {
  const b = place({ x: 0, y: 64, z: 0 }, kb("mixing_bowl"));
  const p = makePlayer();
  p.hold("kaleidoscope_cookery:flour", 8);
  stock(p, [["minecraft:egg", 8], ["minecraft:sugar", 8], ["minecraft:milk_bucket", 3]]);
  p.isSneaking = true;
  use("mixing_bowl", b, p);
  assert.ok(!refused());
  assert.equal(p.inv.count("kaleidoscope_cookery:flour"), 5, "three sets of flour");
  assert.equal(p.inv.count("minecraft:egg"), 5);
  assert.equal(p.inv.count("minecraft:sugar"), 5);
  assert.equal(p.inv.count("minecraft:milk_bucket"), 0);
  assert.equal(p.inv.count("minecraft:bucket"), 3, "every bucket comes back");

  // A batched bowl takes nothing more by hand.
  p.isSneaking = false;
  p.hold("minecraft:sugar", 1);
  use("mixing_bowl", b, p);
  assert.ok(refused());

  p.hold(kb("whisk"));
  p.isSneaking = true;
  dim.sounds.length = 0;
  use("mixing_bowl", b, p);
  assert.equal(dim.sounds.filter(s => s === "block.composter.fill").length, 1, "the first stroke at once");
  use("mixing_bowl", b, p); // clicks while it runs are ignored
  __mock.flush();
  assert.equal(dim.sounds.filter(s => s === "block.composter.fill").length, 5, "each remaining stroke still sounds");
  assert.equal(dim.sounds.filter(s => s === "random.orb").length, 1);
  assert.equal(p.inv.count(kb("cake_batter")), 3, "result x3");
  assert.equal(p.messages.length, 0, "no text");
});

test("mixing bowl: sneak-add completes what is already in the bowl; a batch comes back whole", () => {
  const b = place({ x: 2, y: 64, z: 0 }, kb("mixing_bowl"));
  const p = makePlayer();
  p.hold(kb("cocoa_powder"), 1); // steer it: chocolate, not plain cake batter
  use("mixing_bowl", b, p);
  p.hold("kaleidoscope_cookery:flour", 4);
  stock(p, [["minecraft:egg", 4], ["minecraft:sugar", 4], ["minecraft:milk_bucket", 2], [kb("cocoa_powder"), 1]]);
  p.isSneaking = true;
  use("mixing_bowl", b, p);
  assert.equal(p.inv.count("kaleidoscope_cookery:flour"), 2, "two sets: the second needed a second cocoa");
  assert.equal(p.inv.count(kb("cocoa_powder")), 0);
  // Sneak with an empty hand: everything back, each solid twice (the milk was poured in).
  p.inv.slots[30] = p.inv.slots[0];
  p.hold(undefined);
  use("mixing_bowl", b, p);
  assert.equal(p.inv.count("kaleidoscope_cookery:flour"), 4);
  assert.equal(p.inv.count(kb("cocoa_powder")), 2);
  assert.equal(p.inv.count("minecraft:egg"), 4);
});

test("mixing bowl: sneak with a stack that completes nothing adds just one, as before", () => {
  const b = place({ x: 4, y: 64, z: 0 }, kb("mixing_bowl"));
  const p = makePlayer();
  p.hold("minecraft:egg", 5);
  p.isSneaking = true;
  use("mixing_bowl", b, p);
  assert.equal(p.inv.count("minecraft:egg"), 4);
});

test("oven: sneak with a stack fills every free slot", () => {
  const p = makePlayer({ x: 10.5, z: 5.5 });
  const ctrl = placeOven(p, { x: 10, y: 64, z: 0 });
  p.hold("minecraft:potato", 10);
  p.isSneaking = true;
  use("oven", ctrl, p);
  assert.equal(p.inv.count("minecraft:potato"), 6, "four slots");
  use("oven", ctrl, p);
  assert.ok(refused(), "full");
});

test("oven: a chest under the oven receives each bake the moment it is perfect, so it never burns", () => {
  const chest = __mock.placeContainer({ x: 20, y: 63, z: 0 }, "minecraft:chest", 27);
  const p = makePlayer({ x: 20.5, z: 5.5 });
  const ctrl = placeOven(p, { x: 20, y: 64, z: 0 });
  p.hold("minecraft:potato", 2);
  use("oven", ctrl, p); use("oven", ctrl, p);
  p.hold("minecraft:coal", 4);
  use("oven", ctrl, p); use("oven", ctrl, p);
  __mock.tick(9);
  assert.equal(chest.count("minecraft:baked_potato"), 0, "not done yet");
  __mock.tick(2);
  assert.equal(chest.count("minecraft:baked_potato"), 2, "both went down as soon as they were perfect");
  __mock.tick(40);
  assert.deepEqual(chest.slots.filter(Boolean).map(st => st.typeId), ["minecraft:baked_potato"], "nothing burnt");
  p.hold(undefined);
  dim.sounds.length = 0;
  use("oven", ctrl, p);
  assert.equal(p.inv.count("minecraft:baked_potato"), 0, "the oven is empty");
});

test("oven: a full container leaves the bake in the oven (nothing is lost)", () => {
  const chest = __mock.placeContainer({ x: 40, y: 63, z: 0 }, "minecraft:hopper", 1);
  chest.setItem(0, new ItemStack("minecraft:dirt", 64));
  const p = makePlayer({ x: 40.5, z: 5.5 });
  const ctrl = placeOven(p, { x: 40, y: 64, z: 0 });
  p.hold("minecraft:potato", 1); use("oven", ctrl, p);
  p.hold("minecraft:coal", 1); use("oven", ctrl, p);
  __mock.tick(12);
  p.hold(undefined);
  use("oven", ctrl, p);
  assert.equal(p.inv.count("minecraft:baked_potato"), 1, "still in the oven, taken by hand");
});

test("series duplicates: the proofing basket swaps a held stack 1:1 both ways, only for installed packs", () => {
  const basket = place({ x: 60, y: 64, z: 0 }, kb("proofing_basket"));
  const p = makePlayer();
  p.hold(kb("butter"), 20);
  use("proofing_basket", basket, p);
  assert.equal(p.inv.slots[0]?.typeId, "kaleidoscope_ranching:butter");
  assert.equal(p.inv.slots[0]?.amount, 20);
  use("proofing_basket", basket, p);
  assert.equal(p.inv.slots[0]?.typeId, kb("butter"), "and back");
  p.hold("kaleidoscope_harvest:strawberry", 7);
  use("proofing_basket", basket, p);
  assert.equal(p.inv.slots[0]?.typeId, kb("strawberry"), "into Baking's own, not mapped back to Harvest's");
  p.hold(kb("lemon"), 3); // 豐收's lemon is not installed in this test
  use("proofing_basket", basket, p);
  assert.ok(refused());
  assert.equal(p.inv.count(kb("lemon")), 3);
  p.hold(kb("bread_dough"), 2); // dough still proofs
  use("proofing_basket", basket, p);
  assert.equal(p.inv.count(kb("bread_dough")), 0);
  assert.equal(p.messages.length, 0, "no text");
});

test("series duplicates: Baking's stations accept the canonical item; outputs follow series.data.js", () => {
  // 樂牧's custard in the bowl: raw egg tart, handed out as 樂牧's raw egg tart (canonical).
  const b = place({ x: 62, y: 64, z: 0 }, kb("mixing_bowl"));
  const p = makePlayer();
  for (const id of [kb("pie_crust"), "kaleidoscope_ranching:custard"]) { p.hold(id); use("mixing_bowl", b, p); }
  p.hold(kb("whisk")); use("mixing_bowl", b, p);
  assert.equal(p.inv.count("kaleidoscope_ranching:raw_egg_tart"), 1);
  // 樂牧's butter is a #kaleidoscope:butter; Baking keeps handing out its own butter.
  p.hold("kaleidoscope_ranching:butter"); use("mixing_bowl", b, p);
  assert.ok(!refused(), "accepted");
  p.hold(undefined); use("mixing_bowl", b, p);
  p.hold("minecraft:milk_bucket"); use("mixing_bowl", b, p);
  p.hold(kb("whisk")); p.isSneaking = true; use("mixing_bowl", b, p); __mock.flush();
  assert.equal(p.inv.count(kb("butter")), 2, "Baking's butter (outputs: false)");
});
