"""Resource / behaviour pack consistency checks that need no game.

  python tools/check_rp.py [path-to-vanilla-resource-pack]

- client entities: geometry, textures, animations and render controllers they name exist; render controller
  arrays only use Geometry.* / Texture.* keys the entity defines
- animations / entity scripts: Molang parentheses balance; only known query / math functions are used
- scripts: every station_visual property they set exists on the behaviour entity, and literal values fit its range
- flipbook textures point at a terrain_texture key and an existing file
- particles: textures exist (or are vanilla), identifiers are unique
- sounds / particles used by scripts exist in vanilla (when a vanilla resource pack path is given, e.g. the one that
  ships with Bedrock Dedicated Server: <bds>/resource_packs/vanilla)
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RP, BP = os.path.join(ROOT, "RP"), os.path.join(ROOT, "BP")
VANILLA = sys.argv[1] if len(sys.argv) > 1 else None
errors = []


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def err(msg):
    errors.append(msg)


geos = {}
for p in glob.glob(os.path.join(RP, "models", "**", "*.json"), recursive=True):
    for g in load(p).get("minecraft:geometry", []):
        geos[g["description"]["identifier"]] = g
anims = {}
for p in glob.glob(os.path.join(RP, "animations", "*.json")):
    anims.update(load(p).get("animations", {}))
controllers = {}
for p in glob.glob(os.path.join(RP, "render_controllers", "*.json")):
    controllers.update(load(p).get("render_controllers", {}))

MOLANG_OK = re.compile(r"^(q|query|v|variable|math|t|temp|c|context)\.")
KNOWN_QUERIES = {"property", "life_time", "delta_time", "anim_time"}
KNOWN_MATH = {"sin", "cos", "abs", "mod", "min", "max", "clamp", "lerp", "random", "floor", "ceil", "round", "min_angle", "sqrt", "pow"}


def molang(expr, where):
    if not isinstance(expr, str):
        return
    if expr.count("(") != expr.count(")"):
        err(f"{where}: unbalanced parentheses in Molang: {expr}")
    for ns, name in re.findall(r"\b(q|query|math)\.([a-z_]+)", expr):
        if ns in ("q", "query") and name not in KNOWN_QUERIES:
            err(f"{where}: unknown query q.{name}")
        if ns == "math" and name not in KNOWN_MATH:
            err(f"{where}: unknown math.{name}")


def walk_molang(obj, where):
    if isinstance(obj, str):
        molang(obj, where)
    elif isinstance(obj, list):
        for v in obj:
            walk_molang(v, where)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            walk_molang(v, f"{where}.{k}")


for name, a in anims.items():
    walk_molang(a.get("bones", {}), name)

for p in glob.glob(os.path.join(RP, "entity", "*.json")):
    d = load(p)["minecraft:client_entity"]["description"]
    rel = os.path.relpath(p, ROOT)
    for k, gid in d.get("geometry", {}).items():
        if gid not in geos:
            err(f"{rel}: geometry {k} -> {gid} not found")
    for k, tex in d.get("textures", {}).items():
        if not os.path.exists(os.path.join(RP, tex + ".png")):
            err(f"{rel}: texture {k} -> {tex}.png missing")
    for k, aid in d.get("animations", {}).items():
        if aid not in anims:
            err(f"{rel}: animation {k} -> {aid} not found")
    for k, v in d.get("scripts", {}).items():
        walk_molang(v, f"{rel} scripts.{k}")
    for rc in d.get("render_controllers", []):
        rid, cond = (next(iter(rc.items())) if isinstance(rc, dict) else (rc, None))
        molang(cond, f"{rel} render_controllers")
        c = controllers.get(rid)
        if not c:
            if not rid.startswith("controller.render.default"):
                err(f"{rel}: render controller {rid} not found")
            continue
        for kind, arrays in c.get("arrays", {}).items():
            for an, items in arrays.items():
                for it in items:
                    pre, key = it.split(".", 1)
                    pool = d.get("geometry" if pre == "Geometry" else "textures", {})
                    if key not in pool:
                        err(f"{rid}: {an} uses {it}, not defined by {rel}")
        walk_molang({"g": c.get("geometry"), "t": c.get("textures")}, rid)
    # geometry / texture size agreement for single-texture parts
    for k, gid in d.get("geometry", {}).items():
        g = geos.get(gid)
        tex = d.get("textures", {}).get(k)
        if g and tex:
            try:
                from PIL import Image
                size = Image.open(os.path.join(RP, tex + ".png")).size
                want = (g["description"]["texture_width"], g["description"]["texture_height"])
                if size != want:
                    err(f"{rel}: {gid} expects {want}, {tex}.png is {size}")
            except Exception:
                pass

# behaviour entity properties vs scripts
props = {}
for p in glob.glob(os.path.join(BP, "entities", "*.json")):
    for name, spec in load(p)["minecraft:entity"]["description"].get("properties", {}).items():
        props[name] = spec
src = open(os.path.join(BP, "scripts", "utils", "visuals.js"), encoding="utf-8").read()
for name in set(re.findall(r"`\$\{NS\}:([a-z_]+)`", src)):
    if f"kaleidoscope_baking:{name}" not in props and name not in ("despawn", "steam", "crumbs", "facing"):
        err(f"visuals.js sets kaleidoscope_baking:{name}, not a station_visual property")
for p in glob.glob(os.path.join(BP, "scripts", "**", "*.js"), recursive=True):
    s = open(p, encoding="utf-8").read()
    for prop, val in re.findall(r"\b(fill|tint|progress):\s*(-?\d+(?:\.\d+)?)", s):
        spec = props.get(f"kaleidoscope_baking:{prop}")
        if spec and "range" in spec and not (spec["range"][0] <= float(val) <= spec["range"][1]):
            err(f"{os.path.relpath(p, ROOT)}: {prop}: {val} outside {spec['range']}")

# flipbook
terrain = load(os.path.join(RP, "textures", "terrain_texture.json"))["texture_data"]
fb = os.path.join(RP, "textures", "flipbook_textures.json")
if os.path.exists(fb):
    for e in load(fb):
        if e["atlas_tile"] not in terrain:
            err(f"flipbook: atlas_tile {e['atlas_tile']} not in terrain_texture.json")
        if not os.path.exists(os.path.join(RP, e["flipbook_texture"] + ".png")):
            err(f"flipbook: {e['flipbook_texture']}.png missing")

# particles
ids = set()
for p in glob.glob(os.path.join(RP, "particles", "*.json")):
    pe = load(p)["particle_effect"]
    pid = pe["description"]["identifier"]
    if pid in ids:
        err(f"duplicate particle {pid}")
    ids.add(pid)
    tex = pe["description"]["basic_render_parameters"]["texture"]
    if not os.path.exists(os.path.join(RP, tex + ".png")) and not tex.startswith("textures/particle/particles"):
        err(f"{os.path.relpath(p, ROOT)}: texture {tex} missing")
    walk_molang(pe["components"], pid)

# sounds / particles used by scripts exist in vanilla
used_sounds, used_particles = set(), set()
for p in glob.glob(os.path.join(BP, "scripts", "**", "*.js"), recursive=True):
    s = open(p, encoding="utf-8").read()
    used_sounds |= set(re.findall(r'(?:sound\([^,]+,\s*|playSound\(|cue\(player,\s*)"([a-z0-9_.]+)"', s))
    used_particles |= set(re.findall(r'"(minecraft:[a-z0-9_]+(?:_particle|_emitter|explosion|happy|smoke_particle))"', s))
    used_particles |= set(re.findall(r'particle\([^,]+,\s*"(minecraft:[a-z0-9_]+)"', s))
checked = 0
if VANILLA and os.path.isdir(VANILLA):
    sd = load(os.path.join(VANILLA, "sounds", "sound_definitions.json"))
    vanilla_sounds = set(sd.get("sound_definitions", sd).keys())
    for snd in sorted(used_sounds):
        checked += 1
        if snd not in vanilla_sounds:
            err(f"script sound '{snd}' is not a vanilla sound id")
    vanilla_particles = set()
    for p in glob.glob(os.path.join(VANILLA, "particles", "*.json")):
        try:
            vanilla_particles.add(load(p)["particle_effect"]["description"]["identifier"])
        except Exception:
            pass
    for part in sorted(used_particles):
        checked += 1
        if part not in vanilla_particles:
            err(f"script particle '{part}' is not a vanilla particle id")

for e in errors:
    print(e)
print(f"{len(errors)} problems; {len(geos)} geometries, {len(anims)} animations, {len(controllers)} render controllers; "
      f"{checked} sound / particle ids checked against vanilla" + ("" if VANILLA else " (no vanilla pack given)"))
sys.exit(1 if errors else 0)
