// ## Kaleidoscope script role: Shared runtime helper (item display entities, 1.1).
// ============================================================================
// Shows an item on a block using the invisible `kaleidoscope_baking:display` entity, the
// same technique as Kaleidoscope Cookery's millstone item display: the entity has a single
// `rightitem` bone and holds the item in its main hand (set with `replaceitem`).
//
// Each display is identified by a tag `kb_disp:<dim>:<x>,<y>,<z>:<slot>` so a block can own
// several (bread display shows three). Rules:
//   - at most one entity per tag (extras are removed)
//   - syncDisplay(block, slot, undefined) removes it
//   - clearDisplays(location) removes every display of a block (call on break / explode)
//   - when a display entity loads but its block is gone, it removes itself
//   - `small: true` uses `kaleidoscope_baking:display_small` (same entity, smaller), for racks with many items
// ============================================================================
import { system, world } from "@minecraft/server";

export const DISPLAY_ID = "kaleidoscope_baking:display";
export const DISPLAY_SMALL_ID = "kaleidoscope_baking:display_small";
const DISPLAY_TYPES = new Set([DISPLAY_ID, DISPLAY_SMALL_ID]);
const SHOWING = "kb_disp_item:"; // second tag remembers the shown item to skip redundant commands

const tagOf = (dimension, loc, slot) => `kb_disp:${dimension.id}:${loc.x},${loc.y},${loc.z}:${slot}`;
const blockTagPrefix = (dimension, loc) => `kb_disp:${dimension.id}:${loc.x},${loc.y},${loc.z}:`;

function find(dimension, loc, prefix, radius = 2, type = undefined) {
  const out = [];
  for (const t of type ? [type] : DISPLAY_TYPES) {
    try {
      out.push(...dimension.getEntities({ type: t, location: { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 }, maxDistance: radius })
        .filter(e => e.getTags().some(tag => tag.startsWith(prefix))));
    } catch {}
  }
  return out;
}

function despawn(e) {
  try { e.triggerEvent("kaleidoscope_baking:despawn"); } catch { try { e.remove(); } catch {} }
}

/**
 * Show `itemId` for `slot` of `block` at `offset` (block-relative, e.g. {x:0.5, y:1, z:0.5}).
 * Pass itemId = undefined to remove that display.
 */
export function syncDisplay(block, slot, itemId, offset = { x: 0.5, y: 1.0, z: 0.5 }, { small = false } = {}) {
  const dimension = block.dimension;
  const loc = { x: block.x, y: block.y, z: block.z };
  const tag = tagOf(dimension, loc, slot);
  const type = small ? DISPLAY_SMALL_ID : DISPLAY_ID;
  const existing = find(dimension, loc, tag, 2, type);
  for (const extra of existing.slice(1)) despawn(extra);
  let e = existing[0];
  if (!itemId) { if (e) despawn(e); return; }
  const pos = { x: loc.x + offset.x, y: loc.y + offset.y, z: loc.z + offset.z };
  try {
    if (!e) {
      e = dimension.spawnEntity(type, pos);
      e.addTag(tag);
    } else {
      e.teleport(pos);
    }
    const shown = e.getTags().find(t => t.startsWith(SHOWING));
    if (shown !== SHOWING + itemId) {
      if (shown) e.removeTag(shown);
      e.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${itemId}`);
      e.addTag(SHOWING + itemId);
    }
  } catch {}
}

export function clearDisplays(dimension, loc) {
  for (const e of find(dimension, loc, blockTagPrefix(dimension, loc), 2.5)) despawn(e);
}

// Orphan cleanup: a display whose block no longer exists removes itself when it loads.
world.afterEvents?.entityLoad?.subscribe?.(({ entity }) => {
  if (!DISPLAY_TYPES.has(entity?.typeId)) return;
  system.run(() => {
    try {
      const t = entity.getTags().find(x => x.startsWith("kb_disp:"));
      const m = t?.match(/^kb_disp:(.+):(-?\d+),(-?\d+),(-?\d+):/);
      if (!m) { despawn(entity); return; }
      const b = world.getDimension(m[1]).getBlock({ x: +m[2], y: +m[3], z: +m[4] });
      if (b && (b.isAir || !b.typeId.startsWith("kaleidoscope_baking:"))) despawn(entity);
    } catch {}
  });
});
