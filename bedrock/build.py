#!/usr/bin/env python3
"""Build the Kaleidoscope Baking Bedrock add-on.

    python bedrock/build.py

Sources:
  models/*.bbmodel      3D blocks, edited in Blockbench (Bedrock Block format)
  art/icons/*.png       chosen item icons (Retro Diffusion); hand-drawn grids are the fallback
  src/gameplay.py       items, recipes, oven & bowl data
  src/scripts/main.js   immersive oven / mixing-bowl behaviour (Script API)

Output: KaleidoscopeBaking_BP/, KaleidoscopeBaking_RP/ and dist/Kaleidoscope_Baking.mcaddon
"""
import base64
import io
import json
import shutil
import sys
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))
import gameplay as G  # noqa: E402
import textures as T  # noqa: E402
from item_art import ITEMS as GRIDS, PALETTE  # noqa: E402

NS = G.NS
BP = ROOT / "KaleidoscopeBaking_BP"
RP = ROOT / "KaleidoscopeBaking_RP"
DIST = ROOT / "dist"
MODELS = ROOT / "models"
VERSION = [1, 1, 0]
MIN_ENGINE = [1, 21, 90]
FMT = "1.21.90"
SCRIPT_API = "2.0.0"

UUID_BP_HEADER = "88b78dd9-56f3-431d-80cf-5b9c56919d60"
UUID_BP_MODULE = "6f340e4e-ccc9-45fa-b962-c0a4fc0ab763"
UUID_BP_SCRIPT = "bda7f8ef-32ee-4569-8562-1d82c45d2e9d"
UUID_RP_HEADER = "2869ff9e-ec55-455d-a0e0-0b4841678bbd"
UUID_RP_MODULE = "9624a47c-18db-4d4e-99c8-a3581860a44d"

terrain = {}  # terrain_texture.json entries


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def save_block_tex(img, rel):
    """Save RP/textures/blocks/<rel>.png and register it as kb_<rel with / -> _>."""
    p = RP / "textures" / "blocks" / f"{rel}.png"
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p)
    key = f"{NS}_" + rel.replace("/", "_")
    terrain[key] = {"textures": f"textures/blocks/{rel}"}
    return key


def q(state):
    return f"q.block_state('{state}')"


# ================================================================ items
def grid_icon(name):
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(GRIDS[name]):
        for x, ch in enumerate(row):
            if PALETTE[ch]:
                img.putpixel((x, y), T.hexrgb(PALETTE[ch]))
    return img


def item_icon(name):
    chosen = ROOT / "art" / "icons" / f"{name}.png"
    if chosen.exists():
        img = Image.open(chosen).convert("RGBA")
        if img.size != (16, 16):
            img = img.resize((16, 16), Image.NEAREST)
        img.putalpha(img.getchannel("A").point(lambda v: 255 if v >= 128 else 0))
        return img
    if name in GRIDS:
        return grid_icon(name)
    raise SystemExit(f"no icon for {name}: add art/icons/{name}.png")


def build_items():
    data = {}
    for name in G.ITEM_NAMES:
        p = RP / "textures" / "items" / f"{name}.png"
        p.parent.mkdir(parents=True, exist_ok=True)
        item_icon(name).save(p)
        data[f"{NS}_{name}"] = {"textures": f"textures/items/{name}"}
        comps = {
            "minecraft:icon": f"{NS}_{name}",
            "minecraft:display_name": {"value": f"item.{NS}:{name}.name"},
            "minecraft:max_stack_size": 64,
        }
        for crop, c in G.CROPS.items():
            if c["planter"] == name:
                comps["minecraft:block_placer"] = {"block": f"{NS}:{crop}", "use_on": G.SOILS}
        if name in G.FOOD:
            nut, sat, conv = G.FOOD[name]
            food = {"nutrition": nut, "saturation_modifier": sat}
            if conv:
                food["using_converts_to"] = conv
            comps["minecraft:food"] = food
            comps["minecraft:use_animation"] = "eat"
            comps["minecraft:use_modifiers"] = {"use_duration": 1.6, "movement_modifier": 0.35}
        write_json(BP / "items" / f"{name}.json", {
            "format_version": FMT,
            "minecraft:item": {
                "description": {"identifier": f"{NS}:{name}", "menu_category": {"category": "items"}},
                "components": comps,
            },
        })
    write_json(RP / "textures" / "item_texture.json", {
        "resource_pack_name": "kaleidoscope_baking", "texture_name": "atlas.items", "texture_data": data,
    })


