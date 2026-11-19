// ## Kaleidoscope script role: Optional-pack integration (series compat runtime).
// ============================================================================
// Implements the "lead pack" rules (proposal §3.5.5) at runtime:
//   1. recipes accept the lead pack's item wherever Baking's item is expected (aliases;
//      the lead item inherits Baking's ingredient tags)
//   2. everything Baking hands out (stations, harvests) is the lead pack's version
//   3. Baking plant blocks in the world turn into the lead pack's plant on random tick,
//      keeping the growth stage — only while the world setting `auto_convert` is on
//   4. items in inventories are never converted (nothing can be lost)
// Activation is detected from which items exist (ItemTypes); unknown ids never match, so
// the placeholder namespaces in series.data.js are harmless until real ids are filled in.
// ============================================================================
import { BlockPermutation, BlockTypes, ItemTypes, system, world } from "@minecraft/server";
import { REVERSE_REGISTRATIONS } from "./reverse.data.js";
import { SERIES_TAGS } from "./series.data.js";
import { resolveEquivalents, mapGrowth } from "../api/compat.js";
import { setIngredientAliases, registerIngredient } from "../api/ingredients.js";
import { onWorldReady, setOutputMapper } from "../utils/runtime.js";
import { ItemStack } from "@minecraft/server";

export const AUTO_CONVERT_PROP = "kaleidoscope_baking:auto_convert";
let active = { items: new Map(), aliases: new Map(), blocks: new Map(), leaders: new Set() };

export function autoConvertEnabled() {
  try { return world.getDynamicProperty(AUTO_CONVERT_PROP) !== false; } catch { return true; }
}
export function setAutoConvert(on) {
  try { world.setDynamicProperty(AUTO_CONVERT_PROP, !!on); } catch {}
}

function exists(id, kind) {
  try { return kind === "block" ? !!BlockTypes.get(id) : !!ItemTypes.get(id); } catch { return false; }
}

onWorldReady(() => {
  for (const t of SERIES_TAGS) registerIngredient({ api: 1, source: "kaleidoscope_baking_compat", id: t.id, tags: t.tags });
  active = resolveEquivalents(exists);
  if (!active.items.size) return;
  setIngredientAliases(active.aliases);
  // Lead items also get Baking's runtime ingredient tags (so #kaleidoscope:fruit etc. match
  // even if the lead pack forgot to tag them).
  for (const [baking, primary] of active.items) {
    let tags = [];
    try { tags = new ItemStack(baking, 1).getTags().filter(x => x.startsWith("kaleidoscope:")); } catch {}
    if (tags.length) registerIngredient({ api: 1, source: "kaleidoscope_baking_compat", id: primary, tags });
  }
  setOutputMapper(id => active.items.get(id) ?? id);
  console.log(`[Kaleidoscope Baking] Series compat active: ${[...active.leaders].join(", ")} (${active.items.size} items).`);
});

/**
 * Called by plant blocks on random tick. Converts the block in place when a lead pack owns
 * this plant and the setting is on. Returns true if the block was converted.
 */
export function maybeConvertPlant(block, growthState) {
  const m = active.blocks.get(block.typeId);
  if (!m || !autoConvertEnabled()) return false;
  let stage = 0;
  try { stage = Number(block.permutation.getState(growthState)) || 0; } catch {}
  try {
    let perm = BlockPermutation.resolve(m.primary);
    try { perm = perm.withState(m.primaryState, mapGrowth(stage, m.bakingMax, m.primaryMax)); } catch {}
    block.setPermutation(perm);
    return true;
  } catch { return false; }
}

// 1.1: reverse registrations — send Baking's by-products into a series pack's API once that
// pack announces itself (see reverse.data.js; event names are placeholders until confirmed).
const reverseSent = new Set();
system.afterEvents.scriptEventReceive.subscribe(ev => {
  const due = REVERSE_REGISTRATIONS.filter(r => r.readyEvent === ev.id);
  if (!due.length || reverseSent.has(ev.id)) return;
  reverseSent.add(ev.id);
  for (const r of due) try { system.sendScriptEvent(r.event, JSON.stringify(r.payload)); } catch {}
});
