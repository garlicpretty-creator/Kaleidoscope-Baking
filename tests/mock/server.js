// Minimal in-memory stand-in for @minecraft/server, enough to drive Baking's block
// components end-to-end under Node. Block/item metadata is read from the real BP JSON so
// the mock can't drift from the pack (default states, tags, stack sizes).
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BP = fileURLToPath(new URL("../../BP/", import.meta.url));
const json = p => JSON.parse(readFileSync(p, "utf8"));

const ITEM_META = new Map();
for (const f of readdirSync(BP + "items")) {
  const d = json(BP + "items/" + f)["minecraft:item"];
  const c = d.components;
  ITEM_META.set(d.description.identifier, { stack: c["minecraft:max_stack_size"] ?? 64, tags: c["minecraft:tags"]?.tags ?? [] });
}
const VANILLA = {
  "minecraft:coal": [], "minecraft:oak_log": ["minecraft:logs"], "minecraft:lava_bucket": [], "minecraft:bucket": [],
  "minecraft:milk_bucket": [], "minecraft:water_bucket": [], "minecraft:egg": [], "minecraft:sugar": [],
  "minecraft:potato": [], "minecraft:baked_potato": [], "minecraft:dirt": [], "minecraft:bread": [],
  "kaleidoscope_cookery:flour": [], "kaleidoscope_cookery:raw_dough": []
};
for (const [id, tags] of Object.entries(VANILLA)) ITEM_META.set(id, { stack: id.endsWith("bucket") ? 1 : 64, tags });
// Any other vanilla / Cookery id is accepted with default metadata; tests may add more.
export const EXTRA_ITEMS = new Set();
function metaFor(id) {
  if (ITEM_META.has(id)) return ITEM_META.get(id);
  if (id.startsWith("minecraft:") || id.startsWith("kaleidoscope_cookery:") || EXTRA_ITEMS.has(id))
    return { stack: id.endsWith("bucket") ? 1 : 64, tags: id === "minecraft:iron_axe" ? ["minecraft:is_axe"] : [] };
  return undefined;
}

const BLOCK_DEFAULTS = new Map();
for (const f of readdirSync(BP + "blocks")) {
  const d = json(BP + "blocks/" + f)["minecraft:block"];
  const states = {};
  for (const [k, v] of Object.entries(d.description.states ?? {})) states[k] = Array.isArray(v) ? v[0] : v?.values?.min ?? 0;
  BLOCK_DEFAULTS.set(d.description.identifier, states);
}

export const EquipmentSlot = { Mainhand: "Mainhand" };
export class MolangVariableMap { constructor() { this.vars = {}; } setColorRGB(k, c) { this.vars[k] = c; } setFloat(k, v) { this.vars[k] = v; } }
export const GameMode = { Creative: "Creative", Survival: "Survival" };

export class ItemStack {
  constructor(id, amount = 1) {
    const meta = metaFor(id);
    if (!meta) throw new Error(`unknown item ${id}`);
    this.typeId = id; this.amount = amount; this.maxAmount = meta.stack; this._tags = meta.tags;
    this.localizationKey = `item.${id}.name`;
    this._props = new Map(); this.lore = [];
  }
  hasTag(t) { return this._tags.includes(t); }
  getTags() { return [...this._tags]; }
  setDynamicProperty(k, v) { if (this.maxAmount > 1) throw new Error("stackable items cannot hold dynamic properties"); this._props.set(k, v); }
  getDynamicProperty(k) { return this._props.get(k); }
  setLore(l) { this.lore = l; }
  getComponent() { return undefined; }
  clone() { const s = new ItemStack(this.typeId, this.amount); return s; }
}

export class BlockPermutation {
  constructor(id, states) { this.type = { id }; this._states = { ...states }; }
  static resolve(id, states = {}) { return new BlockPermutation(id, { ...(BLOCK_DEFAULTS.get(id) ?? {}), ...states }); }
  getState(n) { return this._states[n]; }
  withState(n, v) { return new BlockPermutation(this.type.id, { ...this._states, [n]: v }); }
  matches(id) { return this.type.id === id; }
}

