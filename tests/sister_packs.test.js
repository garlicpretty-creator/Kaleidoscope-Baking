// Reverse registrations against the receivers. Baking's real messages (compat/reverse.data.js,
// sent by compat/index.js) are run through the sister packs' own handler code when their
// repositories sit next to this one:
//   Fishing Voyage  scripts/fishing/registry.js + loot.js, loaded here on Baking's mock, so the
//                   whole handshake runs over one script-event bus
//   Ranching        scripts/api/ranchingApi.js, in a child process on Ranching's own test mock
// Without the repositories those two tests are skipped; the first test always checks the
// messages against a copy of the receivers' rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ItemTypes, system, __mock } from "@minecraft/server";
import { REVERSE_REGISTRATIONS } from "../BP/scripts/compat/reverse.data.js";

await import("../BP/scripts/main.js");
__mock.startup();

const kb = n => `kaleidoscope_baking:${n}`;
const sibling = (env, rel) => process.env[env] ?? fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const FISHING_SCRIPTS = sibling("KB_FISHING_SCRIPTS", "Fishing_Voyage_1.4.0/Kaleidoscope Fishing Voyage [BP]/scripts/");
const RANCHING_REPO = sibling("KB_RANCHING_REPO", "KR/");
const missing = (path, what) => (existsSync(path) ? false : `${what} repository not found at ${path}`);
const sentTo = id => __mock.sent.filter(s => s.id === id).map(s => s.message);
const BAIT = REVERSE_REGISTRATIONS.find(r => r.series === "fishing");
const FEED = REVERSE_REGISTRATIONS.find(r => r.series === "ranch");

test("reverse registrations follow the receivers' rules (copied from their code)", () => {
  assert.deepEqual(REVERSE_REGISTRATIONS.map(r => r.event), ["kaleidoscope_fishing:register_bait", "kaleidoscope_ranching:register_feed"]);
  const ID = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;
  for (const r of REVERSE_REGISTRATIONS) assert.ok(JSON.stringify(r.payload).length <= 2048, "a script event message holds 2048 characters");

  // Fishing Voyage, fishing/registry.js: parse() envelope, onRegister() 1..32 entries, baitEntry().
  assert.equal(BAIT.readyEvent, "kaleidoscope_fishing:api_ready");
  assert.equal(BAIT.needs, "bait");
  const m = JSON.parse(JSON.stringify(BAIT.payload));
  assert.equal(Number(m.api), 1);
  assert.match(m.source, /^[a-z0-9_.-]{1,48}$/);
  assert.notEqual(m.source, "kaleidoscope_fishing");
  assert.ok(Array.isArray(m.baits) && m.baits.length >= 1 && m.baits.length <= 32, "1..32 entries per message");
  for (const b of m.baits) {
    assert.ok(typeof b.id === "string" && ID.test(b.id) && b.id.length <= 96);
    assert.ok(!b.id.startsWith("kaleidoscope_fishing:"), "built-in baits are closed");
    assert.ok(ItemTypes.get(b.id), `${b.id} is a real Baking item`);
    assert.ok(typeof b.biteFactor === "number" && b.biteFactor >= 0.5 && b.biteFactor <= 1, "biteFactor 0.5..1");
  }

  // Ranching, api/ranchingApi.js: registerFeedItem() = ownId(item), FEED_KINDS[kind], units 1..9.
  assert.equal(FEED.readyEvent, "kaleidoscope_ranching:api_ready");
  assert.equal(FEED.resultEvent, "kaleidoscope_ranching:api_result");
  assert.equal(FEED.needs, "register_feed");
  const f = JSON.parse(JSON.stringify(FEED.payload));
  assert.ok(f && typeof f === "object" && !Array.isArray(f), "message must be a JSON object");
  assert.ok(typeof f.item === "string" && ID.test(f.item));
  assert.ok(!["minecraft", "kaleidoscope_ranching"].includes(f.item.split(":")[0]), "item must use the sender's own namespace");
  assert.ok(ItemTypes.get(f.item), `${f.item} is a real Baking item`);
  assert.ok(["grass", "grain", "veg", "mixed", "concentrate"].includes(f.kind), "a kind every Ranching v1 knows");
  assert.ok(Number.isInteger(f.units) && f.units >= 1 && f.units <= 9);
});

