"""Animated station visuals: one client entity (kaleidoscope_baking:station_visual) that sits on a station block.

Same pattern as Cookery's millstone_visual. Scripts set four entity properties and the client animates:
  kind      1 bowl, 2 proofing basket, 3 decorating stand, 4 espresso machine, 5 pour-over stand, 6 drink shaker,
            7 oven door (sits on the oven's door block: swings open, its window glows while baking)
  fill      0..16 how much is in it (ingredients, layers, coffee level); 0 hides the contents
  tint      0..7  colour of the contents (TINTS)
  progress  0..1  proofing rise / brewing progress
  active    while true the motion plays (whisking, brewing stream, drips, shaking, oven door open)
  pop       a short bounce of the contents when something is added
Moving parts are painted low-poly boxes (kit.Painted); contents are boxes textured with a tint swatch.
No text anywhere: what is in the station and what it is doing is shown by the model itself.
"""
import math

from kit import Box, Painted, noise, painter, ramp

NS = "kaleidoscope_baking"
KINDS = {1: "bowl", 2: "proof", 3: "stand", 4: "espresso", 5: "pour", 6: "shaker", 7: "oven"}
TINTS = [(240, 214, 160), (110, 70, 45), (150, 190, 90), (240, 150, 170), (248, 214, 96), (250, 246, 236),
         (76, 44, 26), (200, 130, 50)]  # dough, chocolate, matcha, strawberry, egg, cream, coffee, caramel
CLEAR = (0, 0, 0, 0)
STEEL = ramp((186, 192, 200), lo=0.58, hi=1.25)
OAK = ramp((170, 124, 76))
COFFEE = ramp((76, 44, 26))


# --------------------------------------------------------------------------------------------- painters
@painter
def steel(t):
    if t.side:
        row = noise(int(t.y * 2 + 64), 3, 5)
        return STEEL[3] if row > 0.8 else (STEEL[1] if row < 0.15 else STEEL[2])
    return STEEL[3]


@painter
def wire(t):
    """Balloon whisk cage: wires on the edges and one across the middle, open in between."""
    if t.u in (0, t.w - 1) or t.v == t.h - 1 or t.u == t.w // 2:
        return STEEL[4]
    return CLEAR


wire.shade = False


@painter
def handle(t):
    return OAK[1] if int(t.y * 2) % 3 == 0 else OAK[2]


@painter
def stream(t):
    return COFFEE[3] if (t.u + t.v) % 2 else COFFEE[2]


stream.shade = False


@painter
def drop(t):
    return (110, 70, 40)


IRON = ramp((64, 62, 66), lo=0.6, hi=1.7)


@painter
def door_panel(t):
    """Cast-iron oven door: riveted frame, dark glass window, brass handle (the glow is its own bone)."""
    if t.face not in ("south", "north"):
        return IRON[1]
    u, v, w, h = t.u, t.v, t.w, t.h
    if u in (0, w - 1) or v in (0, h - 1):
        return IRON[1]
    if (u, v) in ((1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2)):
        return IRON[4]
    if 3 <= u <= w - 4 and 3 <= v <= 5:
        return (34, 26, 24) if u not in (3, w - 4) and v not in (3, 5) else IRON[3]
    return IRON[3] if noise(u, v, 17) > 0.9 else IRON[2]


@painter
def brass(t):
    return (214, 170, 72) if t.v == 0 else (160, 120, 44)


@painter
def glow(t):
    return (250, 196, 96) if (t.u + t.v) % 3 else (226, 132, 48)


glow.shade = False


def tint_swatch(c):
    """16x16 contents texture for one tint: grain plus a lighter top edge, so batter / dough / cake read as food."""
    from PIL import Image
    r = ramp(c, lo=0.78, hi=1.14)
    img = Image.new("RGBA", (16, 16))
    for y in range(16):
        for x in range(16):
            n = noise(x, y, 61)
            col = r[3] if n > 0.86 else (r[1] if n < 0.14 else r[2])
            if y == 0:
                col = r[4]
            img.putpixel((x, y), col + (255,))
    return img


