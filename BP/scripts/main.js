// ============================================================================
// Kaleidoscope Baking: main.js
// Minimal bootstrap. Baking is an ADDON to Kaleidoscope Cookery and a HOST for its own
// Baking API (see scripts/ARCHITECTURE.md).
// ============================================================================
import { system } from "@minecraft/server";
import "./api/bus.js";
import "./integrations/cookery.js";
import { ovenComponent } from "./custom_components/oven.js";
import { mixingBowlComponent } from "./custom_components/mixingBowl.js";

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("kaleidoscope_baking:oven", ovenComponent);
  blockComponentRegistry.registerCustomComponent("kaleidoscope_baking:mixing_bowl", mixingBowlComponent);
});
