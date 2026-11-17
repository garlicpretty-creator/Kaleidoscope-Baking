// Generates BP/blocks/oven.json from BP/scripts/utils/ovenGeometry.js.
// Run: node tools/gen_oven_block.mjs   (re-run whenever the layout or textures change)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ALL_PARTS, CELL_STATE, CHIMNEY_PART, FACINGS, FACING_STATE, LAYER_STATE, LIT_STATE, OVEN_ID, doorPart, fireboxPart, partOffset
} from "../BP/scripts/utils/ovenGeometry.js";

const out = fileURLToPath(new URL("../BP/blocks/oven.json", import.meta.url));
const tex = name => ({ texture: name, render_method: "opaque" });
const part = i => `(q.block_state('${LAYER_STATE}') == ${Math.floor(i / 9)} && q.block_state('${CELL_STATE}') == ${i % 9})`;
const facing = f => `q.block_state('${FACING_STATE}') == '${f}'`;
const lit = v => `q.block_state('${LIT_STATE}') == ${v}`;
const BRICK = "kb_oven_brick";

const permutations = [];

// Top layer (except the chimney) shows the oven top texture on its upper face.
const topParts = ALL_PARTS.filter(i => partOffset(i).dy === 2 && i !== CHIMNEY_PART).sort((a, b) => a - b);
permutations.push({
  condition: topParts.map(part).join(" || "),
  components: { "minecraft:material_instances": { "*": tex(BRICK), up: tex("kb_oven_top") } }
});
permutations.push({
  condition: part(CHIMNEY_PART),
  components: { "minecraft:material_instances": { "*": tex(BRICK), up: tex("kb_oven_chimney") } }
});

// Door and firebox face outward on the oven's front. Parts never overlap, so exactly one
// permutation (besides the base) applies to any block.
for (const f of FACINGS) {
  permutations.push({
    condition: `${part(doorPart(f))} && ${facing(f)}`,
    components: { "minecraft:material_instances": { "*": tex(BRICK), [f]: tex("kb_oven_door") } }
  });
  for (const on of [false, true]) {
    const components = {
      "minecraft:material_instances": { "*": tex(BRICK), [f]: tex(on ? "kb_oven_firebox_lit" : "kb_oven_firebox") }
    };
    if (on) components["minecraft:light_emission"] = 13;
    permutations.push({ condition: `${part(fireboxPart(f))} && ${facing(f)} && ${lit(on)}`, components });
  }
}

const block = {
  format_version: "1.26.1",
  "minecraft:block": {
    description: {
      identifier: OVEN_ID,
      states: {
        // First value = default permutation = the controller the player places.
        // part index = layer * 9 + cell (a state may have at most 16 values); default = the controller (layer 0, cell 4)
        [LAYER_STATE]: [0, 1, 2],
        [CELL_STATE]: [4, 0, 1, 2, 3, 5, 6, 7, 8],
        [FACING_STATE]: ["south", "north", "east", "west"],
        [LIT_STATE]: [false, true]
      }
    },
    components: {
      "minecraft:geometry": "minecraft:geometry.full_block",
      "minecraft:material_instances": { "*": tex(BRICK) },
      "minecraft:destructible_by_mining": { seconds_to_destroy: 3 },
      "minecraft:destructible_by_explosion": { explosion_resistance: 30 },
      "minecraft:loot": "loot_tables/kaleidoscope_baking/empty.json",
      "minecraft:movable": { movement_type: "immovable", sticky: "none" },
      "minecraft:map_color": "#9C5A3C",
      "kaleidoscope_baking:oven": {}
    },
    permutations
  }
};

writeFileSync(out, JSON.stringify(block, null, 2) + "\n");
console.log(`wrote ${out} (${permutations.length} permutations)`);
