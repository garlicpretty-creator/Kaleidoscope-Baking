// ## Kaleidoscope script role: Integration with the Kaleidoscope Cookery host.
// ============================================================================
// Baking talks to Cookery ONLY through Cookery's public Script Event API
// (Cookery documentation/KC_EXTENSION_API.md). We never import Cookery's scripts.
// Registrations are sent once per session after Cookery's api_ready handshake and are
// filtered by the capabilities Cookery advertises.
// ============================================================================
import { system } from "@minecraft/server";
import { onWorldReady } from "../utils/runtime.js";

const KC = Object.freeze({
  ping: "kaleidoscope_cookery:api_ping",
  ready: "kaleidoscope_cookery:api_ready",
  recipe: "kaleidoscope_cookery:register_recipe",
  displayRule: "kaleidoscope_cookery:register_display_rule"
});
const SOURCE = "kaleidoscope_baking";

/** Cookery station recipes owned by Baking, grouped by the capability they need. */
const COOKERY_RECIPES = [
  {
    capability: "chopping_board",
    kind: "chopping_board",
    recipe: {
      id: "kaleidoscope_baking:board/toast_slices",
      input: "kaleidoscope_baking:toast_loaf",
      result: "kaleidoscope_baking:toast_slice",
      count: 4,
      cuts: 3
    }
  }
];

/** Baking foods shown as flat items on Cookery tables / fruit baskets. */
const DISPLAY_RULES = [
  { id: "kaleidoscope_baking:butter_cookie", mode: "item" },
  { id: "kaleidoscope_baking:toast_slice", mode: "item" }
];

let registered = false;
export let cookeryCapabilities = [];

function registerWithCookery(capabilities) {
  if (registered) return;
  registered = true;
  cookeryCapabilities = capabilities;
  let n = 0;
  for (const r of COOKERY_RECIPES) {
    if (!capabilities.includes(r.capability)) continue;
    system.sendScriptEvent(KC.recipe, JSON.stringify({ api: 1, kind: r.kind, source: SOURCE, recipe: r.recipe }));
    n++;
  }
  if (capabilities.includes("display_rules")) {
    for (const d of DISPLAY_RULES) {
      system.sendScriptEvent(KC.displayRule, JSON.stringify({ api: 1, source: SOURCE, id: d.id, mode: d.mode }));
    }
  }
  console.log(`[Kaleidoscope Baking] Connected to Kaleidoscope Cookery (${capabilities.length} capabilities, ${n} station recipes).`);
}

system.afterEvents.scriptEventReceive.subscribe(ev => {
  if (ev.id !== KC.ready) return;
  try {
    const info = JSON.parse(String(ev.message ?? "{}"));
    if (Number(info.api) !== 1) return;
    registerWithCookery(Array.isArray(info.capabilities) ? info.capabilities.map(String) : []);
  } catch {}
});

onWorldReady(() => {
  try { system.sendScriptEvent(KC.ping, SOURCE); } catch {}
  // Cookery is a hard manifest dependency, so silence here means its API is broken/changed.
  system.runTimeout(() => {
    if (!registered) console.warn("[Kaleidoscope Baking] Kaleidoscope Cookery did not answer api_ping; Cookery station recipes were not registered.");
  }, 200);
});
