// ## Kaleidoscope script role: Integration with the Kaleidoscope Cookery host.
// ============================================================================
// Baking talks to Cookery ONLY through Cookery's public Script Event API. We never import
// Cookery's scripts. After Cookery's api_ready handshake we register (filtered by the
// capabilities Cookery advertises, once per session):
//   - station recipes (millstone, chopping board, steamer, bamboo tray, stockpot, wok)
//   - Mystery Tea exclusions, table display rules
//   - sickle area-harvest for Baking crops
// and, after guidebook_ready, the "Baking" guidebook tab (chunked, see guidebookData.js).
// ============================================================================
import { system } from "@minecraft/server";
import { onWorldReady } from "../utils/runtime.js";
import { enqueueEvent } from "../utils/sendQueue.js";
import { toChunks } from "../api/chunks.js";
import { CONTENT } from "../data/generated/content.js";
import { COOKERY_REGISTRATIONS } from "./cookeryData.js";
import { buildGuidebook, GUIDEBOOK_ID } from "./guidebookData.js";
import { setAutoConvert } from "../compat/index.js";
import { registryRevision } from "../api/registry.js";

const KC = Object.freeze({
  ping: "kaleidoscope_cookery:api_ping",
  ready: "kaleidoscope_cookery:api_ready",
  recipe: "kaleidoscope_cookery:register_recipe",
  displayRule: "kaleidoscope_cookery:register_display_rule",
  oil: "kaleidoscope_cookery:register_oil_container",
  sickle: "kaleidoscope_cookery:sickle_crop_register",
  gbPing: "kaleidoscope_cookery:guidebook_ping",
  gbReady: "kaleidoscope_cookery:guidebook_ready",
  gbBegin: "kaleidoscope_cookery:guidebook_begin",
  gbChunk: "kaleidoscope_cookery:guidebook_chunk",
  gbEnd: "kaleidoscope_cookery:guidebook_end"
});
const SOURCE = "kaleidoscope_baking";
const SETTINGS_EVENT = "kaleidoscope_baking:settings_changed";

let registered = false;
let guidebookSent = false;
let publishedRevision = -1;
export let cookeryCapabilities = [];

export function cookeryMessages(capabilities) {
  const out = [];
  for (const r of COOKERY_REGISTRATIONS.recipes) {
    if (capabilities.includes(r.capability)) out.push([KC.recipe, { api: 1, kind: r.kind, source: SOURCE, recipe: r.recipe }]);
  }
  if (capabilities.includes("teapot_mystery_exclude")) {
    for (const id of COOKERY_REGISTRATIONS.teapotMysteryExclude) {
      out.push([KC.recipe, { api: 1, kind: "teapot_mystery_exclude", source: SOURCE, recipe: { id: `${SOURCE}:mystery_exclude/${id.split(":")[1]}`, ingredient: id } }]);
    }
  }
  if (capabilities.includes("oil_containers")) {
    for (const c of COOKERY_REGISTRATIONS.oilContainers ?? []) out.push([KC.oil, { api: 1, source: SOURCE, container: c }]);
  }
  if (capabilities.includes("display_rules")) {
    for (const d of COOKERY_REGISTRATIONS.displayRules) out.push([KC.displayRule, { api: 1, source: SOURCE, id: d.id, mode: d.mode }]);
  }
  // The sickle registration event is not in Cookery's capability list; it is sent anyway
  // (harmless if Cookery ignores it). Trees and fruit leaves are excluded.
  for (const c of CONTENT.crops) {
    out.push([KC.sickle, { id: c.id, item: c.harvest, seed: c.seed, growthState: "kaleidoscope_baking:growth", maxAge: c.max, resetAge: c.kind === "perennial" ? c.reset : 0 }]);
  }
  return out;
}

function registerWithCookery(capabilities) {
  if (registered) return;
  registered = true;
  cookeryCapabilities = capabilities;
  const msgs = cookeryMessages(capabilities);
  for (const [id, payload] of msgs) enqueueEvent(id, JSON.stringify(payload));
  console.log(`[Kaleidoscope Baking] Connected to Kaleidoscope Cookery (${capabilities.length} capabilities, ${msgs.length} registrations).`);
}

function publishGuidebook(force = false) {
  if (guidebookSent && !force) return;
  guidebookSent = true;
  publishedRevision = registryRevision();
  const revision = `r${system.currentTick}`;
  const chunks = toChunks(buildGuidebook("1.2.2"));
  enqueueEvent(KC.gbBegin, JSON.stringify({ api: 1, source: SOURCE, id: GUIDEBOOK_ID, revision, chunks: chunks.length }));
  chunks.forEach((data, i) => enqueueEvent(KC.gbChunk, `${SOURCE}\n${GUIDEBOOK_ID}\n${revision}\n${i}\n${data}`));
  enqueueEvent(KC.gbEnd, JSON.stringify({ api: 1, source: SOURCE, id: GUIDEBOOK_ID, revision }));
}

system.afterEvents.scriptEventReceive.subscribe(ev => {
  try {
    if (ev.id === KC.ready) {
      const info = JSON.parse(String(ev.message ?? "{}"));
      if (Number(info.api) !== 1) return;
      registerWithCookery(Array.isArray(info.capabilities) ? info.capabilities.map(String) : []);
    } else if (ev.id === KC.gbReady) {
      publishGuidebook();
    } else if (ev.id === SETTINGS_EVENT) {
      const msg = JSON.parse(String(ev.message ?? "{}"));
      const v = msg?.values?.auto_convert ?? msg?.values?.[0];
      if (typeof v === "boolean") setAutoConvert(v);
    }
  } catch {}
});

// 1.1: recipes registered by other packs after the first publish also reach the guidebook.
// The registry revision must stay unchanged for 2 s (one burst = one republish).
let seenRevision = -1;
onWorldReady(() => {
  system.runInterval(() => {
    if (!guidebookSent) return;
    const rev = registryRevision();
    if (rev === publishedRevision) return;
    if (rev !== seenRevision) { seenRevision = rev; return; }
    publishGuidebook(true);
  }, 40);
});

onWorldReady(() => {
  try { system.sendScriptEvent(KC.ping, SOURCE); } catch {}
  try { system.sendScriptEvent(KC.gbPing, SOURCE); } catch {}
  // Cookery is a hard manifest dependency, so silence here means its API is broken/changed.
  system.runTimeout(() => {
    if (!registered) console.warn("[Kaleidoscope Baking] Kaleidoscope Cookery did not answer api_ping; Cookery station recipes were not registered.");
  }, 200);
});
