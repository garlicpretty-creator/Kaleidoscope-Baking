// ## Kaleidoscope script role: Public extension/API contract (pure, 1.1).
// `kaleidoscope_baking:register_display_rule` {api:1, source, id, mode:"allow"|"deny"}
// decides whether an item may be put into Baking's display furniture (bread display,
// pastry case, tea tray). By default any item with food values is allowed.
import { cleanId, orderedValues, sourceName } from "../utils/ids.js";

const rules = new Map();

export function registerDisplayRule(payload) {
  if (!payload || Number(payload.api) !== 1) return { ok: false, reason: "api_version" };
  const id = cleanId(payload.id);
  const mode = String(payload.mode ?? "");
  if (!id || !["allow", "deny"].includes(mode)) return { ok: false, reason: "schema" };
  rules.set(`${sourceName(payload.source)}|${id}`, { id, mode });
  return { ok: true, id, mode };
}

/** "allow" | "deny" | undefined (no rule: caller decides) — last rule by key wins. */
export function displayMode(id) {
  let mode;
  for (const r of orderedValues(rules)) if (r.id === id) mode = r.mode;
  return mode;
}

export function _resetDisplayRulesForTests() { rules.clear(); }
