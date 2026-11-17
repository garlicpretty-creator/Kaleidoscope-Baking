"""Writes every Baking block model + texture from tools/art (stations; desserts, plants and oven are added below).

Usage: python tools/art/build_models.py [--audit]
Also called by tools/gen_content.py. Exits non-zero when the z-fight audit finds a problem.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
RP = os.path.join(ROOT, "RP")

import kit  # noqa: E402
import desserts  # noqa: E402
import drinks  # noqa: E402
import oven  # noqa: E402
import plants  # noqa: E402
import stations  # noqa: E402
import visuals  # noqa: E402

NS = "kaleidoscope_baking"


STATS = {}  # model -> (cubes, faces)
WRITTEN = []  # repo-relative paths of every JSON file this build wrote


def write_json(rel, data):
    WRITTEN.append(rel.replace("/", os.sep))
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def build_stations():
    problems, bounds = [], {}
    for sid, fn in stations.MODELS.items():
        boxes, painters = fn()
        problems += kit.audit(boxes, sid)
        tex = kit.Painted(boxes)
        write_json(f"RP/models/blocks/{sid}.geo.json", tex.geometry(f"geometry.{NS}.{sid}", boxes))
        tex.image(painters).save(os.path.join(RP, "textures", "blocks", f"kb_{sid}.png"))
        bounds[sid] = kit.bounds_of([b for b in boxes if not b.instance])
        STATS[sid] = kit.count_faces(boxes)
    return problems, bounds


def build_desserts():
    problems, info = [], {}
    for did in desserts.DESSERTS:
        per_q, painters = desserts.models(did)
        tex = kit.Painted(list(per_q.values()), shade=False)  # one texture for all four slice states
        for q, boxes in per_q.items():
            problems += kit.audit(boxes, f"{did}_q{q}")
            write_json(f"RP/models/blocks/{did}_q{q}.geo.json", tex.geometry(f"geometry.{NS}.{did}_q{q}", boxes))
        tex.image(painters).save(os.path.join(RP, "textures", "blocks", f"kb_{did}.png"))
        whole = per_q[4]
        info[did] = {"bounds": kit.bounds_of(whole), "height": max(b.hi[1] for b in whole)}
        STATS[did] = kit.count_faces(whole)
    return problems, info


def build_drinks():
    problems, bounds = [], {}
    per_n = drinks.models()
    tex = kit.Painted(list(per_n.values()))  # one layout shared by every drink texture
    for n, boxes in per_n.items():
        problems += kit.audit(boxes, f"mug_{n}")
        write_json(f"RP/models/blocks/mug_{n}.geo.json", tex.geometry(f"geometry.{NS}.mug_{n}", boxes))
        bounds[n] = kit.bounds_of(boxes)
    STATS["mug_4"] = kit.count_faces(per_n[4])
    for did in drinks.DRINKS:
        tex.image(drinks.painters_for(did)).save(os.path.join(RP, "textures", "blocks", f"kb_drink_{did}.png"))
    return problems, bounds


def plane(x0, z0, x1, z1, h=16, y0=0):
    """Vertical single-sided plant plane with a face on each side (mirrored), spanning the whole 16x16 texture."""
    if z0 == z1:
        return {"origin": [x0, y0, z0], "size": [x1 - x0, h, 0],
                "uv": {"north": {"uv": [0, 0], "uv_size": [16, 16]}, "south": {"uv": [16, 0], "uv_size": [-16, 16]}}}
    return {"origin": [x0, y0, z0], "size": [0, h, z1 - z0],
            "uv": {"west": {"uv": [0, 0], "uv_size": [16, 16]}, "east": {"uv": [16, 0], "uv_size": [-16, 16]}}}


def plant_geo(gid, cubes):
    return {"format_version": "1.21.60", "minecraft:geometry": [{
        "description": {"identifier": gid, "texture_width": 16, "texture_height": 16,
                        "visible_bounds_width": 2, "visible_bounds_height": 2.5, "visible_bounds_offset": [0, 0.75, 0]},
        "bones": [{"name": "plant", "pivot": [0, 0, 0], "cubes": cubes}]}]}


def build_plants():
    # bushes: two diagonal planes. Each plane is single-sided per face, so the front and back faces of the same
    # plane never draw over each other (with a double-sided material they z-fight).
    cross = []
    for rot in (45, -45):
        c = plane(-8, 0, 8, 0)
        c.update({"pivot": [0, 8, 0], "rotation": [0, rot, 0]})
        cross.append(c)
    write_json("RP/models/blocks/cross.geo.json", plant_geo(f"geometry.{NS}.cross", cross))
    # annual crops: the vanilla '#' layout, four planes 4 px in from the block edges
    crop = [plane(-8, -4, 8, -4), plane(-8, 4, 8, 4), plane(-4, -8, -4, 8), plane(4, -8, 4, 8)]
    write_json("RP/models/blocks/crop.geo.json", plant_geo(f"geometry.{NS}.crop", crop))
    return plants.build(os.path.join(RP, "textures", "blocks"))


def sheet(rows, path, scale=4, cols=12):
    from PIL import ImageDraw
    from PIL import Image
    cell = 16 * scale + 8
    n = len(rows)
    img = Image.new("RGBA", (cols * cell + 8, ((n + cols - 1) // cols) * (cell + 14) + 8), (104, 118, 100, 255))
    d = ImageDraw.Draw(img)
    for i, (name, im) in enumerate(rows):
        x, y = 8 + (i % cols) * cell, 8 + (i // cols) * (cell + 14)
        img.alpha_composite(im.resize((16 * scale, 16 * scale), Image.NEAREST), (x, y))
        d.text((x, y + 16 * scale), name.replace("_stage_", ":")[:12], fill=(240, 240, 240))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


def oven_preview(t, path, s=8):
    """Front (unlit and lit) and top of the assembled 3x3x3 oven."""
    from PIL import Image
    im = Image.new("RGBA", (3 * 48 * 3 + 40, 48 * 3 + 20), (104, 118, 100, 255))
    def face(grid, ox):
        for gy, row in enumerate(grid):
            for gx, name in enumerate(row):
                im.alpha_composite(t[name].resize((48, 48), Image.NEAREST), (ox + gx * 48, 10 + gy * 48))
    b_, d_, f_ = "oven_brick", "oven_door", "oven_firebox"
    face([[b_, b_, b_], [b_, d_, b_], [b_, f_, b_]], 10)
    face([[b_, b_, b_], [b_, d_, b_], [b_, "oven_firebox_lit", b_]], 10 + 154)
    tp = "oven_top"
    face([[tp, tp, tp], [tp, "oven_chimney", tp], [tp, tp, tp]], 10 + 308)
    im.save(path)


def write_particles():
    """Steam over hot drinks and the espresso machine, and the oven's flickering fire (flipbook texture)."""
    write_json("RP/particles/kb_steam.particle.json", {"format_version": "1.10.0", "particle_effect": {
        "description": {"identifier": f"{NS}:steam", "basic_render_parameters": {
            "material": "particles_blend", "texture": "textures/particle/particles"}},
        "components": {
            "minecraft:emitter_rate_instant": {"num_particles": 3},
            "minecraft:emitter_lifetime_once": {"active_time": 0.1},
            "minecraft:emitter_shape_disc": {"radius": 0.12, "direction": [0, 1, 0]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": "1.4 + math.random(0, 0.6)"},
            "minecraft:particle_initial_speed": 0.25,
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 0.15, 0], "linear_drag_coefficient": 1.2},
            "minecraft:particle_appearance_billboard": {
                "size": ["0.06 + v.particle_age * 0.05", "0.06 + v.particle_age * 0.05"], "facing_camera_mode": "lookat_xyz",
                "uv": {"texture_width": 128, "texture_height": 128, "flipbook": {
                    "base_UV": [56, 0], "size_UV": [8, 8], "step_UV": [-8, 0], "frames_per_second": 4, "max_frame": 8,
                    "stretch_to_lifetime": True}}},
            "minecraft:particle_appearance_tinting": {"color": ["1", "1", "1", "0.55 - v.particle_age / v.particle_lifetime * 0.55"]}}}})
    # oven fire: 4-frame flipbook of kb_oven_firebox_lit
    from PIL import Image
    import oven as OV
    frames = Image.new("RGBA", (16, 64))
    for f in range(4):
        img = Image.new("RGBA", (16, 16))
        for y in range(16):
            for x in range(16):
                img.putpixel((x, y), tuple(OV.firebox(x, y, True, frame=f)[:3]) + (255,))
        frames.paste(img, (0, f * 16))
    frames.save(os.path.join(RP, "textures", "blocks", "kb_oven_firebox_lit.png"))
    write_json("RP/textures/flipbook_textures.json", [
        {"flipbook_texture": "textures/blocks/kb_oven_firebox_lit", "atlas_tile": "kb_oven_firebox_lit", "ticks_per_frame": 3}])