def build_recipes():
    for rid, count, ingredients, shape, key in G.CRAFTING:
        body = {
            "description": {"identifier": f"{NS}:{rid}"},
            "tags": ["crafting_table"],
            "unlock": {"context": "AlwaysUnlocked"},
            "result": {"item": f"{NS}:{rid}", "count": count},
        }
        if shape:
            body["pattern"] = shape
            body["key"] = {k: {"item": v} for k, v in key.items()}
            data = {"format_version": FMT, "minecraft:recipe_shaped": body}
        else:
            body["ingredients"] = [{"item": i} for i in ingredients]
            data = {"format_version": FMT, "minecraft:recipe_shapeless": body}
        write_json(BP / "recipes" / f"{rid}.json", data)


# ================================================================ Blockbench -> Bedrock geometry
def decode_texture(tex):
    src = tex.get("source", "")
    if not src.startswith("data:image"):
        raise SystemExit(f"texture {tex.get('name')} is not embedded; in Blockbench use "
                         "'Texture > Embed' (or save with textures embedded)")
    return Image.open(io.BytesIO(base64.b64decode(src.split(",", 1)[1]))).convert("RGBA")


def tex_stem(tex):
    return Path(tex["name"]).stem


def bbmodel_to_geo(bb):
    res_w, res_h = bb["resolution"]["width"], bb["resolution"]["height"]
    texs = bb["textures"]
    els = {e["uuid"]: e for e in bb["elements"] if e.get("type", "cube") == "cube"}

    def conv_cube(e):
        f, t = e["from"], e["to"]
        c = {"origin": [-t[0], f[1], f[2]], "size": [t[i] - f[i] for i in range(3)]}
        if e.get("inflate"):
            c["inflate"] = e["inflate"]
        rot = e.get("rotation")
        if rot and any(rot):
            o = e.get("origin", [0, 0, 0])
            c["pivot"] = [-o[0], o[1], o[2]]
            c["rotation"] = [-rot[0], -rot[1], rot[2]]
        uv = {}
        for face, fd in e.get("faces", {}).items():
            ti = fd.get("texture")
            if ti is None or ti is False:
                continue
            ti = int(ti)
            tex = texs[ti]
            sx = res_w / tex.get("uv_width", res_w)
            sy = res_h / tex.get("uv_height", res_h)
            u1, v1, u2, v2 = fd["uv"]
            if face in ("up", "down"):  # Blockbench flips these on Bedrock export
                entry = {"uv": [u2 * sx, v2 * sy], "uv_size": [(u1 - u2) * sx, (v1 - v2) * sy]}
            else:
                entry = {"uv": [u1 * sx, v1 * sy], "uv_size": [(u2 - u1) * sx, (v2 - v1) * sy]}
            if fd.get("rotation"):
                entry["uv_rotation"] = fd["rotation"]
            if ti != 0:
                entry["material_instance"] = tex_stem(tex)
            uv[face] = entry
        c["uv"] = uv
        return c

    bones, used = [], set()

    def walk(group, parent):
        o = group.get("origin", [0, 0, 0])
        bone = {"name": group["name"], "pivot": [-o[0], o[1], o[2]]}
        if parent:
            bone["parent"] = parent
        rot = group.get("rotation")
        if rot and any(rot):
            bone["rotation"] = [-rot[0], -rot[1], rot[2]]
        cubes = []
        bones.append(bone)
        for child in group.get("children", []):
            if isinstance(child, str):
                if child in els:
                    cubes.append(conv_cube(els[child]))
                    used.add(child)
            else:
                walk(child, group["name"])
        if cubes:
            bone["cubes"] = cubes

    loose = []
    for node in bb.get("outliner", []):
        if isinstance(node, str):
            loose.append(node)
        else:
            walk(node, None)
    loose += [u for u in els if u not in used and u not in loose]
    if loose:
        bones.insert(0, {"name": "root", "pivot": [0, 0, 0], "cubes": [conv_cube(els[u]) for u in loose]})

    vb = bb.get("visible_box", [2, 2.5, 0.75])
    return {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry." + bb.get("model_identifier", NS + "_" + bb["name"]),
                "texture_width": res_w, "texture_height": res_h,
                "visible_bounds_width": vb[0], "visible_bounds_height": vb[1],
                "visible_bounds_offset": [0, vb[2], 0],
            },
            "bones": bones,
        }],
    }


