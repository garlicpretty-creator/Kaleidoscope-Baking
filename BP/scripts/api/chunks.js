// ## Kaleidoscope script role: Public extension/API contract (pure).
// Bulk transfer over Script Events (each message is limited to 2048 characters).
//
//   kaleidoscope_baking:bulk_begin  {"api":1,"source":"my_addon","id":"recipes","chunks":3}
//   kaleidoscope_baking:bulk_chunk  "<source>\n<id>\n<index>\n<raw data>"
//   kaleidoscope_baking:bulk_end    {"api":1,"source":"my_addon","id":"recipes"}
//
// The concatenated data must be JSON: {"api":1,"registrations":[{"event":"kaleidoscope_baking:register_recipe","payload":{...}}, ...]}
// The same format is used by Baking to publish its guidebook to Cookery (different events).
import { sourceName } from "../utils/ids.js";

export const MAX_CHUNKS = 256;
export const CHUNK_SIZE = 1600;
const pending = new Map();

const keyOf = (source, id) => `${sourceName(source)}|${String(id ?? "").slice(0, 64)}`;

export function bulkBegin(msg) {
  const chunks = Math.floor(Number(msg?.chunks));
  if (Number(msg?.api) !== 1 || !(chunks >= 1 && chunks <= MAX_CHUNKS)) return { ok: false, reason: "schema" };
  pending.set(keyOf(msg.source, msg.id), { chunks, parts: new Array(chunks).fill(undefined) });
  return { ok: true };
}

export function bulkChunk(text) {
  const parts = String(text ?? "").split("\n");
  if (parts.length < 4) return { ok: false, reason: "schema" };
  const [source, id, index] = parts;
  const p = pending.get(keyOf(source, id));
  const i = Math.floor(Number(index));
  if (!p || !(i >= 0 && i < p.chunks)) return { ok: false, reason: "unknown" };
  p.parts[i] = parts.slice(3).join("\n");
  return { ok: true };
}

/** Returns {ok, data} with the parsed JSON once every chunk arrived. */
export function bulkEnd(msg) {
  const key = keyOf(msg?.source, msg?.id);
  const p = pending.get(key);
  pending.delete(key);
  if (!p) return { ok: false, reason: "unknown" };
  if (p.parts.some(x => x === undefined)) return { ok: false, reason: "missing_chunks" };
  try { return { ok: true, data: JSON.parse(p.parts.join("")) }; } catch { return { ok: false, reason: "json" }; }
}

/** Split a JSON-able value into chunk payload strings for publishing. */
export function toChunks(value, size = CHUNK_SIZE) {
  const s = JSON.stringify(value);
  const out = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out.length ? out : ["{}"];
}
