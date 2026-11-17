// ## Kaleidoscope script role: Animated station visuals (kaleidoscope_baking:station_visual).
// One invisible-to-physics entity sits on each station and shows what is in it and what it is doing
// (batter rising, whisk turning, dough swelling, cake turning, coffee streaming / dripping, shaker shaking).
// Same pattern as Cookery's millstone visual: found again by a position tag, turned with the block's facing,
// driven by entity properties the client animates (RP/entity/station_visual.entity.json). No text.
import { system } from "@minecraft/server";

export const VISUAL_ID = "kaleidoscope_baking:station_visual";
const NS = "kaleidoscope_baking";
export const KIND = Object.freeze({ bowl: 1, proof: 2, stand: 3, espresso: 4, pour: 5, shaker: 6 });
// Entity yaw for a block facing (model front is south / +z).
const YAW = { south: 0, west: 90, north: 180, east: -90 };

const motions = new Map(); // station tag -> latest motion stamp
const tagOf = b => `kb_vis:${b.dimension.id}:${b.x},${b.y},${b.z}`;
const centre = b => ({ x: b.x + 0.5, y: b.y, z: b.z + 0.5 });

function facingYaw(block) {
  try { return YAW[block.permutation.getState("minecraft:cardinal_direction")] ?? 0; } catch { return 0; }
}

function find(block) {
  const tag = tagOf(block);
  let keep;
  try {
    for (const e of block.dimension.getEntities({ type: VISUAL_ID, location: centre(block), maxDistance: 1.2 })) {
      let mine = false;
      try { mine = e.getTags().includes(tag); } catch {}
      if (!mine) continue;
      if (!keep) keep = e;
      else try { e.triggerEvent(`${NS}:despawn`); } catch { try { e.remove(); } catch {} }
    }
  } catch {}
  return keep;
}

/** The station's visual entity, spawned if missing. */
export function ensureVisual(block, kind) {
  let e = find(block);
  if (!e) {
    try {
      e = block.dimension.spawnEntity(VISUAL_ID, centre(block));
      e.addTag(tagOf(block));
    } catch { return undefined; }
  }
  try { e.setRotation({ x: 0, y: facingYaw(block) }); } catch {}
  try { if (e.getProperty(`${NS}:kind`) !== kind) e.setProperty(`${NS}:kind`, kind); } catch {}
  return e;
}

const TINT_RULES = [
  [1, /choc|cocoa|brownie|mocha/], [2, /matcha|mint|green_tea|pandan/], [3, /strawberr|raspberr|cherry|pink/],
  [6, /coffee|espresso/], [7, /caramel|brown_sugar|cinnamon|honey|maple/], [4, /egg|custard|lemon|butter|cheese/],
  [5, /cream|milk|white|coconut|meringue/]
];
/** Colour of mixed contents from item ids: the strongest-coloured ingredient wins. */
export function tintOf(ids) {
  const list = (ids ?? []).filter(Boolean).map(String);
  for (const [tint, re] of TINT_RULES) if (list.some(id => re.test(id))) return tint;
  return 0;
}

/** Shows what the station holds: fill 0..16 (0 hides it), tint 0..7, progress 0..1. */
export function showContents(block, kind, { fill = 0, tint = 0, progress = 0 } = {}) {
  const e = ensureVisual(block, kind);
  if (!e) return;
  const set = (k, v) => { try { if (e.getProperty(`${NS}:${k}`) !== v) e.setProperty(`${NS}:${k}`, v); } catch {} };
  set("fill", Math.max(0, Math.min(16, Math.round(fill))));
  set("tint", Math.max(0, Math.min(7, tint)));
  set("progress", Math.max(0, Math.min(1, Number(progress) || 0)));
}

/** Plays the station's motion for `ticks` (whisk, stream, drips, shake). */
export function playMotion(block, kind, ticks = 12) {
  const e = ensureVisual(block, kind);
  if (!e) return;
  try { e.setProperty(`${NS}:active`, true); } catch {}
  const key = tagOf(block);
  const stamp = (motions.get(key) ?? 0) + 1;
  motions.set(key, stamp);
  system.runTimeout(() => {
    if (motions.get(key) !== stamp) return; // a newer motion extended it
    motions.delete(key);
    try { if (e.isValid === undefined || e.isValid) e.setProperty(`${NS}:active`, false); } catch {}
  }, ticks);
}

/** Keeps the motion running (brewing) until stopMotion. */
export function setMotion(block, kind, on) {
  const e = ensureVisual(block, kind);
  try { if (e && e.getProperty(`${NS}:active`) !== on) e.setProperty(`${NS}:active`, on); } catch {}
}

export function removeVisual(block) {
  const e = find(block);
  if (e) try { e.triggerEvent(`${NS}:despawn`); } catch { try { e.remove(); } catch {} }
}

/** Steam over a hot drink or machine. */
export function steam(dimension, loc) {
  try { dimension.spawnParticle(`${NS}:steam`, loc); } catch {}
}
