// ## Kaleidoscope script role: Small runtime helper.
// Throttled Script Event sender. Registration bursts (hundreds of messages for Cookery
// recipes and the guidebook) are spread over ticks so no single tick does too much work.
import { system } from "@minecraft/server";

const PER_TICK = 24;
const queue = [];
let running = false;

export function enqueueEvent(id, message) {
  queue.push([id, message]);
  if (running) return;
  running = true;
  const h = system.runInterval(() => {
    for (let i = 0; i < PER_TICK && queue.length; i++) {
      const [eid, msg] = queue.shift();
      try { system.sendScriptEvent(eid, msg); } catch (e) { console.warn(`[Kaleidoscope Baking] send ${eid} failed: ${e}`); }
    }
    if (!queue.length) { running = false; system.clearRun(h); }
  }, 1);
}

export function pendingEvents() { return queue.length; }