# --------------------------------------------------------------------------------------------- models
def parts(kind):
    """Moving parts: (boxes, painters, pivots)."""
    if kind == "bowl":
        return ([Box(-1.5, 4.5, -1.5, 1.5, 7, 1.5, "wire", bone="bowl_whisk"),
                 Box(-0.5, 7, -0.5, 0.5, 12, 0.5, "handle", bone="bowl_whisk")],
                {"wire": wire, "handle": handle}, {"bowl_whisk": (0, 4.5, 0)})
    if kind == "espresso":
        return ([Box(-0.25, 4.75, 3.25, 0.25, 7, 3.75, "stream", bone="stream")], {"stream": stream}, {"stream": (0, 7, 3.5)})
    if kind == "pour":
        return ([Box(-0.25, 9, 1.75, 0.25, 9.5, 2.25, "drop", bone="drops"),
                 Box(-0.25, 7, 1.75, 0.25, 7.5, 2.25, "drop", bone="drops")], {"drop": drop}, {"drops": (0, 9, 2)})
    if kind == "oven":
        # local space of the door block: its front face is z = 8. The door hangs half a pixel in front of it
        # (never coplanar with the block face) and swings on its hinge at x = -6.
        return ([Box(-6, 1.5, 8.5, 6, 14.5, 9.5, "panel", bone="door"),
                 Box(2.5, 6, 9.5, 4, 8.5, 10.5, "brass", bone="door"),
                 Box(-3, 9, 9.5, 3, 11, 9.75, "glow", bone="door_glow")],
                {"panel": door_panel, "brass": brass, "glow": glow}, {"door": (-6, 8, 9), "door_glow": (0, 10, 9.5)},
                {"door_glow": "door"})
    if kind == "shaker":
        return ([Box(-6, 1, -4, 0, 8, 2, "steel", bone="shaker"), Box(-5, 8, -3, -1, 10, 1, "steel", bone="shaker"),
                 Box(-4, 10, -2, -2, 11, 0, "steel", bone="shaker")], {"steel": steel}, {"shaker": (-3, 1, -1)})
    return None


# contents: (bone, box (x0, y0, z0, x1, y1, z1), pivot)
CONTENTS = {
    "bowl": ("bowl_batter", (-5, 3.5, -5, 5, 4.5, 5), (0, 4.5, 0)),
    "proof": ("dough", (-3, 1, -3, 3, 3.5, 3), (0, 1, 0)),
    "stand": ("cake", (-4, 8, -4, 4, 10, 4), (0, 8, 0)),
    "espresso": ("crema", (-1, 4.5, 3, 1, 4.75, 5), (0, 4.5, 4)),
    "pour": ("carafe", (-3, 1, -1, 3, 5, 5), (0, 1, 2)),
    "shaker": ("ice", (2, 7.5, 1, 4, 8, 3), (3, 7.5, 2)),
    "oven": ("tray", (-4, 5, 0, 4, 5.5, 6), (0, 5, 3)),
}


def contents_geometry(kind):
    bone, (x0, y0, z0, x1, y1, z1), pivot = CONTENTS[kind]
    full = {"uv": [0, 0], "uv_size": [16, 16]}
    cube = {"origin": [x0, y0, z0], "size": [x1 - x0, y1 - y0, z1 - z0],
            "uv": {f: dict(full) for f in ("north", "south", "east", "west", "up")}}
    return {"format_version": "1.21.60", "minecraft:geometry": [{
        "description": {"identifier": f"geometry.{NS}.visual_{kind}_contents", "texture_width": 16, "texture_height": 16,
                        "visible_bounds_width": 2, "visible_bounds_height": 2, "visible_bounds_offset": [0, 0.5, 0]},
        "bones": [{"name": bone, "pivot": list(pivot), "cubes": [cube]}]}]}


