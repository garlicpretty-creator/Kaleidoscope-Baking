// ## Kaleidoscope script role: Optional-pack integration (series compat runtime).
// ============================================================================
// Implements the "lead pack" rules (proposal §3.5.5) at runtime:
//   1. recipes accept the lead pack's item wherever Baking's item is expected (aliases;
//      the lead item inherits Baking's ingredient tags)
//   2. everything Baking hands out (stations, harvests) is the lead pack's version
//   3. Baking plant blocks in the world turn into the lead pack's plant on random tick,
//      keeping the growth stage — only while the world setting `auto_convert` is on
//   4. items in inventories are never converted (nothing can be lost)
// Activation is detected from which items exist (ItemTypes): a listed id that the lead pack
// does not have never matches (series.data.js says which ids are checked against the real packs).
// ============================================================================
import { BlockPermutation, BlockTypes, ItemTypes, system, world } from "@minecraft/server";
import { REVERSE_REGISTRATIONS, SOURCE } from "./reverse.data.js";
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

// 1.1: reverse registrations. Baking's by-products go into a series pack's own API once that
// pack says it is there (the contracts are in reverse.data.js). Each registration is sent once
// per world session: both receivers keep it for the session and a script reload restarts every
// pack together.
const reverseSent = new Set();

/** Handles a series pack's api_ready; returns how many registrations went out (exported for tests). */
export function onSeriesReady(id, message) {
  const due = REVERSE_REGISTRATIONS.filter(r => r.readyEvent === id && !reverseSent.has(r.event));
  if (!due.length) return 0;
  let info;
  try { info = JSON.parse(String(message ?? "")); } catch { return 0; }
  if (Number(info?.api) !== 1) return 0;
  const capabilities = Array.isArray(info.capabilities) ? info.capabilities : [];
  let sent = 0;
  for (const r of due) {
    if (!capabilities.includes(r.needs)) continue;
    reverseSent.add(r.event);
    try { system.sendScriptEvent(r.event, JSON.stringify(r.payload)); sent++; } catch {}
  }
  return sent;
}

/** A pack's answer to a registration (Ranching's api_result): a refusal of one of ours is worth a log line. */
function onSeriesResult(message) {
  let result;
  try { result = JSON.parse(String(message ?? "")); } catch { return; }
  // The answer goes to every add-on: other packs' results are none of Baking's business.
  if (result?.ok !== false || typeof result.id !== "string" || !result.id.startsWith(`${SOURCE}:`)) return;
  console.warn(`[Kaleidoscope Baking] ${result.event} ${result.id} was refused: ${result.error}`);
}

system.afterEvents.scriptEventReceive.subscribe(ev => {
  if (REVERSE_REGISTRATIONS.some(r => r.resultEvent === ev.id)) onSeriesResult(ev.message);
  else onSeriesReady(ev.id, ev.message);
}, { namespaces: [...new Set(REVERSE_REGISTRATIONS.map(r => r.readyEvent.split(":")[0]))] });

// The packs announce api_ready by themselves shortly after load (Fishing after 10 ticks, Ranching
// 20 ticks after world load). Should that have been missed, ask once; without the pack nobody answers.
onWorldReady(() => {
  system.runTimeout(() => {
    for (const ping of new Set(REVERSE_REGISTRATIONS.filter(r => !reverseSent.has(r.event)).map(r => r.ping))) {
      try { system.sendScriptEvent(ping, SOURCE); } catch {}
    }
  }, 60);
});