def load_model(name):
    path = MODELS / f"{name}.bbmodel"
    if not path.exists():
        raise SystemExit(f"missing {path}; run: python bedrock/tools/make_bbmodel.py {name}")
    bb = json.loads(path.read_text(encoding="utf-8"))
    write_json(RP / "models" / "blocks" / f"{name}.geo.json", bbmodel_to_geo(bb))
    textures = {}
    for i, tex in enumerate(bb["textures"]):
        img = decode_texture(tex)
        rel = name if i == 0 else f"{name}_{tex_stem(tex)}"
        textures["*" if i == 0 else tex_stem(tex)] = (img, save_block_tex(img, rel))
    return textures


# ================================================================ blocks
def base_block(name, collision, comps, states=None, rotatable=False, perms=(), category="items"):
    desc = {"identifier": f"{NS}:{name}", "menu_category": {"category": category}}
    if states:
        desc["states"] = states
    components = {
        "minecraft:geometry": f"geometry.{NS}_{name}",
        "minecraft:destructible_by_mining": {"seconds_to_destroy": 1.5},
        "minecraft:destructible_by_explosion": {"explosion_resistance": 6},
        "minecraft:collision_box": {"origin": collision[0], "size": collision[1]},
        "minecraft:selection_box": {"origin": collision[0], "size": collision[1]},
        **comps,
    }
    permutations = list(perms)
    if rotatable:
        desc["traits"] = {"minecraft:placement_direction": {
            "enabled_states": ["minecraft:cardinal_direction"], "y_rotation_offset": 180}}
        for d, deg in {"north": 0, "west": 90, "south": 180, "east": -90}.items():
            permutations.append({
                "condition": f"{q('minecraft:cardinal_direction')} == '{d}'",
                "components": {"minecraft:transformation": {"rotation": [0, deg, 0]}},
            })
    block = {"description": desc, "components": components}
    if permutations:
        block["permutations"] = permutations
    write_json(BP / "blocks" / f"{name}.json", {"format_version": FMT, "minecraft:block": block})


def build_oven():
    tex = load_model("oven")
    main_key, glass_key = tex["*"][1], tex["glass"][1]
    fire_keys = [save_block_tex(T.fire(False), "oven_fire/out"), save_block_tex(T.fire(True), "oven_fire/lit")]
    empty_key = save_block_tex(T.blank(), "oven_food/empty")
    stage_names = ["raw", "half", "done", "burnt"]
    food_keys = []
    for raw, result, _ in G.OVEN_FOODS:
        r, d = item_icon(raw), item_icon(result)
        food_keys.append([save_block_tex(T.food_stage(r, d, s), f"oven_food/{raw}_{stage_names[s]}") for s in range(4)])

    def mats(food_key, fire_key):
        return {"minecraft:material_instances": {
            "*": {"texture": main_key, "render_method": "alpha_test"},
            "glass": {"texture": glass_key, "render_method": "blend"},
            "food": {"texture": food_key, "render_method": "alpha_test"},
            "fire": {"texture": fire_key, "render_method": "alpha_test"},
        }}

    perms = [{"condition": f"{q('kb:fuel')} > 0", "components": {"minecraft:light_emission": 12}}]
    for lit in (0, 1):
        fire_cond = f"{q('kb:fuel')} > 0" if lit else f"{q('kb:fuel')} == 0"
        perms.append({"condition": f"{q('kb:food')} == 0 && {fire_cond}",
                      "components": mats(empty_key, fire_keys[lit])})
        for fi in range(len(G.OVEN_FOODS)):
            for s in range(4):
                times = [t for t, st in enumerate(G.STAGE_OF_TIME) if st == s]
                cond = (f"{q('kb:food')} == {fi + 1} && {q('kb:time')} >= {times[0]} && "
                        f"{q('kb:time')} <= {times[-1]} && {fire_cond}")
                perms.append({"condition": cond, "components": mats(food_keys[fi][s], fire_keys[lit])})

    base_block(
        "oven", ([-8, 0, -8], [16, 16, 16]),
        {
            **mats(empty_key, fire_keys[0]),
            "minecraft:map_color": "#b4553d",
            "minecraft:tick": {"interval_range": [G.TICK_SECONDS * 20, G.TICK_SECONDS * 20], "looping": True},
            "kb:oven": {},
        },
        states={
            "kb:food": list(range(len(G.OVEN_FOODS) + 1)),
            "kb:time": list(range(G.MAX_TIME + 1)),
            "kb:fuel": list(range(G.MAX_FUEL + 1)),
        },
        rotatable=True, perms=perms,
    )


