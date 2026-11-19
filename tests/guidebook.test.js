// The Baking chapter of Cookery's guidebook: chapters with icons, text for what needs explaining, real zh_CN.
import test from "node:test";
import assert from "node:assert/strict";
import { buildGuidebook } from "../BP/scripts/integrations/guidebookData.js";
import { CONTENT, toSimplified } from "../BP/scripts/data/generated/content.js";

const g = buildGuidebook("test");
const entry = id => g.entries.find(e => e.id === `kaleidoscope_baking:${id}`);

test("guidebook: listed with the series star and the add-on's full name", () => {
  assert.equal(g.icon, "textures/ui/kb_guidebook");
  assert.equal(g.text.zh_TW.title, "森羅物語：烘焙");
  assert.equal(g.text.zh_CN.title, "森罗物语：烘焙");
  assert.equal(g.text.en_US.title, "Kaleidoscope Baking");
});

test("guidebook: every chapter has an icon and every entry a chapter", () => {
  assert.deepEqual(g.categories.map(c => c.id), ["stations", "tools", "plants", "ingredients", "foods", "drinks"]);
  for (const c of g.categories) assert.match(c.icon, /^textures\/items\/kb_\w+$/, c.id);
  const ids = new Set(g.categories.map(c => c.id));
  for (const e of g.entries) assert.ok(ids.has(e.category), e.id);
  assert.equal(g.entries.length, Object.keys(CONTENT.items).length);
});

test("guidebook: plants, desserts and mug drinks explain themselves; placeables are item + block", () => {
  for (const crop of CONTENT.crops) assert.ok(g.entries.find(e => e.id === crop.seed).mechanics.length >= 2, crop.seed);
  for (const id of Object.keys(CONTENT.desserts)) assert.ok(g.entries.find(e => e.id === id).mechanics.length, id);
  for (const id of CONTENT.mugs) assert.ok(g.entries.find(e => e.id === id).mechanics.length, id);
  assert.deepEqual(entry("sponge_cake").kinds, ["item", "block"]);
  assert.deepEqual(entry("butter").kinds, ["item"]);
  assert.ok(entry("oven").mechanicsByLocale.zh_TW.some(line => line.includes("爐門")), "the oven says how its door works");
});

test("guidebook: zh_CN is Simplified, not a copy of zh_TW", () => {
  assert.equal(toSimplified("攪拌盆與發酵籃"), "搅拌盆与发酵篮");
  const all = [...Object.values(g.text.zh_CN), ...g.entries.flatMap(e => e.mechanicsByLocale.zh_CN)].join("");
  assert.equal(all, toSimplified(all), "nothing left to convert");
  for (const ch of "點擊種門爐樹葉著") assert.ok(!all.includes(ch), `still has ${ch}`);
  assert.equal(CONTENT.items["kaleidoscope_baking:mixing_bowl"].zh_CN, "搅拌盆");
});
