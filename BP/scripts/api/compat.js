// ## Kaleidoscope script role: Series compatibility rules (pure).
// Decides, from which items exist in the world, which Baking items are led by another
// Kaleidoscope pack, and exposes the resulting mappings. The runtime (compat/index.js)
// feeds it `exists(id)` and installs the results.
import { EQUIVALENTS, SERIES } from "../compat/series.data.js";

/** category -> series key that leads it */
export function leaderOf(category) {
  for (const [key, s] of Object.entries(SERIES)) if (s.leads.includes(category)) return key;
  return undefined;
}

/**
 * Resolve active equivalents.
 * Returns {items: Map(bakingId -> primaryId), aliases: Map(primaryId -> bakingId),
 *          blocks: Map(bakingBlock -> {primary, bakingMax, primaryState, primaryMax}), leaders:Set}
 */
export function resolveEquivalents(exists, table = EQUIVALENTS) {
  const items = new Map(), aliases = new Map(), blocks = new Map(), leaders = new Set();
  for (const e of table) {
    const lead = leaderOf(e.category);
    if (!lead) continue;
    const primary = (e.primary ?? []).find(id => safe(exists, id));
    if (!primary) continue;
    items.set(e.baking, primary);
    aliases.set(primary, e.baking);
    leaders.add(lead);
    if (e.block) {
      const pb = (e.block.primary ?? []).find(id => safe(exists, id, "block"));
      if (pb) blocks.set(e.block.baking, { primary: pb, bakingMax: e.block.bakingMax, primaryState: e.block.primaryState, primaryMax: e.block.primaryMax });
    }
  }
  return { items, aliases, blocks, leaders };
}

function safe(exists, id, kind = "item") {
  try { return !!exists(id, kind); } catch { return false; }
}

/** Scale a growth stage between two plants with different max stages. */
export function mapGrowth(stage, fromMax, toMax) {
  if (!(fromMax > 0) || !(toMax >= 0)) return 0;
  return Math.max(0, Math.min(toMax, Math.round((stage / fromMax) * toMax)));
}
