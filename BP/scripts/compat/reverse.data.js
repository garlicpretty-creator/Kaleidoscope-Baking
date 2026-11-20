// ## Kaleidoscope script role: Optional-pack compatibility DATA (no logic), 1.1.
// Reverse registrations: Baking's by-products sent INTO the series packs' own Script Event APIs.
// compat/index.js sends each entry once per world session, after that pack's `readyEvent`
// arrives with `"api": 1` and the capability named in `needs`. Both packs announce api_ready by
// themselves shortly after load and again in answer to `ping`. Without the pack nothing answers
// and nothing is sent. Registrations last for the world session only, in both packs.
//
// The contracts below are the receiving packs' real ones, checked against their code:
//
// 漁歌 Fishing Voyage (scripts/fishing/registry.js, docs/API.md), capability "bait":
//   kaleidoscope_fishing:register_bait  {"api":1,"source":"<ns>","baits":[{"id":"<item>","biteFactor":0.5..1}]}
//   1..32 baits per message; the item must exist and must not be one of Fishing's own baits.
//   biteFactor multiplies the wait for a bite (lower is faster): Fishing's own baits are 0.5..0.8,
//   Ranching's 0.75..0.85, Harvest's 0.7..0.8. Fishing sends no reply; a refusal is a line in its log.
//
// 樂牧 Ranching (scripts/api/ranchingApi.js, docs/API.md), capability "register_feed":
//   kaleidoscope_ranching:register_feed  {"item":"<own item>","kind":"grass"|"grain"|"veg"|"mixed"|"concentrate","units":1..9}
//   One feed per message, no envelope; the item must be in the sender's own namespace. `kind`
//   decides who eats it from the trough: "veg" is vegetables and kitchen scraps (pigs and
//   rabbits), like Ranching's own apple and food waste (both veg, 1 unit).
//   Ranching answers every registration with kaleidoscope_ranching:api_result {event, id, ok, error?}.
//
// 豐收 Harvest and 草本 Herbal take no such registrations (Harvest's API is api_ping and
// catalog_request only; Herbal's is heat / recipe / adjuvant), so nothing is sent to them. Fruit
// pulp, bread crumbs and coffee grounds go in the vanilla composter (minecraft:compostable), and
// coffee grounds fertilise Baking's own plants (custom_components/plants.js).
import { SERIES } from "./series.data.js";

const ns = key => SERIES[key].namespace;
const kb = n => `kaleidoscope_baking:${n}`;
export const SOURCE = "kaleidoscope_baking";

export const REVERSE_REGISTRATIONS = Object.freeze([
  // Bread crumbs are classic groundbait, but a free by-product: as good as Fishing's shrimp (0.8).
  { series: "fishing", ping: `${ns("fishing")}:api_ping`, readyEvent: `${ns("fishing")}:api_ready`, needs: "bait",
    event: `${ns("fishing")}:register_bait`,
    payload: { api: 1, source: SOURCE, baits: [{ id: kb("bread_crumbs"), biteFactor: 0.8 }] } },
  // Fruit pulp is a kitchen scrap: pigs and rabbits eat it, one trough portion each.
  { series: "ranch", ping: `${ns("ranch")}:api_ping`, readyEvent: `${ns("ranch")}:api_ready`, needs: "register_feed",
    event: `${ns("ranch")}:register_feed`, resultEvent: `${ns("ranch")}:api_result`,
    payload: { item: kb("fruit_pulp"), kind: "veg", units: 1 } }
]);
