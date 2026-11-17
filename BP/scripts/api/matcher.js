// ## Kaleidoscope script role: Small reusable helper (pure).
// Shapeless matching of a station's contents against recipe slots.
// Each slot is a list of alternative specs (ids or #tags). Contents must fill every slot
// exactly once with nothing left over. Slots are few (<= 9), so a simple backtracking
// assignment is fast and, unlike greedy matching, never fails when a broad tag slot
// "steals" an item that a narrower slot needed.
import { matchesSlot } from "./ingredients.js";

export function matchShapeless(contents, slots) {
  if (!Array.isArray(contents) || !Array.isArray(slots)) return false;
  if (contents.length !== slots.length) return false;
  const used = new Array(contents.length).fill(false);
  // Narrow slots first: fewer candidate items means less branching.
  const order = slots
    .map((slot, i) => ({ i, n: contents.filter(id => matchesSlot(id, slot)).length }))
    .sort((a, b) => a.n - b.n);
  if (order.some(o => o.n === 0)) return false;
  const assign = k => {
    if (k === order.length) return true;
    const slot = slots[order[k].i];
    for (let j = 0; j < contents.length; j++) {
      if (used[j] || !matchesSlot(contents[j], slot)) continue;
      used[j] = true;
      if (assign(k + 1)) return true;
      used[j] = false;
    }
    return false;
  };
  return assign(0);
}
