// ## Kaleidoscope script role: Small reusable helper (pure).
// ============================================================================
// 3x3x3 oven footprint
// ----------------------------------------------------------------------------
// The oven is ONE block id (`kaleidoscope_baking:oven`) placed 27 times. Each copy carries
// `kaleidoscope_baking:oven_part` = index of its offset from the CONTROLLER, which is the
// bottom-centre block (the block the player actually places).
//
//   index = dy*9 + (dz+1)*3 + (dx+1)      dx,dz in -1..1, dy in 0..2
//
// Offsets are in WORLD axes (not rotated). Facing only decides which outer blocks show
// the door / firebox textures, so the same index always means the same world offset.
// This file is also imported by tools/gen_oven_block.mjs, so the block JSON permutations
// and the runtime can never disagree.
// ============================================================================

export const OVEN_ID = "kaleidoscope_baking:oven";
export const PART_STATE = "kaleidoscope_baking:oven_part";
export const FACING_STATE = "kaleidoscope_baking:facing";
export const LIT_STATE = "kaleidoscope_baking:lit";

export const FACINGS = Object.freeze(["north", "south", "east", "west"]);
/** World-space unit vector pointing OUT of the oven's front for each facing. */
export const FRONT = Object.freeze({
  north: Object.freeze({ x: 0, z: -1 }),
  south: Object.freeze({ x: 0, z: 1 }),
  east: Object.freeze({ x: 1, z: 0 }),
  west: Object.freeze({ x: -1, z: 0 })
});

export function partIndex(dx, dy, dz) {
  return dy * 9 + (dz + 1) * 3 + (dx + 1);
}

export function partOffset(index) {
  const i = Math.floor(Number(index));
  if (!(i >= 0 && i <= 26)) return undefined;
  const dy = Math.floor(i / 9);
  const r = i % 9;
  return { dx: (r % 3) - 1, dy, dz: Math.floor(r / 3) - 1 };
}

export const CONTROLLER_PART = partIndex(0, 0, 0); // 4

/** Every part index, controller first (its value is the block's default state). */
export const ALL_PARTS = Object.freeze([
  CONTROLLER_PART,
  ...Array.from({ length: 27 }, (_, i) => i).filter(i => i !== CONTROLLER_PART)
]);

/** Door: front-centre, middle layer. */
export function doorPart(facing) {
  const f = FRONT[facing] ?? FRONT.south;
  return partIndex(f.x, 1, f.z);
}

/** Firebox: front-centre, bottom layer (lights up while baking). */
export function fireboxPart(facing) {
  const f = FRONT[facing] ?? FRONT.south;
  return partIndex(f.x, 0, f.z);
}

/** Chimney: top-centre. */
export const CHIMNEY_PART = partIndex(0, 2, 0);

/** Controller location from any part's location + its part index. */
export function controllerFrom(loc, index) {
  const o = partOffset(index);
  if (!o) return undefined;
  return { x: loc.x - o.dx, y: loc.y - o.dy, z: loc.z - o.dz };
}

/** All 27 world locations of an oven whose controller sits at `c`. */
export function footprint(c) {
  const out = [];
  for (const i of ALL_PARTS) {
    const o = partOffset(i);
    out.push({ index: i, x: c.x + o.dx, y: c.y + o.dy, z: c.z + o.dz });
  }
  return out;
}

/**
 * The oven's front faces the player who placed it. `dx/dz` = player position minus the
 * controller centre. Ties prefer the z axis (stable, deterministic).
 */
export function facingToward(dx, dz) {
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? "east" : "west";
  return dz < 0 ? "north" : "south";
}

/** Location just outside the door, where finished items pop out. */
export function doorOutside(c, facing) {
  const f = FRONT[facing] ?? FRONT.south;
  return { x: c.x + f.x * 2 + 0.5, y: c.y + 1.2, z: c.z + f.z * 2 + 0.5 };
}
