#!/usr/bin/env python3
"""Build the Kaleidoscope Baking Bedrock add-on.

    python bedrock/build.py

Regenerates every generated file in bedrock/KaleidoscopeBaking_BP and
bedrock/KaleidoscopeBaking_RP from the sources in bedrock/src, then writes
bedrock/dist/Kaleidoscope_Baking.mcaddon (double-click to import into Minecraft).
"""
import json
import shutil
import sys
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))
from block_models import BLOCKS  # noqa: E402
from item_art import FOOD, ITEMS, PALETTE  # noqa: E402

NS = "kb"
BP = ROOT / "KaleidoscopeBaking_BP"
RP = ROOT / "KaleidoscopeBaking_RP"
DIST = ROOT / "dist"
VERSION = [1, 0, 0]
MIN_ENGINE = [1, 21, 40]
FMT = "1.21.40"

UUID_BP_HEADER = "88b78dd9-56f3-431d-80cf-5b9c56919d60"
UUID_BP_MODULE = "6f340e4e-ccc9-45fa-b962-c0a4fc0ab763"
UUID_RP_HEADER = "2869ff9e-ec55-455d-a0e0-0b4841678bbd"
UUID_RP_MODULE = "9624a47c-18db-4d4e-99c8-a3581860a44d"

ITEM_NAMES = {
    "flour": ("Flour", "麵粉"),
    "butter": ("Butter", "奶油"),
    "dough": ("Dough", "麵團"),
    "sweet_dough": ("Sweet Dough", "甜麵團"),
    "whipped_cream": ("Whipped Cream", "打發鮮奶油"),
    "chocolate_bar": ("Chocolate Bar", "巧克力磚"),
    "toast": ("Toast", "吐司"),
    "butter_cookie": ("Butter Cookie", "奶油餅乾"),
    "croissant": ("Croissant", "可頌"),
    "egg_tart": ("Egg Tart", "蛋塔"),
    "macaron": ("Macaron", "馬卡龍"),
    "pudding": ("Caramel Pudding", "焦糖布丁"),
    "cream_puff": ("Cream Puff", "泡芙"),
    "cinnamon_roll": ("Cinnamon Roll", "肉桂捲"),
    "berry_cake_slice": ("Berry Shortcake Slice", "莓果蛋糕切片"),
    "chocolate_cake_slice": ("Chocolate Cake Slice", "巧克力蛋糕切片"),
}

M = "minecraft:"
K = f"{NS}:"
# (id, station, result_count, ingredients, shape-or-None, shaped-key)
RECIPES = [
    # --- crafting table ---
    ("flour", "crafting_table", 1, [M + "wheat"], None, None),
    ("butter", "crafting_table", 2, [M + "milk_bucket"], None, None),
    ("mixing_bowl", "crafting_table", 1, None, ["C C", " C "], {"C": M + "clay_ball"}),
    ("baking_tray", "crafting_table", 1, None, ["N N", "NNN"], {"N": M + "iron_nugget"}),
    ("oven", "crafting_table", 1, None, ["BBB", "BFB", "III"],
     {"B": M + "brick", "F": M + "furnace", "I": M + "iron_ingot"}),
    # --- mixing bowl ---
    ("dough", "mixing_bowl", 2, [K + "flour", K + "flour", M + "egg"], None, None),
    ("sweet_dough", "mixing_bowl", 2, [K + "flour", K + "flour", M + "sugar", M + "egg", K + "butter"], None, None),
    ("whipped_cream", "mixing_bowl", 3, [M + "milk_bucket", M + "sugar"], None, None),
    ("chocolate_bar", "mixing_bowl", 2, [M + "cocoa_beans", M + "cocoa_beans", M + "sugar", K + "butter"], None, None),
    # --- oven ---
    ("toast", "oven", 2, [K + "dough"], None, None),
    ("butter_cookie", "oven", 6, [K + "sweet_dough", K + "butter"], None, None),
    ("croissant", "oven", 2, [K + "dough", K + "butter"], None, None),
    ("egg_tart", "oven", 3, [K + "sweet_dough", M + "egg", M + "sugar"], None, None),
    ("macaron", "oven", 4, [K + "sweet_dough", M + "egg", M + "sweet_berries"], None, None),
    ("pudding", "oven", 1, [M + "egg", M + "milk_bucket", M + "sugar", M + "bowl"], None, None),
    ("cream_puff", "oven", 3, [K + "dough", K + "whipped_cream", M + "egg"], None, None),
    ("cinnamon_roll", "oven", 3, [K + "sweet_dough", M + "sugar", K + "butter"], None, None),
    ("berry_cake_slice", "oven", 4, [K + "sweet_dough", K + "whipped_cream", M + "sweet_berries", M + "sweet_berries"], None, None),
    ("chocolate_cake_slice", "oven", 4, [K + "sweet_dough", K + "whipped_cream", K + "chocolate_bar"], None, None),
]
STATION_TAG = {"crafting_table": "crafting_table", "mixing_bowl": f"{NS}_mixing_bowl", "oven": f"{NS}_oven"}


