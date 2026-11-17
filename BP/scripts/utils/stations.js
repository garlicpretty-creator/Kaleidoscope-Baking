// ## Kaleidoscope script role: Shared runtime helpers for small block stations.
// Per-block JSON state + an optional shared ticker for stations that change over time
// (proofing basket, espresso machine). Ticking stations keep an index so only blocks
// that actually hold something are visited; unloaded chunks simply pause.
import { system, world } from "@minecraft/server";
import { locKey, onWorldReady, parseLocKey, readJson, safeBlock, writeJson } from "./runtime.js";

export function stationKey(prefix, block) {
  return locKey(prefix, block.dimension.id, block);
}

export function loadStation(prefix, block, normalize) {
  return normalize(readJson(stationKey(prefix, block)));
}

/** Saves the state, or deletes it when `isEmpty(state)` (keeps the world file small). */
export function saveStation(prefix, block, state, isEmpty) {
  const key = stationKey(prefix, block);
  writeJson(key, isEmpty(state) ? undefined : state);
  return key;
}

// ---------------------------------------------------------------------------
// Ticker
// ---------------------------------------------------------------------------
const tickers = new Map(); // prefix -> {blockId, every, fn, active:Map(key -> {dimensionId, loc})}

/**
 * fn(block, state) -> {state, keep}   called every `every` ticks while tracked & loaded.
 * keep=false stops ticking (e.g. finished); the state is saved either way.
 */
export function registerTicker(prefix, blockId, every, normalize, isEmpty, fn) {
  const t = { blockId, every, fn, normalize, isEmpty, active: new Map() };
  tickers.set(prefix, t);
  onWorldReady(() => {
    for (const key of readJson(`${prefix}_index`) ?? []) {
      const p = parseLocKey(prefix, key);
      if (p) t.active.set(key, p);
    }
    system.runInterval(() => runTicker(prefix, t), every);
  });
}

function saveIndex(prefix, t) { writeJson(`${prefix}_index`, [...t.active.keys()]); }

export function trackStation(prefix, block) {
  const t = tickers.get(prefix);
  if (!t) return;
  const key = stationKey(prefix, block);
  if (!t.active.has(key)) {
    t.active.set(key, { dimensionId: block.dimension.id, loc: { x: block.x, y: block.y, z: block.z } });
    saveIndex(prefix, t);
  }
}

export function untrackStation(prefix, block) {
  const t = tickers.get(prefix);
  if (t?.active.delete(stationKey(prefix, block))) saveIndex(prefix, t);
}

function runTicker(prefix, t) {
  let changed = false;
  for (const [key, o] of [...t.active]) {
    let dimension;
    try { dimension = world.getDimension(o.dimensionId); } catch { continue; }
    const block = safeBlock(dimension, o.loc);
    if (!block) continue;
    if (block.typeId !== t.blockId) { t.active.delete(key); changed = true; continue; }
    const state = t.normalize(readJson(key));
    let res;
    try { res = t.fn(block, state); } catch (e) { console.warn(`[Kaleidoscope Baking] ${prefix} tick failed: ${e}`); continue; }
    writeJson(key, t.isEmpty(res.state) ? undefined : res.state);
    if (!res.keep || t.isEmpty(res.state)) { t.active.delete(key); changed = true; }
  }
  if (changed) saveIndex(prefix, t);
}
