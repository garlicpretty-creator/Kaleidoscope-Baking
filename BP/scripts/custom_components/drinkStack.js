// ## Kaleidoscope script role: Custom block component (placed mug drinks, up to 4 on one block).
// Mirrors Cookery's teacup stacks: a mug drink placed on the ground becomes a block; using the same drink on it adds
// a mug (max 4), an empty hand takes one back, breaking it drops every mug. No text: the cups themselves and the
// clink of ceramic are the feedback.
import { consumeHeld, giveItems, heldItem, isCreative, sound, spawnItems } from "../utils/runtime.js";

export const CUP_STATE = "kaleidoscope_baking:cup_count";
const MAX = 4;

function cupsOf(perm) {
  try { return Math.max(1, Math.min(MAX, Number(perm.getState(CUP_STATE)) || 1)); } catch { return 1; }
}

function clink(block, pitch = 1) {
  // same ceramic sound Cookery uses for its teacup stacks
  sound(block.dimension, "break.decorated_pot", { x: block.x + 0.5, y: block.y + 0.3, z: block.z + 0.5 }, 0.5, pitch);
}

export const drinkStackComponent = {
  onPlayerInteract({ block, player }) {
    if (!player) return;
    const id = block.typeId;
    const cups = cupsOf(block.permutation);
    const held = heldItem(player);
    if (held?.typeId === id) {
      if (cups >= MAX) return;
      try { block.setPermutation(block.permutation.withState(CUP_STATE, cups + 1)); } catch { return; }
      consumeHeld(player, 1);
      clink(block, 1.2);
      return;
    }
    if (held) return;
    giveItems(player, id, 1);
    clink(block, 0.9);
    if (cups <= 1) { try { block.setType("minecraft:air"); } catch {} }
    else try { block.setPermutation(block.permutation.withState(CUP_STATE, cups - 1)); } catch {}
  },
  onPlayerBreak({ block, brokenBlockPermutation, player }) {
    if (player && isCreative(player)) return;
    const cups = cupsOf(brokenBlockPermutation);
    spawnItems(block.dimension, { x: block.x + 0.5, y: block.y + 0.3, z: block.z + 0.5 }, brokenBlockPermutation.type.id, cups);
  }
};