class Block {
  constructor(dim, loc) { this.dimension = dim; this.x = loc.x; this.y = loc.y; this.z = loc.z; }
  get permutation() { return this.dimension._blocks.get(this._k()) ?? BlockPermutation.resolve("minecraft:air"); }
  get typeId() { return this.permutation.type.id; }
  get isAir() { return this.typeId === "minecraft:air"; }
  get location() { return { x: this.x, y: this.y, z: this.z }; }
  _k() { return `${this.x},${this.y},${this.z}`; }
  getRedstonePower() { return this.dimension._power.get(this._k()) ?? 0; }
  getLightLevel() { return 15; }
  above() { return this.dimension.getBlock({ x: this.x, y: this.y + 1, z: this.z }); }
  hasTag() { return false; }
  setPermutation(p) { this.dimension._blocks.set(this._k(), p); }
  setType(id) { if (id === "minecraft:air") this.dimension._blocks.delete(this._k()); else this.setPermutation(BlockPermutation.resolve(id)); }
}

class MockEntity {
  constructor(dim, typeId, location) {
    this.dimension = dim; this.typeId = typeId; this.location = { ...location }; this.isValid = true;
    this._tags = []; this._props = {}; this.rotation = { x: 0, y: 0 };
  }
  addTag(t) { if (!this._tags.includes(t)) this._tags.push(t); return true; }
  getTags() { return [...this._tags]; }
  getProperty(k) { return this._props[k]; }
  setProperty(k, v) { this._props[k] = v; }
  setRotation(r) { this.rotation = { ...r }; }
  triggerEvent(ev) { if (ev.endsWith(":despawn")) this.remove(); }
  remove() { this.isValid = false; const i = this.dimension.entities.indexOf(this); if (i >= 0) this.dimension.entities.splice(i, 1); }
}

class Dimension {
  constructor(id) { this.id = id; this._blocks = new Map(); this._power = new Map(); this.spawned = []; this.sounds = []; this.entities = []; this.particles = []; }
  spawnEntity(typeId, location) { const e = new MockEntity(this, typeId, location); this.entities.push(e); return e; }
  getEntities(o = {}) {
    return this.entities.filter(e => (!o.type || e.typeId === o.type) && (!o.location ||
      Math.hypot(e.location.x - o.location.x, e.location.y - o.location.y, e.location.z - o.location.z) <= (o.maxDistance ?? Infinity)));
  }
  getBlock(loc) { return new Block(this, { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) }); }
  spawnItem(stack, location) { this.spawned.push({ id: stack.typeId, amount: stack.amount, location }); }
  playSound(id) { this.sounds.push(id); }
  spawnParticle(id, loc, vars) { this.particles.push({ id, loc, vars }); }
}

const subs = () => { const l = []; return { subscribe: f => { l.push(f); return f; }, _fire: e => l.forEach(f => f(e)), _l: l }; };
const dynamic = new Map();
const overworld = new Dimension("minecraft:overworld");

export const world = {
  getDynamicProperty: k => dynamic.get(k),
  setDynamicProperty: (k, v) => (v === undefined ? dynamic.delete(k) : dynamic.set(k, v)),
  getDimension: () => overworld,
  afterEvents: { worldLoad: subs(), blockExplode: subs(), itemCompleteUse: subs(), playerBreakBlock: subs() },
  getAllPlayers: () => players
};
const players = [];

export const ItemTypes = { get: id => (metaFor(id) ? { id } : undefined) };
export const BlockTypes = { get: id => (BLOCK_DEFAULTS.has(id) || EXTRA_BLOCKS.has(id) || id.startsWith("minecraft:") ? { id } : undefined) };
export const EXTRA_BLOCKS = new Set();

