#!/usr/bin/env python3
"""Create starter Blockbench projects (.bbmodel) for the kitchenware blocks.

    python bedrock/tools/make_bbmodel.py [block ...] [--force]

Writes bedrock/models/<block>.bbmodel (Blockbench "Bedrock Block" format, texture embedded)
from the cube lists in bedrock/src/block_models.py. After that the .bbmodel file is the
source of truth: open it in Blockbench, edit, save (Ctrl+S), then run bedrock/build.py.
Existing files are NOT overwritten unless --force is given, so Blockbench edits are safe.
"""
import argparse
import base64
import io
import json
import sys
import uuid
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from block_models import BLOCKS  # noqa: E402
import textures as T  # noqa: E402

MODELS = ROOT / "models"
NS = "kb"

FACE_DIMS = {  # face -> (horizontal axis index, vertical axis index) into size [x,y,z]
    "north": (0, 1), "south": (0, 1), "east": (2, 1), "west": (2, 1), "up": (0, 2), "down": (0, 2),
}



def uid(*parts):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "kaleidoscope-baking/" + "/".join(map(str, parts))))


def png_uri(img):
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def preview(tex):
    """Preview image for a material-instance texture (the game swaps it per block state)."""
    if tex == "glass":
        return T.glass()
    if tex == "fire":
        return T.fire(True)
    if tex == "batter":
        return T.batter(T.hexrgb("#f6e2b3"))
    if tex == "plant":
        p = ROOT / "art" / "plants" / "strawberry_bush_3.png"
        return Image.open(p).convert("RGBA") if p.exists() else T.blank()
    if tex == "food":
        p = ROOT / "art" / "icons" / "croissant.png"
        return Image.open(p).convert("RGBA") if p.exists() else T.blank()
    raise ValueError(tex)


def texture_entry(name, idx, img):
    w, h = img.size
    return {
        "path": "", "name": f"{name}.png", "folder": "", "namespace": "", "id": str(idx),
        "width": w, "height": h, "uv_width": w, "uv_height": h,
        "particle": idx == 0, "use_as_default": False, "layers_enabled": False,
        "sync_to_project": "", "render_mode": "default", "render_sides": "auto",
        "frame_time": 1, "frame_order_type": "loop", "frame_order": "", "frame_interpolate": False,
        "visible": True, "internal": True, "saved": True, "uuid": uid(name, "texture", idx),
        "source": png_uri(img),
    }


def face_size(face, size):
    a, b = FACE_DIMS[face]
    return size[a], size[b]


def make(name, spec):
    cubes = spec["cubes"]
    extra = []  # material-instance textures in order of first use
    for c in cubes:
        if c["tex"] and c["tex"] not in extra:
            extra.append(c["tex"])

    rects = []
    for ci, c in enumerate(cubes):
        if c["tex"]:
            continue
        for face, mat in c["faces"].items():
            w, h = face_size(face, c["size"])
            if w and h and mat:
                rects.append({"cube": ci, "face": face, "mat": mat, "w": w, "h": h})
    tw = 64
    while True:  # shelf packing into a square atlas
        x = y = shelf = 0
        for r in sorted(rects, key=lambda r: (-r["h"], -r["w"])):
            if x + r["w"] > tw:
                x, y, shelf = 0, y + shelf, 0
            r["u"], r["v"] = x, y
            x += r["w"]
            shelf = max(shelf, r["h"])
        if y + shelf <= tw:
            break
        tw *= 2
    atlas = Image.new("RGBA", (tw, tw), (0, 0, 0, 0))
    for i, r in enumerate(rects):
        for py in range(r["h"]):
            for px in range(r["w"]):
                atlas.putpixel((r["u"] + px, r["v"] + py), T.mat_color(r["mat"], px, py, r["w"], r["h"], i))

    elements, groups = [], {}
    for ci, c in enumerate(cubes):
        (ox, oy, oz), (sx, sy, sz) = c["origin"], c["size"]
        faces = {}
        if c["tex"]:
            ti = 1 + extra.index(c["tex"])
            for face in c["faces"]:
                w, h = face_size(face, c["size"])
                if w and h:
                    faces[face] = {"uv": [0, 0, 16, 16], "texture": ti}
        else:
            for r in rects:
                if r["cube"] == ci:
                    faces[r["face"]] = {"uv": [r["u"], r["v"], r["u"] + r["w"], r["v"] + r["h"]], "texture": 0}
        el = {
            "name": c["name"],
            "box_uv": False, "rescale": False, "locked": False, "render_order": "default",
            "allow_mirror_modeling": True,
            # Blockbench mirrors X for Bedrock: from.x = -(origin.x + size.x)
            "from": [-(ox + sx), oy, oz], "to": [-ox, oy + sy, oz + sz],
            "autouv": 0, "color": ci % 8,
            # pivot / rotation, mirrored the same way Blockbench does for Bedrock
            "origin": [-(c.get("pivot") or [0, 0, 0])[0], *(c.get("pivot") or [0, 0, 0])[1:]],
            "faces": faces, "type": "cube", "uuid": uid(name, "cube", c["name"]),
        }
        if c.get("rotation"):
            r = c["rotation"]
            el["rotation"] = [-r[0], -r[1], r[2]]
        elements.append(el)
        groups.setdefault(c["bone"], []).append(el["uuid"])

    outliner = [{
        "name": bone, "origin": [0, 0, 0], "color": 0, "uuid": uid(name, "group", bone),
        "export": True, "mirror_uv": False, "isOpen": True, "locked": False,
        "visibility": True, "autouv": 0, "children": kids,
    } for bone, kids in groups.items()]
    textures = [texture_entry(name, 0, atlas)] + [texture_entry(t, i + 1, preview(t)) for i, t in enumerate(extra)]
    return {
        "meta": {"format_version": "4.10", "model_format": "bedrock_block", "box_uv": False},
        "name": name,
        "model_identifier": f"{NS}_{name}",
        "visible_box": [2, 2.5, 0.75],
        "variable_placeholders": "",
        "variable_placeholder_buttons": [],
        "timeline_setups": [],
        "unhandled_root_fields": {},
        "resolution": {"width": tw, "height": tw},
        "elements": elements,
        "outliner": outliner,
        "textures": textures,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("blocks", nargs="*")
    ap.add_argument("--force", action="store_true", help="overwrite existing .bbmodel files")
    args = ap.parse_args()
    MODELS.mkdir(exist_ok=True)
    for name in args.blocks or BLOCKS:
        out = MODELS / f"{name}.bbmodel"
        if out.exists() and not args.force:
            print("skip (exists)", out)
            continue
        out.write_text(json.dumps(make(name, BLOCKS[name]), indent="\t"), encoding="utf-8")
        print("wrote", out)


if __name__ == "__main__":
    main()