test("Fishing Voyage's own registry accepts Baking's bait message", { skip: missing(FISHING_SCRIPTS, "Fishing Voyage") }, async () => {
  const log = [];
  const real = { warn: console.warn, info: console.info };
  console.warn = (...a) => log.push(a.join(" "));
  console.info = (...a) => log.push(a.join(" "));
  try {
    assert.equal(sentTo(BAIT.event).length, 0, "nothing before Fishing is there");
    // Loading Fishing's modules subscribes its registry to the bus and schedules its api_ready.
    const loot = await import(pathToFileURL(`${FISHING_SCRIPTS}fishing/loot.js`).href);
    const registry = await import(pathToFileURL(`${FISHING_SCRIPTS}fishing/registry.js`).href);
    __mock.advance(20);

    const ready = sentTo(registry.EV.ready).map(s => JSON.parse(s));
    assert.ok(ready.length >= 1 && ready[0].api === 1 && ready[0].capabilities.includes("bait"), "Fishing announced itself");
    assert.deepEqual(sentTo(BAIT.event), [JSON.stringify(BAIT.payload)], "Baking answered with one register_bait");
    assert.deepEqual(registry.externalBait(kb("bread_crumbs")), { id: kb("bread_crumbs"), biteFactor: 0.8, source: "kaleidoscope_baking" });
    assert.equal(loot.BAITS[kb("bread_crumbs")]?.biteFactor, 0.8, "the table the rod reads has it");
    assert.deepEqual(log.filter(l => l.includes("Rejected")), [], "no rejection in Fishing's log");
    assert.ok(log.some(l => l.includes("kaleidoscope_baking registered 1 bait(s)")), "Fishing logged the registration");

    // Another api_ready (any pack's ping makes Fishing send one) does not make Baking send again.
    system.sendScriptEvent(registry.EV.ping, "kaleidoscope_ranching");
    assert.equal(sentTo(BAIT.event).length, 1);
    // The message on its own, straight into Fishing's handler.
    assert.equal(registry.onRegister({ id: BAIT.event, message: JSON.stringify(BAIT.payload) }), 1);
    // What Baking used to send: the rejection the server log showed.
    assert.equal(registry.onRegister({ id: BAIT.event, message: JSON.stringify({ api: 1, source: "kaleidoscope_baking", item: kb("bread_crumbs"), power: 1 }) }), 0);
    assert.ok(log.some(l => l.includes("Rejected kaleidoscope_fishing:register_bait from kaleidoscope_baking: 1..32 entries per message")));
  } finally { Object.assign(console, real); }
});

test("Ranching's own API accepts Baking's feed message", { skip: missing(`${RANCHING_REPO}tools/test/register.mjs`, "Ranching") }, () => {
  // Baking sends it when Ranching announces itself the way announceReady() does.
  const before = sentTo(FEED.event).length;
  system.sendScriptEvent(FEED.readyEvent, JSON.stringify({ api: 1, version: "1.3.0", capabilities: ["register_animal", "register_feed"] }));
  const messages = sentTo(FEED.event).slice(before);
  assert.deepEqual(messages, [JSON.stringify(FEED.payload)]);

  // Ranching's modules need Ranching's own mock of @minecraft/server, so its handler runs in a child process.
  const probe = `
    const at = p => new URL(p, process.env.KB_RANCHING_URL).href;
    const api = await import(at("packs/BP/scripts/api/ranchingApi.js"));
    const { FEEDS, KIND } = await import(at("packs/BP/scripts/data/feeds.js"));
    const { SPECIES } = await import(at("packs/BP/scripts/data/species.js"));
    const message = process.env.KB_MESSAGE;
    const result = api.handleScriptEvent(process.env.KB_EVENT, message);
    const feed = FEEDS[JSON.parse(message).item];
    const eaters = Object.values(SPECIES).filter(s => feed && s.eats.includes(feed.kind)).map(s => s.key);
    const old = api.handleScriptEvent("kaleidoscope_ranching:register_feed", process.env.KB_OLD_MESSAGE);
    console.log("PROBE " + JSON.stringify({ result, feed, veg: KIND.VEG, eaters, capabilities: api.CAPABILITIES, old }));
  `;
  const run = spawnSync(process.execPath, ["--import", pathToFileURL(`${RANCHING_REPO}tools/test/register.mjs`).href, "--input-type=module", "-e", probe], {
    encoding: "utf8",
    env: { ...process.env, KB_RANCHING_URL: pathToFileURL(RANCHING_REPO).href, KB_EVENT: FEED.event, KB_MESSAGE: messages[0],
      KB_OLD_MESSAGE: JSON.stringify({ api: 1, source: "kaleidoscope_baking", item: kb("fruit_pulp"), animals: ["minecraft:pig", "minecraft:chicken"] }) }
  });
  const line = run.stdout.split(/\r?\n/).find(l => l.startsWith("PROBE "));
  assert.ok(line, `Ranching's handler ran (exit ${run.status}): ${run.stderr}`);
  const out = JSON.parse(line.slice(6));
  assert.ok(out.capabilities.includes(FEED.needs), "Ranching's api_ready names the capability Baking waits for");
  assert.deepEqual(out.result, { event: "register_feed", id: kb("fruit_pulp"), ok: true }, "the api_result Ranching sends back");
  assert.deepEqual(out.feed, { kind: out.veg, units: 1 }, "fruit pulp is in Ranching's feed table");
  assert.deepEqual(out.eaters.sort(), ["pig", "rabbit"], "who eats it from the trough");
  assert.equal(out.old.ok, false, "what Baking used to send would have been refused");
});
