"""Checks that every block's geometry and textures resolve, and that every face UV stays inside its texture."""
import glob
import json
import os
import sys

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))


def load(p):
    with open(p, encoding="utf8") as f:
        return json.load(f)


geos = {}
for p in glob.glob(os.path.join(ROOT, "RP", "models", "blocks", "*.json")):
    g = load(p)["minecraft:geometry"][0]
    geos[g["description"]["identifier"]] = g
terrain = load(os.path.join(ROOT, "RP", "textures", "terrain_texture.json"))["texture_data"]
errors = []


def tex_size(key):
    rel = terrain[key]["textures"]
    path = os.path.join(ROOT, "RP", rel + ".png")
    if not os.path.exists(path):
        errors.append(f"missing texture file {rel}.png")
        return None
    return Image.open(path).size


for p in glob.glob(os.path.join(ROOT, "BP", "blocks", "*.json")):
    blk = load(p)["minecraft:block"]
    comps = [blk.get("components", {})] + [x.get("components", {}) for x in blk.get("permutations", [])]
    for c in comps:
        g = c.get("minecraft:geometry")
        gid = g if isinstance(g, str) else (g or {}).get("identifier")
        if gid and not gid.startswith("minecraft:") and gid not in geos:
            errors.append(f"{os.path.basename(p)}: unknown geometry {gid}")
        for inst, m in (c.get("minecraft:material_instances") or {}).items():
            if m["texture"] not in terrain:
                errors.append(f"{os.path.basename(p)}: unknown texture {m['texture']}")
            else:
                size = tex_size(m["texture"])
                if gid in geos and size:
                    d = geos[gid]["description"]
                    if inst == "*" and (d["texture_width"], d["texture_height"]) != size:
                        errors.append(f"{os.path.basename(p)}: {gid} is {d['texture_width']}x{d['texture_height']} but {m['texture']} is {size}")
for gid, g in geos.items():
    W, H = g["description"]["texture_width"], g["description"]["texture_height"]
    for bone in g["bones"]:
        for cube in bone.get("cubes", []):
            for f, uv in cube["uv"].items():
                u0, v0 = uv["uv"]
                u1, v1 = u0 + uv["uv_size"][0], v0 + uv["uv_size"][1]
                if min(u0, u1) < 0 or max(u0, u1) > W or min(v0, v1) < 0 or max(v0, v1) > H:
                    errors.append(f"{gid}: {f} uv {uv} outside {W}x{H}")
for path in glob.glob(os.path.join(ROOT, "RP", "textures", "blocks", "*.png")):
    im = Image.open(path).convert("RGBA")
    px = im.load()
    if any(px[x, y][:3] == (255, 0, 255) and px[x, y][3] for y in range(im.height) for x in range(im.width)):
        errors.append(f"{os.path.basename(path)}: contains the magenta 'missing colour'")
for e in errors:
    print(e)
print(f"{len(errors)} reference problems in {len(geos)} geometries")
sys.exit(1 if errors else 0)