def build_bowl():
    tex = load_model("mixing_bowl")
    main_key = tex["*"][1]
    lumpy = save_block_tex(T.batter(None), "bowl_batter/lumpy")
    keys = [lumpy]
    for result, _, _ in G.BOWL_RECIPES:
        col = T.average_color(item_icon(result))
        col = tuple(min(255, int(c * 0.6 + 255 * 0.4 * (c / 255) + 30)) for c in col[:3]) + (255,)
        keys.append(save_block_tex(T.batter(col), f"bowl_batter/{result}"))

    def mats(batter_key):
        return {"minecraft:material_instances": {
            "*": {"texture": main_key, "render_method": "alpha_test"},
            "batter": {"texture": batter_key, "render_method": "alpha_test"},
        }}

    perms = [{"condition": f"{q('kb:mix')} == {i}", "components": mats(k)} for i, k in enumerate(keys)]
    base_block(
        "mixing_bowl", ([-5, 0, -5], [10, 6, 10]),
        {
            "minecraft:geometry": {
                "identifier": f"geometry.{NS}_mixing_bowl",
                "bone_visibility": {f"fill{n}": f"{q('kb:fill')} >= {n}" for n in range(1, 5)},
            },
            **mats(lumpy),
            "minecraft:light_dampening": 0,
            "minecraft:map_color": "#86bce0",
            "kb:mixing_bowl": {},
        },
        states={"kb:fill": list(range(5)), "kb:mix": list(range(len(G.BOWL_RECIPES) + 1))},
        perms=perms,
    )


def build_tray():
    tex = load_model("baking_tray")
    base_block(
        "baking_tray", ([-7, 0, -6], [14, 2, 12]),
        {
            "minecraft:material_instances": {"*": {"texture": tex["*"][1], "render_method": "alpha_test"}},
            "minecraft:light_dampening": 0,
            "minecraft:map_color": "#c3cbd3",
        },
        rotatable=True,
    )


