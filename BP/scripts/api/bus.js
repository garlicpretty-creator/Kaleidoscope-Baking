// ## Kaleidoscope script role: Public extension/API contract (Script Event transport).
// ============================================================================
// Kaleidoscope Baking Script Event API v1 — see documentation/KB_EXTENSION_API.md
// ----------------------------------------------------------------------------
// Other packs never import Baking's files. They talk to Baking through these events:
//   kaleidoscope_baking:api_ping              -> Baking answers with api_ready
//   kaleidoscope_baking:api_ready             <- {api, capabilities, ingredientApi}
//   kaleidoscope_baking:register_recipe       {api, kind, source, recipe}
//   kaleidoscope_baking:register_ingredient   {api, source, id, tags}
//   kaleidoscope_baking:register_fuel         {api, source, fuel:{id, ticks, returns?}}
// ============================================================================
import { ItemStack, system } from "@minecraft/server";
import { KB_API_VERSION, KB_CAPABILITIES, registerFuel, registerRecipe } from "./registry.js";
import { registerIngredient, setItemTagResolver } from "./ingredients.js";
import { onWorldReady } from "../utils/runtime.js";

export const KB_EVENTS = Object.freeze({
  ping: "kaleidoscope_baking:api_ping",
  ready: "kaleidoscope_baking:api_ready",
  recipe: "kaleidoscope_baking:register_recipe",
  ingredient: "kaleidoscope_baking:register_ingredient",
  fuel: "kaleidoscope_baking:register_fuel"
});

// Item-JSON tags (minecraft:tags) are read through ItemStack#hasTag. Results are cached:
// an item's declared tags cannot change during a session.
const tagCache = new Map();
setItemTagResolver((id, tag) => {
  const k = `${id}|${tag}`;
  let v = tagCache.get(k);
  if (v === undefined) {
    try { v = new ItemStack(id, 1).hasTag(tag); } catch { v = false; }
    tagCache.set(k, v);
  }
  return v;
});

function sendReady() {
  try {
    system.sendScriptEvent(KB_EVENTS.ready, JSON.stringify({
      api: KB_API_VERSION, capabilities: KB_CAPABILITIES, ingredientApi: 1
    }));
  } catch {}
}

const HANDLERS = {
  [KB_EVENTS.recipe]: registerRecipe,
  [KB_EVENTS.ingredient]: registerIngredient,
  [KB_EVENTS.fuel]: registerFuel
};

system.afterEvents.scriptEventReceive.subscribe(ev => {
  if (ev.id === KB_EVENTS.ping) { sendReady(); return; }
  const handler = HANDLERS[ev.id];
  if (!handler) return;
  try {
    const result = handler(JSON.parse(String(ev.message ?? "")));
    if (!result.ok) console.warn(`[Kaleidoscope Baking] Rejected ${ev.id} (${result.reason}).`);
  } catch (err) {
    console.warn(`[Kaleidoscope Baking] Invalid ${ev.id} message: ${err}`);
  }
});

// Announce a few times after load so packs that loaded first still hear us.
// Packs that load later can always send api_ping.
onWorldReady(() => {
  let n = 0;
  const h = system.runInterval(() => {
    sendReady();
    if (++n >= 5) system.clearRun(h);
  }, 20);
});
