// ## Kaleidoscope script role: Gameplay events (eating / drinking).
// ============================================================================
// When a player finishes eating or drinking (inventory or placed dessert):
//   - item effects from api/effects.js (built-in table + addon registrations)
//   - caffeine: +N per coffee; 3-4 = palpitations, 5+ = severe (proposal §3.4.5);
//     positive coffee effects stop while palpitating; calm drinks reduce it;
//     the level falls by 1 every minute
//   - hand-shaken drinks: sweetness adds saturation, ice / hot adds a small effect
//   - afternoon tea: a dessert and a drink within 30 s of each other gives a bonus
// No text: palpitations are a heartbeat only the player hears (faster + louder when severe,
// with a brief red flash), the nausea / weakness effects themselves, and a slow soft beat when
// it calms down. Afternoon tea is a chime, heart particles and the absorption hearts.
// ============================================================================
import { system, world } from "@minecraft/server";
import { getFoodEffect } from "../api/effects.js";
import { CAFFEINE_DECAY_TICKS, SWEETNESS_SATURATION, drinkCaffeine } from "../api/stationLogic.js";
import { onWorldReady, playerSound } from "../utils/runtime.js";

export const CAFFEINE_PROP = "kaleidoscope_baking:caffeine";
export const SWEET_PROP = "kaleidoscope_baking:sweet";
export const ICE_PROP = "kaleidoscope_baking:ice";
const TEA_TIME_WINDOW = 600;
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

function heartbeat(player, pitch, volume) {
  playerSound(player, "mob.warden.heartbeat", pitch, volume);
}
function flash(player, red, green, blue) {
  try {
    player.camera.fade({ fadeColor: { red, green, blue }, fadeTime: { fadeInTime: 0.1, holdTime: 0.1, fadeOutTime: 0.6 } });
  } catch {}
}
function around(player, id) {
  try {
    const l = player.location;
    player.dimension.spawnParticle(id, { x: l.x, y: l.y + 1.8, z: l.z });
  } catch {}
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

/** Apply everything Baking does when `itemId` (optionally the consumed stack) is consumed. */
export function applyConsumption(player, itemId, stack) {
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
    heartbeat(player, 1.5, 1);
    flash(player, 0.6, 0, 0);
  } else if (c.stage === 1) {
    effect(player, "nausea", 10);
    heartbeat(player, 1.2, 0.8);
  } else if (fx.reduces && before >= 3 && c.level < 3) {
    heartbeat(player, 0.8, 0.4);
    around(player, "minecraft:villager_happy");
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
    if (other !== undefined && now - other <= TEA_TIME_WINDOW) {
      feed(player, 2, 0.6);
      effect(player, "absorption", 30);
      playerSound(player, "random.levelup", 1.6, 0.5);
      around(player, "minecraft:heart_particle");
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
