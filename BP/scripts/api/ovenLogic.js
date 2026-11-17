// ## Kaleidoscope script role: Station rules (pure; no @minecraft imports).
// ============================================================================
// Oven state machine
// ----------------------------------------------------------------------------
// State (persisted as JSON by the runtime):
//   { facing, fuel, slots:[ {recipe, input, mold, progress} | null ] }
// Each slot bakes independently. Phases by progress:
//   [0, time)                         -> "baking"
//   [time, time + perfectWindow)      -> "perfect"   (take out now for the real result)
//   [time + perfectWindow, ...)       -> "burnt"     (stops; becomes burntResult)
// Fuel only burns while at least one slot is baking or perfect, so an idle oven never
// wastes fuel, but leaving a finished cake inside keeps the fire going and burns it.
// ============================================================================

export const OVEN_SLOTS = 4;
export const MAX_FUEL_TICKS = 64000;

export function emptyOvenState(facing = "south") {
  return { facing, fuel: 0, slots: new Array(OVEN_SLOTS).fill(null) };
}

/** Defensive load: tolerate missing/old fields so a bad record never crashes the oven. */
export function normalizeOvenState(raw, facing = "south") {
  const s = emptyOvenState(typeof raw?.facing === "string" ? raw.facing : facing);
  s.fuel = Math.max(0, Math.min(MAX_FUEL_TICKS, Math.floor(Number(raw?.fuel) || 0)));
  const slots = Array.isArray(raw?.slots) ? raw.slots : [];
  for (let i = 0; i < OVEN_SLOTS; i++) {
    const v = slots[i];
    if (v && typeof v.recipe === "string" && typeof v.input === "string") {
      s.slots[i] = {
        recipe: v.recipe,
        input: v.input,
        mold: typeof v.mold === "string" ? v.mold : "",
        progress: Math.max(0, Math.floor(Number(v.progress) || 0))
      };
    }
  }
  return s;
}

export function phaseOf(slot, recipe) {
  if (!slot) return "empty";
  if (!recipe) return "unknown"; // recipe's addon was removed; input can still be retrieved
  if (slot.progress < recipe.time) return "baking";
  if (slot.progress < recipe.time + recipe.perfectWindow) return "perfect";
  return "burnt";
}

export function freeSlot(state) {
  return state.slots.findIndex(s => s === null);
}

/**
 * Advance the oven by `dt` ticks. `lookup(recipeId)` returns a normalized recipe.
 * Returns {lit, changed, events:[{slot, phase}]} where events report phase transitions.
 */
export function tickOven(state, dt, lookup) {
  const events = [];
  const active = [];
  state.slots.forEach((slot, i) => {
    const p = phaseOf(slot, lookup(slot?.recipe));
    if (p === "baking" || p === "perfect") active.push(i);
  });
  if (!active.length || state.fuel <= 0) return { lit: false, changed: false, events };
  const step = Math.min(dt, state.fuel);
  state.fuel -= step;
  for (const i of active) {
    const slot = state.slots[i];
    const recipe = lookup(slot.recipe);
    const before = phaseOf(slot, recipe);
    slot.progress += step;
    const after = phaseOf(slot, recipe);
    if (after !== before) events.push({ slot: i, phase: after });
  }
  return { lit: state.fuel > 0, changed: true, events };
}

/** Is the fire burning right now (for the lit texture / particles)? */
export function isLit(state, lookup) {
  if (state.fuel <= 0) return false;
  return state.slots.some(s => {
    const p = phaseOf(s, lookup(s?.recipe));
    return p === "baking" || p === "perfect";
  });
}

/**
 * What an emptied slot yields. Molds always come back.
 *   perfect -> recipe.result x count     burnt -> recipe.burntResult x 1
 *   baking/unknown (aborted) -> the raw input back
 */
export function slotYield(slot, recipe) {
  const out = [];
  if (!slot) return out;
  const p = phaseOf(slot, recipe);
  if (p === "perfect") out.push({ id: roastResult(slot, recipe), count: recipe.count });
  else if (p === "burnt") out.push({ id: recipe.burntResult, count: 1 });
  else out.push({ id: slot.input, count: 1 });
  if (slot.mold) out.push({ id: slot.mold, count: 1 });
  return out;
}

/** Roasting recipes split the perfect window into thirds: light, medium, dark. */
export function roastResult(slot, recipe) {
  if (!recipe.roast) return recipe.result;
  const into = slot.progress - recipe.time;
  const i = Math.max(0, Math.min(2, Math.floor((into / recipe.perfectWindow) * 3)));
  return recipe.roast[i];
}

export function percent(slot, recipe) {
  if (!slot || !recipe) return 0;
  return Math.min(100, Math.floor((slot.progress / recipe.time) * 100));
}