def plant_sprite(name, height=16):
    """Growth-stage sprite from art/plants/, trimmed, scaled to `height` px, anchored bottom centre."""
    p = ROOT / "art" / "plants" / f"{name}.png"
    if not p.exists():
        raise SystemExit(f"missing {p}")
    img = Image.open(p).convert("RGBA")
    if img.size != (16, 16):
        img = img.resize((16, 16), Image.NEAREST)
    img.putalpha(img.getchannel("A").point(lambda v: 255 if v >= 128 else 0))
    bbox = img.getchannel("A").getbbox()
    out = T.blank()
    if bbox:
        part = img.crop(bbox)
        if part.height > height:
            k = height / part.height
            part = part.resize((max(1, round(part.width * k)), height), Image.NEAREST)
        out.paste(part, ((16 - part.width) // 2, 16 - part.height))
    return out


def build_crops():
    load_model("crop_cross")
    write_json(BP / "loot_tables" / "empty.json", {"pools": []})
    for crop, c in G.CROPS.items():
        keys = [save_block_tex(plant_sprite(f"{crop}_{s}", c["heights"][s]), f"crops/{crop}_{s}") for s in range(4)]
        perms = []
        for s, key in enumerate(keys):
            h = c["heights"][s]
            perms.append({"condition": f"{q('kb:growth')} == {s}", "components": {
                "minecraft:material_instances": {
                    "*": {"texture": key, "render_method": "alpha_test", "face_dimming": False, "ambient_occlusion": False},
                    "plant": {"texture": key, "render_method": "alpha_test", "face_dimming": False, "ambient_occlusion": False},
                },
                "minecraft:selection_box": {"origin": [-6, 0, -6], "size": [12, h, 12]},
            }})
        base_block(
            crop, ([-6, 0, -6], [12, 8, 12]),
            {
                "minecraft:geometry": f"geometry.{NS}_crop_cross",
                "minecraft:collision_box": False,
                "minecraft:selection_box": {"origin": [-6, 0, -6], "size": [12, c["heights"][0], 12]},
                "minecraft:material_instances": {
                    "*": {"texture": keys[0], "render_method": "alpha_test"},
                    "plant": {"texture": keys[0], "render_method": "alpha_test"},
                },
                "minecraft:destructible_by_mining": {"seconds_to_destroy": 0},
                "minecraft:destructible_by_explosion": {"explosion_resistance": 0},
                "minecraft:flammable": {"catch_chance_modifier": 60, "destroy_chance_modifier": 100},
                "minecraft:light_dampening": 0,
                "minecraft:map_color": "#4f8a3a",
                "minecraft:loot": "loot_tables/empty.json",
                "minecraft:placement_filter": {"conditions": [
                    {"allowed_faces": ["up"], "block_filter": G.SOILS}]},
                "kb:crop": {
                    "planter": f"{NS}:{c['planter']}", "fruit": f"{NS}:{c['fruit']}",
                    "fruit_count": c["fruit_count"], "regrow_to": c["regrow_to"], "grow_chance": c["grow_chance"],
                },
            },
            states={"kb:growth": [0, 1, 2, 3]},
            perms=perms, category="none",
        )
        # wild patches, generated fully grown
        write_json(BP / "features" / f"wild_{crop}.json", {
            "format_version": "1.13.0",
            "minecraft:single_block_feature": {
                "description": {"identifier": f"{NS}:wild_{crop}"},
                "places_block": {"name": f"{NS}:{crop}", "states": {"kb:growth": 3}},
                "enforce_placement_rules": False,
                "enforce_survivability_rules": False,
                "may_replace": ["minecraft:air"],
                "may_attach_to": {"bottom": ["minecraft:grass_block", "minecraft:podzol", "minecraft:dirt"]},
            },
        })
        for biome in c["biomes"]:
            write_json(BP / "feature_rules" / f"wild_{crop}_{biome}.json", {
                "format_version": "1.13.0",
                "minecraft:feature_rules": {
                    "description": {"identifier": f"{NS}:wild_{crop}_{biome}", "places_feature": f"{NS}:wild_{crop}"},
                    "conditions": {
                        "placement_pass": "surface_pass",
                        "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==", "value": biome}],
                    },
                    "distribution": {
                        "iterations": 3,
                        "scatter_chance": {"numerator": 1, "denominator": c["rarity"]},
                        "x": {"distribution": "uniform", "extent": [0, 15]},
                        "y": "query.heightmap(variable.worldx, variable.worldz)",
                        "z": {"distribution": "uniform", "extent": [0, 15]},
                    },
                },
            })


# ================================================================ scripts, packs
def build_scripts():
    data = {
        "OVEN_FOODS": [{"raw": f"{NS}:{r}", "result": f"{NS}:{o}", "count": c} for r, o, c in G.OVEN_FOODS],
        "FUELS": G.FUELS,
        "FUEL_SUFFIXES": G.FUEL_SUFFIXES,
        "STAGE_OF_TIME": G.STAGE_OF_TIME,
        "MAX_TIME": G.MAX_TIME,
        "MAX_FUEL": G.MAX_FUEL,
        "BURNT_RESULT": G.BURNT_RESULT,
        "BOWL_RECIPES": [{"result": f"{NS}:{r}", "count": c, "ingredients": ing} for r, c, ing in G.BOWL_RECIPES],
        "STIRS_NEEDED": G.STIRS_NEEDED,
    }
    out = BP / "scripts"
    out.mkdir(parents=True, exist_ok=True)
    lines = ["// Generated by build.py from src/gameplay.py — do not edit."]
    lines += [f"export const {k} = {json.dumps(v, ensure_ascii=False)};" for k, v in data.items()]
    (out / "data.js").write_text("\n".join(lines) + "\n", encoding="utf-8")
    shutil.copy(ROOT / "src" / "scripts" / "main.js", out / "main.js")


