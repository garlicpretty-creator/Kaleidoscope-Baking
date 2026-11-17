// Kaleidoscope Baking — immersive oven & mixing bowl.
// No UI, no chat, no action bar: everything is read from the block itself
// (food visible through the oven glass, fire in the firebox, batter in the bowl),
// plus sounds and particles.
import { system, world, ItemStack, EquipmentSlot, GameMode } from "@minecraft/server";

/** @typedef {import("@minecraft/server").BlockCustomComponent} BlockCustomComponent */
import {
  OVEN_FOODS, FUELS, FUEL_SUFFIXES, STAGE_OF_TIME, MAX_TIME, MAX_FUEL, BURNT_RESULT,
  BOWL_RECIPES, STIRS_NEEDED,
} from "./data.js";

const BOWL_INGREDIENTS = new Set(BOWL_RECIPES.flatMap((r) => r.ingredients));
const CONTAINER_RETURN = { "minecraft:milk_bucket": "minecraft:bucket" };

// ------------------------------------------------------------------ helpers
function mainhand(player) {
  const eq = player.getComponent("minecraft:equippable");
  return { eq, item: eq?.getEquipment(EquipmentSlot.Mainhand) };
}

function give(player, id, count = 1) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  const left = inv ? inv.addItem(new ItemStack(id, count)) : new ItemStack(id, count);
  if (left) player.dimension.spawnItem(left, player.location);
}

/** Use up one of the held item (not in creative); hand back its container (e.g. bucket). */
function consumeHeld(player, eq, item) {
  if (player.getGameMode() === GameMode.Creative) return;
  const back = CONTAINER_RETURN[item.typeId];
  if (item.amount > 1) {
    item.amount -= 1;
    eq.setEquipment(EquipmentSlot.Mainhand, item);
    if (back) give(player, back);
  } else {
    eq.setEquipment(EquipmentSlot.Mainhand, back ? new ItemStack(back, 1) : undefined);
  }
}

function popOut(block, id, count = 1) {
  const { x, y, z } = block.location;
  block.dimension.spawnItem(new ItemStack(id, count), { x: x + 0.5, y: y + 1.0, z: z + 0.5 });
}

function sound(block, id, volume = 1, pitch = 1) {
  const { x, y, z } = block.location;
  block.dimension.playSound(id, { x: x + 0.5, y: y + 0.5, z: z + 0.5 }, { volume, pitch });
}

function particle(block, id, dx = 0.5, dy = 1.0, dz = 0.5) {
  const { x, y, z } = block.location;
  try {
    block.dimension.spawnParticle(id, { x: x + dx, y: y + dy, z: z + dz });
  } catch {
    // chunk unloading etc. — purely cosmetic
  }
}

/** Read an integer block state. */
function st(permutation, name) {
  return Number(permutation.getState(name) ?? 0);
}

function setStates(block, states) {
  let perm = block.permutation;
  for (const [k, v] of Object.entries(states)) perm = perm.withState(k, v);
  block.setPermutation(perm);
}

// ------------------------------------------------------------------ oven
function fuelValue(id) {
  if (!id) return 0;
  if (FUELS[id]) return FUELS[id];
  for (const [suffix, v] of Object.entries(FUEL_SUFFIXES)) if (id.endsWith(suffix)) return v;
  return 0;
}

/** What you get when the food is taken out right now. */
function ovenOutput(foodIndex, time) {
  const food = OVEN_FOODS[foodIndex - 1];
  const stage = STAGE_OF_TIME[time];
  if (stage <= 1) return { id: food.raw, count: 1 }; // raw / half-baked: comes back out unbaked
  if (stage === 2) return { id: food.result, count: food.count };
  return { id: BURNT_RESULT, count: 1 };
}

