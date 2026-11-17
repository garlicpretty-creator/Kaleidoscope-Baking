// ## Kaleidoscope script role: Optional-pack compatibility DATA (no logic), 1.1.
// Reverse registrations: Baking's by-products sent INTO the series packs' own APIs.
//
// !! EVENT NAMES AND PAYLOADS BELOW ARE PLACEHOLDERS !!
// The four packs' Script Event APIs are not known yet. Each entry is only sent after that
// pack announces itself on `readyEvent`, so a wrong guess is silent and harmless. Replace with
// the real event names / schemas once the series packs publish their APIs.
import { SERIES } from "./series.data.js";

const ns = key => SERIES[key].namespace;
const kb = n => `kaleidoscope_baking:${n}`;

export const REVERSE_REGISTRATIONS = Object.freeze([
  { series: "fishing", readyEvent: `${ns("fishing")}:api_ready`, event: `${ns("fishing")}:register_bait`,
    payload: { api: 1, source: "kaleidoscope_baking", item: kb("bread_crumbs"), power: 1 } },
  { series: "harvest", readyEvent: `${ns("harvest")}:api_ready`, event: `${ns("harvest")}:register_compost`,
    payload: { api: 1, source: "kaleidoscope_baking", item: kb("fruit_pulp"), chance: 0.85 } },
  { series: "harvest", readyEvent: `${ns("harvest")}:api_ready`, event: `${ns("harvest")}:register_fertilizer`,
    payload: { api: 1, source: "kaleidoscope_baking", item: kb("coffee_grounds"), stages: 1 } },
  { series: "herbal", readyEvent: `${ns("herbal")}:api_ready`, event: `${ns("herbal")}:register_fertilizer`,
    payload: { api: 1, source: "kaleidoscope_baking", item: kb("coffee_grounds"), stages: 1 } },
  { series: "ranch", readyEvent: `${ns("ranch")}:api_ready`, event: `${ns("ranch")}:register_feed`,
    payload: { api: 1, source: "kaleidoscope_baking", item: kb("fruit_pulp"), animals: ["minecraft:pig", "minecraft:chicken"] } }
]);