# ---------------------------------------------------------------- helpers
def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


def noise(x, y, seed=0):
    n = (x * 374761393 + y * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return (n ^ (n >> 16)) / 0xFFFFFFFF


def shade(rgb, f):
    return tuple(max(0, min(255, int(c * f))) for c in rgb[:3]) + (255,)


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- block materials
def mat_color(mat, x, y, w, h, seed):
    r = noise(x, y, seed)
    if mat == "brick":
        mortar = hexrgb("#d8c2a2")
        row = y // 3
        off = 2 if row % 2 else 0
        if y % 3 == 2 or (x + off) % 6 == 5:
            return mortar
        return shade(hexrgb("#b4553d"), 0.88 + 0.2 * r)
    if mat == "oven_front":
        if x < 2 or x >= w - 2 or y < 1 or y >= h - 1:
            return mat_color("brick", x, y, w, h, seed)
        if x < 3 or x >= w - 3 or y < 2 or y >= h - 3:
            return shade(hexrgb("#4a4f57"), 0.9 + 0.15 * r)
        if y >= h - 4:  # knobs row
            return hexrgb("#d9b44a") if x in (4, w - 5) else hexrgb("#4a4f57")
        glow = 1.0 - (y - 2) / max(1, h - 6) * 0.35
        base = "#ffd166" if (x + y) % 5 == 0 and r > 0.4 else "#ff9a3c"
        return shade(hexrgb(base), glow + 0.1 * r)
    if mat == "oven_top":
        return shade(hexrgb("#5b616a"), 0.9 + 0.2 * r)
    if mat == "iron":
        return shade(hexrgb("#c3cbd3"), 0.9 + 0.15 * r)
    if mat == "iron_dark":
        return shade(hexrgb("#6b7580"), 0.9 + 0.15 * r)
    if mat == "ceramic":
        return shade(hexrgb("#86bce0"), 0.95 + 0.1 * r)
    if mat == "ceramic_rim":
        return hexrgb("#f4f8fb")
    if mat == "ceramic_dark":
        return shade(hexrgb("#4f7fa8"), 0.95 + 0.1 * r)
    if mat == "batter":
        return shade(hexrgb("#f6e2b3"), 0.93 + 0.12 * r)
    if mat == "wood":
        return shade(hexrgb("#c08a55"), 0.85 + 0.2 * r)
    if mat == "cookie":
        if r > 0.85:
            return hexrgb("#5a3326")
        return shade(hexrgb("#e3a55a"), 0.9 + 0.15 * r)
    raise ValueError(f"unknown material {mat}")


FACE_DIMS = {  # face -> (horizontal axis index, vertical axis index) into size [x,y,z]
    "north": (0, 1), "south": (0, 1), "east": (2, 1), "west": (2, 1), "up": (0, 2), "down": (0, 2),
}


def build_block(name, spec):
    # collect faces
    rects = []
    for ci, c in enumerate(spec["cubes"]):
        for face, mat in c["faces"].items():
            a, b = FACE_DIMS[face]
            w, h = max(1, c["size"][a]), max(1, c["size"][b])
            rects.append({"cube": ci, "face": face, "mat": mat, "w": w, "h": h})
    # shelf pack
    tw = 64
    while True:
        x = y = shelf_h = 0
        ok = True
        for r in sorted(rects, key=lambda r: (-r["h"], -r["w"])):
            if x + r["w"] > tw:
                x, y, shelf_h = 0, y + shelf_h, 0
            r["u"], r["v"] = x, y
            x += r["w"]
            shelf_h = max(shelf_h, r["h"])
        th = y + shelf_h
        if th <= tw:
            break
        tw *= 2
    th = tw
    img = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    for i, r in enumerate(rects):
        for py in range(r["h"]):
            for px in range(r["w"]):
                img.putpixel((r["u"] + px, r["v"] + py), mat_color(r["mat"], px, py, r["w"], r["h"], i))
    tex_path = RP / "textures" / "blocks" / f"{name}.png"
    tex_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(tex_path)

    cubes = []
    for ci, c in enumerate(spec["cubes"]):
        uv = {}
        for r in rects:
            if r["cube"] == ci:
                uv[r["face"]] = {"uv": [r["u"], r["v"]], "uv_size": [r["w"], r["h"]]}
        cubes.append({"origin": c["origin"], "size": c["size"], "uv": uv})
    geo = {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": f"geometry.{NS}_{name}",
                "texture_width": tw,
                "texture_height": th,
                "visible_bounds_width": 2,
                "visible_bounds_height": 2.5,
                "visible_bounds_offset": [0, 0.75, 0],
            },
            "bones": [{"name": "root", "pivot": [0, 0, 0], "cubes": cubes}],
        }],
    }
    write_json(RP / "models" / "blocks" / f"{name}.geo.json", geo)

    # behaviour definition
    origin, size = spec["collision"]
    comps = {
        "minecraft:geometry": f"geometry.{NS}_{name}",
        "minecraft:material_instances": {"*": {"texture": f"{NS}_{name}", "render_method": "alpha_test"}},
        "minecraft:destructible_by_mining": {"seconds_to_destroy": 1.5},
        "minecraft:destructible_by_explosion": {"explosion_resistance": 6},
        "minecraft:map_color": "#b4553d" if name == "oven" else "#c3cbd3",
        "minecraft:collision_box": {"origin": origin, "size": size},
        "minecraft:selection_box": {"origin": origin, "size": size},
    }
    if not spec["full_block"]:
        comps["minecraft:light_dampening"] = 0
    if spec["station"]:
        comps["minecraft:crafting_table"] = {
            "table_name": f"tile.{NS}:{name}.name",
            "crafting_tags": [STATION_TAG[name]],
        }
    desc = {"identifier": f"{NS}:{name}", "menu_category": {"category": "items"}}
    block = {"description": desc, "components": comps}
    if spec["rotatable"]:
        desc["traits"] = {"minecraft:placement_direction": {
            "enabled_states": ["minecraft:cardinal_direction"], "y_rotation_offset": 180}}
        rot = {"north": 0, "west": 90, "south": 180, "east": -90}
        block["permutations"] = [
            {"condition": f"q.block_state('minecraft:cardinal_direction') == '{d}'",
             "components": {"minecraft:transformation": {"rotation": [0, deg, 0]}}}
            for d, deg in rot.items()
        ]
    write_json(BP / "blocks" / f"{name}.json", {"format_version": FMT, "minecraft:block": block})