# --------------------------------------------------------------------------------------------- animations (molang)
P = lambda name: f"q.property('{NS}:{name}')"  # noqa: E731
ACTIVE = P("active")
ANIMATIONS = {
    "bowl": {
        "bowl_whisk": {"position": [f"math.sin(q.life_time * 540) * 2", 0, f"math.cos(q.life_time * 540) * 2"],
                       "rotation": [0, "q.life_time * 540", 0], "scale": f"{ACTIVE} ? 1 : 0"},
        "bowl_batter": {"position": [0, "v.kb_level * 0.25", 0], "rotation": [0, f"{ACTIVE} ? q.life_time * 180 : 0", 0],
                        "scale": [1, "1 + v.kb_pop * 0.6", 1]},
    },
    "proof": {
        "dough": {"scale": "(0.75 + v.kb_prog * 0.45 + math.sin(q.life_time * 90) * 0.03 * (1 - v.kb_prog)) * (1 + v.kb_pop * 0.12)"},
    },
    "stand": {
        "cake": {"scale": ["1 + v.kb_pop * 0.08", "(0.5 + v.kb_level * 0.5) * (1 - v.kb_pop * 0.1)", "1 + v.kb_pop * 0.08"],
                 "rotation": [0, "q.life_time * 24", 0]},
    },
    "espresso": {
        "stream": {"scale": [f"{ACTIVE} ? 1 + math.sin(q.life_time * 900) * 0.3 : 0", f"{ACTIVE} ? 1 : 0", f"{ACTIVE} ? 1 : 0"]},
        "crema": {"scale": [1, f"{P('progress')} >= 1 ? 1 : 0", 1]},
    },
    "pour": {
        "drops": {"position": [0, "-math.mod(q.life_time * 10, 3)", 0], "scale": f"{ACTIVE} ? 1 : 0"},
        "carafe": {"scale": [1, "math.max(0.02, v.kb_level / 4)", 1]},
    },
    "oven": {
        "door": {"rotation": [0, "-v.kb_door * 105", 0]},
        "door_glow": {"scale": f"{P('progress')} > 0 ? 1 + math.sin(q.life_time * 400) * 0.06 : 0"},
    },
    "shaker": {
        "shaker": {"rotation": [f"{ACTIVE} ? math.sin(q.life_time * 1500) * 14 : 0", 0, f"{ACTIVE} ? math.cos(q.life_time * 1500) * 14 : 0"],
                   "position": [0, f"{ACTIVE} ? math.abs(math.sin(q.life_time * 1500)) * 1.5 : 0", 0]},
    },
}


