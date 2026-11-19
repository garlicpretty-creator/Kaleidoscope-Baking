// ## Kaleidoscope script role: Public extension/API contract (Script Event transport).
// ============================================================================
// Kaleidoscope Baking Script Event API v1 — see documentation/KB_EXTENSION_API.md
// ----------------------------------------------------------------------------
// Other packs never import Baking's files. They talk to Baking through these events:
//   kaleidoscope_baking:api_ping                -> Baking answers with api_ready
//   kaleidoscope_baking:api_ready               <- {api, capabilities, ingredientApi}
//   kaleidoscope_baking:register_recipe         {api, kind, source, recipe}
//   kaleidoscope_baking:register_ingredient     {api, source, id, tags}
//   kaleidoscope_baking:register_fuel           {api, source, fuel:{id, ticks, returns?}}
//   kaleidoscope_baking:register_food_effect    {api, source, id, category, caffeine, reduces, effects, clear}
//   kaleidoscope_baking:bulk_begin / bulk_chunk / bulk_end   many of the above at once
// 1.1:
//   kaleidoscope_baking:register_display_rule   {api, source, id, mode:"allow"|"deny"}
//   kaleidoscope_baking:query_ingredient        {api, id, reply?}  -> ingredient_info {api, id, tags}
//   kaleidoscope_baking:caffeine_adjust         {api, player:"<name or id>", delta}
// ============================================================================
import { ItemStack, system, world } from "@minecraft/server";
import { KB_API_VERSION, KB_CAPABILITIES, registerFuel, registerRecipe } from "./registry.js";
import { registerIngredient, registeredTagsFor, setItemTagResolver } from "./ingredients.js";
import { registerDisplayRule } from "./displayRules.js";
import { cleanId } from "../utils/ids.js";
import { registerFoodEffect } from "./effects.js";
import { bulkBegin, bulkChunk, bulkEnd } from "./chunks.js";
import { onWorldReady } from "../utils/runtime.js";

export const KB_EVENTS = Object.freeze({
  ping: "kaleidoscope_baking:api_ping",
  ready: "kaleidoscope_baking:api_ready",
  recipe: "kaleidoscope_baking:register_recipe",
  ingredient: "kaleidoscope_baking:register_ingredient",
  fuel: "kaleidoscope_baking:register_fuel",
  foodEffect: "kaleidoscope_baking:register_food_effect",
  bulkBegin: "kaleidoscope_baking:bulk_begin",
  bulkChunk: "kaleidoscope_baking:bulk_chunk",
  bulkEnd: "kaleidoscope_baking:bulk_end",
  displayRule: "kaleidoscope_baking:register_display_rule",
  query: "kaleidoscope_baking:query_ingredient",
  info: "kaleidoscope_baking:ingredient_info",
  caffeine: "kaleidoscope_baking:caffeine_adjust"
});

/** All kaleidoscope:* tags of an item: runtime/built-in + its own item JSON tags. */
export function ingredientTags(id) {
  const tags = new Set(registeredTagsFor(id));
  try { for (const t of new ItemStack(id, 1).getTags()) if (t.startsWith("kaleidoscope:")) tags.add(t); } catch {}
  return [...tags].sort();
}

function adjustCaffeine(msg) {
  if (Number(msg?.api) !== 1) return;
  const delta = Math.max(-10, Math.min(10, Math.floor(Number(msg.delta) || 0)));
  const who = String(msg.player ?? "");
  for (const p of world.getAllPlayers()) {
    if (p.name !== who && p.id !== who) continue;
    try {
      const v = Math.max(0, (Number(p.getDynamicProperty("kaleidoscope_baking:caffeine")) || 0) + delta);
      p.setDynamicProperty("kaleidoscope_baking:caffeine", v || undefined);
    } catch {}
  }
}

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
  [KB_EVENTS.fuel]: registerFuel,
  [KB_EVENTS.foodEffect]: registerFoodEffect,
  [KB_EVENTS.displayRule]: registerDisplayRule
};

/** Dispatch one registration; returns the handler result. */
export function dispatch(id, payload) {
  const handler = HANDLERS[id];
  if (!handler) return { ok: false, reason: "event" };
  const result = handler(payload);
  if (!result.ok) console.warn(`[Kaleidoscope Baking] Rejected ${id} (${result.reason}).`);
  return result;
}

system.afterEvents.scriptEventReceive.subscribe(ev => {
  try {
    if (ev.id === KB_EVENTS.ping) { sendReady(); return; }
    if (ev.id === KB_EVENTS.query) {
      const msg = JSON.parse(String(ev.message ?? "{}"));
      const id = cleanId(msg?.id);
      if (!id) return;
      const reply = cleanId(msg?.reply) || KB_EVENTS.info;
      system.sendScriptEvent(reply, JSON.stringify({ api: KB_API_VERSION, id, tags: ingredientTags(id) }));
      return;
    }
    if (ev.id === KB_EVENTS.caffeine) { adjustCaffeine(JSON.parse(String(ev.message ?? "{}"))); return; }
    if (ev.id === KB_EVENTS.bulkBegin) { bulkBegin(JSON.parse(String(ev.message ?? ""))); return; }
    if (ev.id === KB_EVENTS.bulkChunk) { bulkChunk(ev.message); return; }
    if (ev.id === KB_EVENTS.bulkEnd) {
      const res = bulkEnd(JSON.parse(String(ev.message ?? "")));
      if (!res.ok) { console.warn(`[Kaleidoscope Baking] Bulk transfer failed (${res.reason}).`); return; }
      if (Number(res.data?.api) !== 1 || !Array.isArray(res.data.registrations)) return;
      for (const r of res.data.registrations.slice(0, 4096)) if (r && HANDLERS[r.event]) dispatch(r.event, r.payload);
      return;
    }
    if (HANDLERS[ev.id]) dispatch(ev.id, JSON.parse(String(ev.message ?? "")));
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