def manifests():
    write_json(BP / "manifest.json", {
        "format_version": 2,
        "header": {"name": "pack.name", "description": "pack.description", "uuid": UUID_BP_HEADER,
                   "version": VERSION, "min_engine_version": MIN_ENGINE},
        "modules": [
            {"type": "data", "uuid": UUID_BP_MODULE, "version": VERSION},
            {"type": "script", "language": "javascript", "uuid": UUID_BP_SCRIPT,
             "entry": "scripts/main.js", "version": VERSION},
        ],
        "dependencies": [
            {"uuid": UUID_RP_HEADER, "version": VERSION},
            {"module_name": "@minecraft/server", "version": SCRIPT_API},
        ],
    })
    write_json(RP / "manifest.json", {
        "format_version": 2,
        "header": {"name": "pack.name", "description": "pack.description", "uuid": UUID_RP_HEADER,
                   "version": VERSION, "min_engine_version": MIN_ENGINE},
        "modules": [{"type": "resources", "uuid": UUID_RP_MODULE, "version": VERSION}],
        "dependencies": [{"uuid": UUID_BP_HEADER, "version": VERSION}],
    })


def lang_and_meta():
    for pack, kind in ((BP, "Behavior"), (RP, "Resource")):
        for code, idx, title, desc in (
            ("en_US", 0, f"Kaleidoscope Baking {kind} Pack", "Ovens, mixing bowls and delicious desserts."),
            ("zh_TW", 1, f"萬花筒烘焙 {'行為包' if kind == 'Behavior' else '資源包'}", "烤箱、攪拌碗與各式甜點。"),
        ):
            lines = [f"pack.name={title}", f"pack.description={desc}"]
            if pack is RP:
                lines += [f"item.{NS}:{n}.name={v[idx]}" for n, v in G.ITEM_NAMES.items()]
                lines += [f"tile.{NS}:{n}.name={v[idx]}" for n, v in G.BLOCK_NAMES.items()]
            p = pack / "texts" / f"{code}.lang"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text("\n".join(lines) + "\n", encoding="utf-8")
        write_json(pack / "texts" / "languages.json", ["en_US", "zh_TW"])

    write_json(RP / "textures" / "terrain_texture.json", {
        "resource_pack_name": "kaleidoscope_baking", "texture_name": "atlas.terrain",
        "padding": 8, "num_mip_levels": 4, "texture_data": terrain,
    })
    write_json(RP / "blocks.json", {
        "format_version": [1, 1, 0],
        f"{NS}:oven": {"sound": "stone"},
        f"{NS}:mixing_bowl": {"sound": "stone"},
        f"{NS}:baking_tray": {"sound": "metal"},
        **{f"{NS}:{c}": {"sound": "grass"} for c in G.CROPS},
    })
    icon = item_icon("berry_cake_slice").resize((128, 128), Image.NEAREST)
    bg = Image.new("RGBA", (128, 128), T.hexrgb("#fde9d2"))
    bg.alpha_composite(icon)
    for pack in (BP, RP):
        bg.save(pack / "pack_icon.png")


def package():
    DIST.mkdir(exist_ok=True)
    out = DIST / "Kaleidoscope_Baking.mcaddon"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for pack in (BP, RP):
            for f in sorted(pack.rglob("*")):
                if f.is_file():
                    z.write(f, f.relative_to(ROOT))
    return out


def main():
    for pack in (BP, RP):
        if pack.exists():
            shutil.rmtree(pack)
    build_items()
    build_recipes()
    build_oven()
    build_bowl()
    build_tray()
    build_crops()
    build_scripts()
    manifests()
    lang_and_meta()
    print("built", package())


if __name__ == "__main__":
    main()
