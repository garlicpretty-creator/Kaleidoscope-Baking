// ============================================================================
// Kaleidoscope Baking: main.js
// Minimal bootstrap. Baking is an ADDON to Kaleidoscope Cookery and a HOST for its own
// Baking API (see scripts/ARCHITECTURE.md).
// ============================================================================
import { system } from "@minecraft/server";
import "./api/bus.js";
import "./compat/index.js";
import "./integrations/cookery.js";
import "./events/consumption.js";
import "./events/grassDrops.js";
import { ovenComponent } from "./custom_components/oven.js";
import { mixingBowlComponent } from "./custom_components/mixingBowl.js";
import { proofingBasketComponent } from "./custom_components/proofingBasket.js";
import { decoratingStandComponent } from "./custom_components/decoratingStand.js";
import { espressoMachineComponent } from "./custom_components/espressoMachine.js";
import { pourOverStandComponent } from "./custom_components/pourOverStand.js";
import { drinkShakerComponent } from "./custom_components/drinkShaker.js";
import { dessertComponent } from "./custom_components/dessert.js";
import { barkComponent, herbPlanterComponent, plantComponent, treeComponent } from "./custom_components/plants.js";

export const BLOCK_COMPONENTS = Object.freeze({
  "kaleidoscope_baking:oven": ovenComponent,
  "kaleidoscope_baking:mixing_bowl": mixingBowlComponent,
  "kaleidoscope_baking:proofing_basket": proofingBasketComponent,
  "kaleidoscope_baking:decorating_stand": decoratingStandComponent,
  "kaleidoscope_baking:espresso_machine": espressoMachineComponent,
  "kaleidoscope_baking:pour_over_stand": pourOverStandComponent,
  "kaleidoscope_baking:drink_shaker": drinkShakerComponent,
  "kaleidoscope_baking:dessert": dessertComponent,
  "kaleidoscope_baking:plant": plantComponent,
  "kaleidoscope_baking:tree": treeComponent,
  "kaleidoscope_baking:bark": barkComponent,
  "kaleidoscope_baking:herb_planter": herbPlanterComponent
});

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  for (const [name, component] of Object.entries(BLOCK_COMPONENTS)) blockComponentRegistry.registerCustomComponent(name, component);
});