# ---------------------------------------------------------------- items
def render_icon(grid):
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    assert len(grid) <= 16
    for y, row in enumerate(grid):
        assert len(row) <= 16, row
        for x, ch in enumerate(row):
            col = PALETTE[ch]
            if col:
                img.putpixel((x, y), hexrgb(col))
    return img


def item_icon(name):
    """Prefer a chosen Retro Diffusion icon (art/icons/<name>.png); fall back to the hand-drawn grid."""
    chosen = ROOT / "art" / "icons" / f"{name}.png"
    if chosen.exists():
        img = Image.open(chosen).convert("RGBA")
        if img.size != (16, 16):
            img = img.resize((16, 16), Image.NEAREST)
        a = img.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
        img.putalpha(a)
        return img
    return render_icon(ITEMS[name])


def build_item(name):
    img = item_icon(name)
    p = RP / "textures" / "items" / f"{name}.png"
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p)
    comps = {
        "minecraft:icon": f"{NS}_{name}",
        "minecraft:display_name": {"value": f"item.{NS}:{name}.name"},
        "minecraft:max_stack_size": 64,
    }
    if name in FOOD:
        nut, sat, conv = FOOD[name]
        food = {"nutrition": nut, "saturation_modifier": sat}
        if conv:
            food["using_converts_to"] = conv
        comps["minecraft:food"] = food
        comps["minecraft:use_animation"] = "eat"
        comps["minecraft:use_modifiers"] = {"use_duration": 1.6, "movement_modifier": 0.35}
    write_json(BP / "items" / f"{name}.json", {
        "format_version": FMT,
        "minecraft:item": {"description": {"identifier": f"{NS}:{name}", "menu_category": {"category": "items"}},
                           "components": comps},
    })


