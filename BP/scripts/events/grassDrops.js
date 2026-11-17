// ## Kaleidoscope script role: Gameplay events (finding seeds in the wild).
// Breaking grass / ferns sometimes drops a Baking cutting or seed, favouring plants whose
// wild biome matches when the biome API is available (otherwise any plant can drop).
import { world } from "@minecraft/server";
import { CONTENT } from "../data/generated/content.js";
import { BOP_LIKE } from "../data/generated/bopBiomes.js";
import { spawnItems } from "../utils/runtime.js";

const GRASS = new Set(["minecraft:short_grass", "minecraft:tall_grass", "minecraft:fern", "minecraft:large_fern"]);
const CHANCE = 0.04;
// seeds: crop seeds + tree saplings, each with the biome tags it grows wild in
const SOURCES = [
  ...CONTENT.crops.map(c => ({ item: c.seed, biomes: c.wild })),
  ...CONTENT.trees.map(tr => ({ item: tr.sapling.replace("_block", ""), biomes: tr.wild }))
].filter(s => s.biomes.length);

function biomeTags(dimension, loc) {
  try {
    const biome = dimension.getBiome?.(loc);
    if (!biome) return undefined;
    const tags = biome.getTags?.() ?? [];
    const id = String(biome.id ?? "");
    const set = new Set([...tags, id.replace("minecraft:", "")]);
    // Biomes O' Plenty: a BOP biome counts as each vanilla tag/biome it stands in for
    // (its `bop_like_<x>` tags, or the generated id table when tags are unavailable).
    for (const t of tags) if (t.startsWith("bop_like_")) set.add(t.slice(9));
    for (const t of BOP_LIKE[id] ?? []) set.add(t);
    return set;
  } catch { return undefined; }
}

world.afterEvents.playerBreakBlock.subscribe(ev => {
  if (!GRASS.has(ev.brokenBlockPermutation?.type?.id) || Math.random() > CHANCE) return;
  const loc = { x: ev.block.x + 0.5, y: ev.block.y + 0.3, z: ev.block.z + 0.5 };
  const tags = biomeTags(ev.dimension, ev.block);
  const pool = tags ? SOURCES.filter(s => s.biomes.some(b => tags.has(b))) : SOURCES;
  const pick = (pool.length ? pool : SOURCES)[Math.floor(Math.random() * (pool.length || SOURCES.length))];
  if (pick) spawnItems(ev.dimension, loc, pick.item, 1);
});