def build_all():
    problems, bounds = build_stations()
    p2, dessert_info = build_desserts()
    ov = dict(oven.build(os.path.join(RP, "textures", "blocks")))
    oven_preview(ov, os.path.join(ROOT, "art", "previews", "oven.png"))
    p3, mugs = build_drinks()
    p3 += visuals.build(write_json, RP, os.path.join(ROOT, "BP"))
    write_particles()
    made = build_plants()
    sheet([m for m in made if not m[0].startswith(("sesame_crop_stage_1", "sesame_crop_stage_3", "sesame_crop_stage_5", "sesame_crop_stage_7", "stevia_crop_stage_1", "stevia_crop_stage_3", "stevia_crop_stage_5", "stevia_crop_stage_7", "cassava_crop_stage_1", "cassava_crop_stage_3", "cassava_crop_stage_5", "cassava_crop_stage_7"))],
          os.path.join(ROOT, "art", "previews", "plants.png"))
    return {"problems": problems + p2 + p3, "bounds": bounds, "desserts": dessert_info, "mugs": mugs}


if __name__ == "__main__":
    out = build_all()
    for p in out["problems"]:
        print(p)
    for k, (c, f) in sorted(STATS.items()):
        print(f"{k:24} {c:3} cubes {f:4} faces")
    print(f"{len(out['problems'])} problems")
    sys.exit(1 if out["problems"] else 0)