def build_recipes():
    out = BP / "recipes"
    for rid, station, count, ingredients, shape, key in RECIPES:
        desc = {"identifier": f"{NS}:{rid}"}
        body = {
            "description": desc,
            "tags": [STATION_TAG[station]],
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
        write_json(out / f"{rid}.json", data)


# ---------------------------------------------------------------- packs
def manifests():
    write_json(BP / "manifest.json", {
        "format_version": 2,
        "header": {"name": "pack.name", "description": "pack.description", "uuid": UUID_BP_HEADER,
                   "version": VERSION, "min_engine_version": MIN_ENGINE},
        "modules": [{"type": "data", "uuid": UUID_BP_MODULE, "version": VERSION}],
        "dependencies": [{"uuid": UUID_RP_HEADER, "version": VERSION}],
    })
    write_json(RP / "manifest.json", {
        "format_version": 2,
        "header": {"name": "pack.name", "description": "pack.description", "uuid": UUID_RP_HEADER,
                   "version": VERSION, "min_engine_version": MIN_ENGINE},
        "modules": [{"type": "resources", "uuid": UUID_RP_MODULE, "version": VERSION}],
        "dependencies": [{"uuid": UUID_BP_HEADER, "version": VERSION}],
    })


def lang():
    for pack, kind in ((BP, "Behavior"), (RP, "Resource")):
        for code, idx, title, desc in (
            ("en_US", 0, f"Kaleidoscope Baking {kind} Pack", "Ovens, mixing bowls and delicious desserts."),
            ("zh_TW", 1, f"萬花筒烘焙 {'行為包' if kind == 'Behavior' else '資源包'}", "烤箱、攪拌碗與各式甜點。"),
        ):
            lines = [f"pack.name={title}", f"pack.description={desc}"]
            if pack is RP:
                lines += [f"item.{NS}:{n}.name={v[idx]}" for n, v in ITEM_NAMES.items()]
                lines += [f"tile.{NS}:{n}.name={b['display'][idx]}" for n, b in BLOCKS.items()]
            p = pack / "texts" / f"{code}.lang"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text("\n".join(lines) + "\n", encoding="utf-8")
        write_json(pack / "texts" / "languages.json", ["en_US", "zh_TW"])

    write_json(RP / "textures" / "item_texture.json", {
        "resource_pack_name": "kaleidoscope_baking", "texture_name": "atlas.items",
        "texture_data": {f"{NS}_{n}": {"textures": f"textures/items/{n}"} for n in ITEMS},
    })
    write_json(RP / "textures" / "terrain_texture.json", {
        "resource_pack_name": "kaleidoscope_baking", "texture_name": "atlas.terrain", "padding": 8,
        "num_mip_levels": 4,
        "texture_data": {f"{NS}_{n}": {"textures": f"textures/blocks/{n}"} for n in BLOCKS},
    })
    write_json(RP / "blocks.json", {
        "format_version": [1, 1, 0],
        **{f"{NS}:{n}": {"sound": "stone" if n == "oven" else "metal" if n == "baking_tray" else "stone"}
           for n in BLOCKS},
    })

    icon = item_icon("berry_cake_slice").resize((128, 128), Image.NEAREST)
    bg = Image.new("RGBA", (128, 128), hexrgb("#fde9d2"))
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
    for name in ITEMS:
        assert name in ITEM_NAMES, f"missing display name for {name}"
        build_item(name)
    for name, spec in BLOCKS.items():
        build_block(name, spec)
    build_recipes()
    manifests()
    lang()
    print("built", package())


if __name__ == "__main__":
    main()
