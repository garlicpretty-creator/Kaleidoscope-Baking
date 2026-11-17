// ## Kaleidoscope script role: Gameplay events (eating / drinking).
// ============================================================================
// When a player finishes eating or drinking (inventory or placed dessert):
//   - item effects from api/effects.js (built-in table + addon registrations)
//   - caffeine: +N per coffee; 3-4 = palpitations, 5+ = severe (proposal §3.4.5);
//     positive coffee effects stop while palpitating; calm drinks reduce it;
//     the level falls by 1 every minute
//   - hand-shaken drinks: sweetness adds saturation, ice / hot adds a small effect
//   - afternoon tea: a dessert and a drink within 30 s of each other gives a bonus
// ============================================================================
import { system, world } from "@minecraft/server";
import { getFoodEffect } from "../api/effects.js";
import { CAFFEINE_DECAY_TICKS, SWEETNESS_SATURATION, drinkCaffeine } from "../api/stationLogic.js";
import { actionBar, onWorldReady, t } from "../utils/runtime.js";

export const CAFFEINE_PROP = "kaleidoscope_baking:caffeine";
export const SWEET_PROP = "kaleidoscope_baking:sweet";
export const ICE_PROP = "kaleidoscope_baking:ice";
const MSG = "kaleidoscope_baking.msg.";
export const TEA_TIME_WINDOW = 600;
const COFFEE_EFFECTS = new Set(["haste", "speed"]);
const lastEaten = new Map(); // playerId -> {drink:tick, dessert:tick}

function getCaffeine(player) {
  try { return Number(player.getDynamicProperty(CAFFEINE_PROP)) || 0; } catch { return 0; }
}
function setCaffeine(player, v) {
  try { player.setDynamicProperty(CAFFEINE_PROP, v > 0 ? v : undefined); } catch {}
}
function effect(player, id, seconds, amplifier = 0) {
  try { player.addEffect(id, Math.max(1, Math.round(seconds * 20)), { amplifier, showParticles: false }); } catch {}
}

/** Add hunger / saturation directly (used by placed desserts, and for bonuses). */
export function feed(player, nutrition, saturationModifier) {
  try {
    const hunger = player.getComponent("minecraft:player.hunger");
    const sat = player.getComponent("minecraft:player.saturation");
    if (hunger) hunger.setCurrentValue(Math.min(hunger.currentValue + nutrition, hunger.effectiveMax));
    if (sat) sat.setCurrentValue(Math.min(sat.currentValue + nutrition * 2 * saturationModifier, sat.effectiveMax));
  } catch {}
}
export function isHungry(player) {
  try {
    const hunger = player.getComponent("minecraft:player.hunger");
    return !hunger || hunger.currentValue < hunger.effectiveMax;
  } catch { return true; }
}
function addSaturation(player, amount) {
  try {
    const sat = player.getComponent("minecraft:player.saturation");
    if (sat) sat.setCurrentValue(Math.min(sat.currentValue + amount, sat.effectiveMax));
  } catch {}
}

/**
 * Apply everything Baking does when `itemId` (optionally the consumed stack) is consumed.
 * opts.teaWindow: afternoon-tea window in ticks (the three-tier tea tray widens it to 60 s).
 */
export function applyConsumption(player, itemId, stack, opts = {}) {
  const fx = getFoodEffect(itemId);
  if (!fx) return;
  const before = getCaffeine(player);
  const c = drinkCaffeine(before, fx.caffeine, fx.reduces);
  if (c.level !== before) setCaffeine(player, c.level);

  for (const [id, seconds, amp] of fx.effects) {
    if (fx.caffeine > 0 && !c.positive && COFFEE_EFFECTS.has(id)) continue;
    effect(player, id, seconds, amp);
  }
  for (const id of fx.clear) try { player.removeEffect(id); } catch {}

  if (c.stage === 2) {
    effect(player, "nausea", 20); effect(player, "weakness", 15); effect(player, "slowness", 15);
    actionBar(player, t(`${MSG}caffeine.severe`, c.level));
  } else if (c.stage === 1) {
    effect(player, "nausea", 10);
    actionBar(player, t(`${MSG}caffeine.palpitations`, c.level));
  } else if (fx.reduces && before >= 3 && c.level < 3) {
    actionBar(player, t(`${MSG}caffeine.calm`, c.level));
  }

  // Hand-shaken drink customisation
  if (stack) {
    let sweet, ice;
    try { sweet = stack.getDynamicProperty(SWEET_PROP); ice = stack.getDynamicProperty(ICE_PROP); } catch {}
    if (typeof sweet === "string") {
      addSaturation(player, SWEETNESS_SATURATION[sweet] ?? 0);
      if (sweet === "stevia" || sweet === "none") effect(player, "regeneration", 4);
    }
    if (ice === "regular" || ice === "less" || ice === "light") effect(player, "speed", 20);
    else if (ice === "warm" || ice === "hot") effect(player, "regeneration", 5);
  }

  // Afternoon tea
  if (fx.category === "drink" || fx.category === "dessert") {
    const now = system.currentTick;
    const rec = lastEaten.get(player.id) ?? {};
    const other = fx.category === "drink" ? rec.dessert : rec.drink;
    if (other !== undefined && now - other <= (opts.teaWindow ?? TEA_TIME_WINDOW)) {
      feed(player, 2, 0.6);
      effect(player, "absorption", 30);
      actionBar(player, t(`${MSG}tea_time`));
      lastEaten.delete(player.id);
    } else {
      rec[fx.category] = now;
      lastEaten.set(player.id, rec);
    }
  }
}

world.afterEvents.itemCompleteUse.subscribe(ev => {
  const player = ev.source;
  const stack = ev.itemStack;
  if (!player || !stack || player.typeId !== "minecraft:player") return;
  applyConsumption(player, stack.typeId, stack);
});

// Caffeine wears off: -1 per minute for every online player.
onWorldReady(() => {
  system.runInterval(() => {
    for (const p of world.getAllPlayers()) {
      const c = getCaffeine(p);
      if (c > 0) setCaffeine(p, c - 1);
    }
  }, CAFFEINE_DECAY_TICKS);
});