def build(write_json, rp, bp):
    """Writes geometry, textures, client entity, render controllers, animations and the behaviour entity."""
    import os
    geos, textures, problems = {}, {}, []
    os.makedirs(os.path.join(rp, "textures", "entity"), exist_ok=True)
    for kid, kind in KINDS.items():
        pv = parts(kind)
        if pv:
            boxes, painters, pivots = pv[:3]
            parents = pv[3] if len(pv) > 3 else {}
            tex = Painted(boxes)
            write_json(f"RP/models/entity/kb_visual_{kind}.geo.json",
                       tex.geometry(f"geometry.{NS}.visual_{kind}", boxes, bounds=(2.5, 2, 0.5), pivots=pivots, parents=parents))
            tex.image(painters).save(os.path.join(rp, "textures", "entity", f"kb_visual_{kind}.png"))
            geos[kind] = f"geometry.{NS}.visual_{kind}"
            textures[kind] = f"textures/entity/kb_visual_{kind}"
        write_json(f"RP/models/entity/kb_visual_{kind}_contents.geo.json", contents_geometry(kind))
        geos[f"{kind}_c"] = f"geometry.{NS}.visual_{kind}_contents"
    os.makedirs(os.path.join(rp, "textures", "entity"), exist_ok=True)
    for i, c in enumerate(TINTS):
        tint_swatch(c).save(os.path.join(rp, "textures", "entity", f"kb_tint_{i}.png"))
        textures[f"tint{i}"] = f"textures/entity/kb_tint_{i}"

    with_parts = [k for k, v in KINDS.items() if parts(v)]
    first = KINDS[with_parts[0]]
    pick = [KINDS[i] if i in with_parts else first for i in range(8)]  # index = kind; unused slots reuse a valid entry
    geo_arr = [f"Geometry.{k}" for k in pick]
    tex_arr = [f"Texture.{k}" for k in pick]
    write_json("RP/render_controllers/station_visual.render_controllers.json", {
        "format_version": "1.10.0", "render_controllers": {
            f"controller.render.{NS}.visual": {
                "arrays": {"geometries": {"Array.geo": geo_arr}, "textures": {"Array.tex": tex_arr}},
                "geometry": f"Array.geo[{P('kind')}]", "textures": [f"Array.tex[{P('kind')}]"],
                "materials": [{"*": "Material.default"}]},
            f"controller.render.{NS}.contents": {
                "arrays": {"geometries": {"Array.geo": [f"Geometry.{KINDS.get(i, 'bowl')}_c" for i in range(8)]},
                           "textures": {"Array.tint": [f"Texture.tint{i}" for i in range(len(TINTS))]}},
                "geometry": f"Array.geo[{P('kind')}]", "textures": [f"Array.tint[{P('tint')}]"],
                "materials": [{"*": "Material.default"}]}}})

    anims = {}
    for kind, bones in ANIMATIONS.items():
        anims[f"animation.{NS}.visual.{kind}"] = {"loop": True, "bones": bones}
    write_json("RP/animations/station_visual.animation.json", {"format_version": "1.8.0", "animations": anims})

    parts_cond = " || ".join(f"{P('kind')} == {k}" for k in with_parts)
    write_json("RP/entity/station_visual.entity.json", {"format_version": "1.10.0", "minecraft:client_entity": {
        "description": {
            "identifier": f"{NS}:station_visual",
            "materials": {"default": "entity_alphatest"},
            "textures": textures, "geometry": geos,
            "animations": {kind: f"animation.{NS}.visual.{kind}" for kind in ANIMATIONS},
            "scripts": {
                "initialize": [f"v.kb_level = {P('fill')}; v.kb_prog = {P('progress')}; v.kb_door = 0; v.kb_pop = 0;"],
                "pre_animation": [f"v.kb_level = v.kb_level + ({P('fill')} - v.kb_level) * math.min(1.0, q.delta_time * 3.0);"
                                  f" v.kb_prog = v.kb_prog + ({P('progress')} - v.kb_prog) * math.min(1.0, q.delta_time * 2.0);"
                                  f" v.kb_door = v.kb_door + (({P('kind')} == 7 && {ACTIVE}) - v.kb_door) * math.min(1.0, q.delta_time * 6.0);"
                                  f" v.kb_pop = {P('pop')} ? 1.0 : v.kb_pop * math.max(0.0, 1.0 - q.delta_time * 5.0);"],
                "animate": [{kind: f"{P('kind')} == {kid}"} for kid, kind in KINDS.items() if kind in ANIMATIONS]},
            "render_controllers": [{f"controller.render.{NS}.visual": parts_cond},
                                   {f"controller.render.{NS}.contents": f"{P('fill')} > 0"}],
            "enable_attachables": False}}})

    write_json("BP/entities/station_visual.json", {"format_version": "1.21.60", "minecraft:entity": {
        "description": {"identifier": f"{NS}:station_visual", "is_spawnable": False, "is_summonable": True,
                        "properties": {
                            f"{NS}:kind": {"type": "int", "range": [0, 7], "default": 0, "client_sync": True},
                            f"{NS}:fill": {"type": "int", "range": [0, 16], "default": 0, "client_sync": True},
                            f"{NS}:tint": {"type": "int", "range": [0, len(TINTS) - 1], "default": 0, "client_sync": True},
                            f"{NS}:progress": {"type": "float", "range": [0.0, 1.0], "default": 0.0, "client_sync": True},
                            f"{NS}:active": {"type": "bool", "default": False, "client_sync": True},
                            f"{NS}:pop": {"type": "bool", "default": False, "client_sync": True}}},
        "component_groups": {f"{NS}:despawn": {"minecraft:instant_despawn": {"remove_child_entities": False}}},
        "components": {
            "minecraft:persistent": {}, "minecraft:physics": {"has_collision": False, "has_gravity": False},
            "minecraft:type_family": {"family": ["kb_station_visual", "inanimate"]},
            "minecraft:health": {"value": 1, "max": 1, "min": 1},
            "minecraft:collision_box": {"width": 0, "height": 0},
            "minecraft:damage_sensor": {"triggers": {"cause": "all", "deals_damage": "no"}},
            "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
            "minecraft:knockback_resistance": {"value": 1}, "minecraft:movement": {"value": 0},
            "minecraft:body_rotation_blocked": {}, "minecraft:is_hidden_when_invisible": {},
            "minecraft:fire_immune": {}, "minecraft:breathable": {"breathes_water": True, "breathes_air": True}},
        "events": {f"{NS}:despawn": {"add": {"component_groups": [f"{NS}:despawn"]}}}}})
    return problems
