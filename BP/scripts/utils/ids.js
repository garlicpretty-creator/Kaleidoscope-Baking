// ## Kaleidoscope script role: Small reusable helpers (pure; no @minecraft imports).
// Shared validation helpers used by every public registration path. Keeping them pure
// lets tests/ exercise the API contract with plain Node.

const ID_RE = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;
const TAG_RE = /^#[a-z0-9_.-]+:[a-z0-9_./-]+$/;

/** Namespaced identifier ("ns:path") or "" when invalid. */
export function cleanId(value) {
  const s = String(value ?? "").trim();
  return ID_RE.test(s) ? s : "";
}

/** Ingredient spec: either a namespaced id or a "#ns:tag" reference. "" when invalid. */
export function cleanSpec(value) {
  const s = String(value ?? "").trim();
  if (TAG_RE.test(s)) return s;
  return cleanId(s);
}

export function isTagSpec(spec) {
  return typeof spec === "string" && spec.startsWith("#");
}

export function positiveInt(value, fallback = 1, max = 64) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
}

export function nonnegativeInt(value, fallback = 0, max = 72000) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback;
}

/** `source` only namespaces registrations so two addons cannot overwrite each other. */
export function sourceName(value) {
  return String(value ?? "unknown").replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 96) || "unknown";
}

/** Deterministic ordering helper: iterate a Map by key so load order never matters. */
export function orderedValues(map) {
  return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, v]) => v);
}