/** @type {BlockCustomComponent} */
const oven = {
  onPlayerInteract({ block, player }) {
    if (!player) return;
    const { eq, item } = mainhand(player);
    const id = item?.typeId;
    const food = st(block.permutation, "kb:food");
    const time = st(block.permutation, "kb:time");
    const fuel = st(block.permutation, "kb:fuel");

    const fv = fuelValue(id);
    if (fv > 0) {
      if (fuel >= MAX_FUEL) return;
      setStates(block, { "kb:fuel": Math.min(MAX_FUEL, fuel + fv) });
      consumeHeld(player, eq, item);
      sound(block, fuel === 0 ? "fire.ignite" : "block.campfire.crackle");
      return;
    }

    const fi = OVEN_FOODS.findIndex((f) => f.raw === id);
    if (fi >= 0 && food === 0) {
      setStates(block, { "kb:food": fi + 1, "kb:time": 0 });
      consumeHeld(player, eq, item);
      sound(block, "block.itemframe.add_item", 1, 0.8);
      return;
    }

    if (food > 0 && !id) {
      const out = ovenOutput(food, time);
      setStates(block, { "kb:food": 0, "kb:time": 0 });
      give(player, out.id, out.count);
      sound(block, "block.itemframe.remove_item", 1, 0.9);
    }
  },

  onTick({ block }) {
    const fuel = st(block.permutation, "kb:fuel");
    if (fuel <= 0) return;
    const food = st(block.permutation, "kb:food");
    const time = st(block.permutation, "kb:time");
    const states = { "kb:fuel": fuel - 1 };
    if (food > 0 && time < MAX_TIME) states["kb:time"] = time + 1;
    setStates(block, states);

    particle(block, "minecraft:basic_smoke_particle", 0.5, 1.1, 0.5);
    if (Math.random() < 0.5) sound(block, "block.campfire.crackle", 0.4);
    if (fuel - 1 === 0) sound(block, "random.fizz", 0.5, 1.2); // fire goes out
    if (food > 0 && STAGE_OF_TIME[states["kb:time"] ?? time] === 3) {
      for (let i = 0; i < 4; i++) particle(block, "minecraft:large_smoke_particle", 0.5, 1.0 + i * 0.15, 0.5);
    }
  },

  onPlayerBreak({ block, brokenBlockPermutation }) {
    const food = st(brokenBlockPermutation, "kb:food");
    if (food > 0) {
      const out = ovenOutput(food, st(brokenBlockPermutation, "kb:time"));
      popOut(block, out.id, out.count);
    }
  },
};

// ------------------------------------------------------------------ mixing bowl
const bowlKey = (block) => {
  const { x, y, z } = block.location;
  return `kb:bowl:${block.dimension.id}:${x},${y},${z}`;
};

function loadBowl(block) {
  const raw = world.getDynamicProperty(bowlKey(block));
  return typeof raw === "string" ? JSON.parse(raw) : { items: [], stirs: 0 };
}

function saveBowl(block, data) {
  world.setDynamicProperty(bowlKey(block), data.items.length ? JSON.stringify(data) : undefined);
}

function matchRecipe(items) {
  const key = [...items].sort().join("|");
  return BOWL_RECIPES.findIndex((r) => [...r.ingredients].sort().join("|") === key);
}

/** @type {BlockCustomComponent} */
const bowl = {
  onPlayerInteract({ block, player }) {
    if (!player) return;
    const { eq, item } = mainhand(player);
    const id = item?.typeId;
    const mix = st(block.permutation, "kb:mix");
    const data = loadBowl(block);

    // Smooth batter: scoop it out with an empty hand
    if (mix > 0) {
      if (id) return;
      const r = BOWL_RECIPES[mix - 1];
      saveBowl(block, { items: [], stirs: 0 });
      setStates(block, { "kb:mix": 0, "kb:fill": 0 });
      give(player, r.result, r.count);
      sound(block, "block.composter.empty");
      return;
    }

    // Add an ingredient
    if (id && BOWL_INGREDIENTS.has(id)) {
      if (data.items.length >= 6) return;
      data.items.push(id);
      data.stirs = 0;
      saveBowl(block, data);
      setStates(block, { "kb:fill": Math.min(4, data.items.length) });
      consumeHeld(player, eq, item);
      sound(block, "block.composter.fill");
      return;
    }
    if (id || data.items.length === 0) return;

    // Sneak with empty hand: tip the bowl out
    if (player.isSneaking) {
      for (const it of data.items) popOut(block, it);
      saveBowl(block, { items: [], stirs: 0 });
      setStates(block, { "kb:fill": 0 });
      sound(block, "block.composter.empty", 1, 0.7);
      return;
    }

    // Empty hand: stir
    data.stirs += 1;
    saveBowl(block, data);
    sound(block, "dig.snow", 0.8, 0.8 + Math.random() * 0.4);
    particle(block, "minecraft:basic_crit_particle", 0.5, 0.45, 0.5);
    if (data.stirs >= STIRS_NEEDED) {
      const idx = matchRecipe(data.items);
      if (idx >= 0) setStates(block, { "kb:mix": idx + 1 });
    }
  },

  onPlayerBreak({ block, brokenBlockPermutation }) {
    const data = loadBowl(block);
    const mix = st(brokenBlockPermutation, "kb:mix");
    if (mix > 0) {
      const r = BOWL_RECIPES[mix - 1];
      popOut(block, r.result, r.count);
    } else {
      for (const it of data.items) popOut(block, it);
    }
    saveBowl(block, { items: [], stirs: 0 });
  },
};

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("kb:oven", oven);
  blockComponentRegistry.registerCustomComponent("kb:mixing_bowl", bowl);
});