let runs = [], intervals = new Map(), nextId = 1;
export const system = {
  currentTick: 0,
  beforeEvents: { startup: subs() },
  afterEvents: { scriptEventReceive: subs() },
  run(fn) { runs.push(fn); return nextId++; },
  runTimeout(fn) { runs.push(fn); return nextId++; },
  runInterval(fn, ticks) { const id = nextId++; intervals.set(id, { fn, ticks }); return id; },
  clearRun(id) { intervals.delete(id); },
  sendScriptEvent(id, message) { sent.push({ id, message }); system.afterEvents.scriptEventReceive._fire({ id, message }); }
};
const sent = [];

class Container {
  constructor(size = 36) { this.size = size; this.slots = new Array(size).fill(undefined); }
  getItem(i) { return this.slots[i]; }
  setItem(i, s) { this.slots[i] = s; }
  addItem(s) {
    for (let i = 0; i < this.size && s.amount > 0; i++) {
      const cur = this.slots[i];
      if (cur && cur.typeId === s.typeId && cur.amount < cur.maxAmount) {
        const n = Math.min(s.amount, cur.maxAmount - cur.amount); cur.amount += n; s.amount -= n;
      }
    }
    for (let i = 0; i < this.size && s.amount > 0; i++) if (!this.slots[i]) { this.slots[i] = s; return undefined; }
    return s.amount > 0 ? s : undefined;
  }
  count(id) { return this.slots.reduce((n, s) => n + (s?.typeId === id ? s.amount : 0), 0); }
}

let playerIds = 0;
export function makePlayer({ x = 0.5, y = 64, z = 5.5, creative = false } = {}) {
  const inv = new Container();
  const props = new Map();
  const hunger = { currentValue: 10, effectiveMax: 20, setCurrentValue(v) { this.currentValue = v; } };
  const saturation = { currentValue: 0, effectiveMax: 20, setCurrentValue(v) { this.currentValue = v; } };
  const p = {
    id: `p${++playerIds}`, typeId: "minecraft:player", effects: new Map(), hunger, saturation,
    location: { x, y, z }, dimension: overworld, isSneaking: false, messages: [], inv,
    addEffect(id, duration, opts) { p.effects.set(id, { duration, amplifier: opts?.amplifier ?? 0 }); },
    removeEffect(id) { p.effects.delete(id); },
    getDynamicProperty: k => props.get(k), setDynamicProperty: (k, v) => (v === undefined ? props.delete(k) : props.set(k, v)),
    getGameMode: () => (creative ? GameMode.Creative : GameMode.Survival),
    onScreenDisplay: { setActionBar: m => p.messages.push(m) },
    getComponent(name) {
      if (name === "minecraft:inventory") return { container: inv };
      if (name === "minecraft:player.hunger") return hunger;
      if (name === "minecraft:player.saturation") return saturation;
      if (name === "minecraft:equippable") return {
        getEquipmentSlot: () => ({
          hasItem: () => !!inv.slots[0], getItem: () => inv.slots[0], setItem: s => { inv.slots[0] = s; }
        })
      };
    },
    hold(id, n = 1) { inv.slots[0] = id ? new ItemStack(id, n) : undefined; }
  };
  players.push(p);
  return p;
}

/** Test controls. */
export const __mock = {
  overworld, dynamic, sent,
  flush() { for (let i = 0; i < 20 && runs.length; i++) { const r = runs; runs = []; r.forEach(f => f()); } },
  /** Advance n * `ticks` game ticks; each interval fires when its period divides the tick. */
  advance(ticks) {
    for (let i = 0; i < ticks; i++) {
      system.currentTick++;
      for (const it of [...intervals.values()]) if (system.currentTick % it.ticks === 0) it.fn();
      this.flush();
    }
  },
  tick(nTimes = 1) { this.advance(nTimes * 20); },
  eat(player, stack) { world.afterEvents.itemCompleteUse._fire({ source: player, itemStack: stack }); },
  startup() {
    const registry = new Map();
    system.beforeEvents.startup._fire({ blockComponentRegistry: { registerCustomComponent: (n, c) => registry.set(n, c) } });
    world.afterEvents.worldLoad._fire({});
    this.flush();
    return registry;
  },
  explode(block, permutation) { world.afterEvents.blockExplode._fire({ block, dimension: block.dimension, explodedBlockPermutation: permutation }); }
};
