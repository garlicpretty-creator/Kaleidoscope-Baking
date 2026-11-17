"""Static checks for the Kaleidoscope Baking packs (no Minecraft needed).

  python3 tools/validate.py

Checks: JSON syntax, item icons / block textures resolve to real PNGs, custom geometry
exists, every item/block has a name in every language, every message key used by scripts
exists in every language, every kaleidoscope_baking id referenced by scripts or recipes
exists, and every script parses (node --check).
"""
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP, RP = os.path.join(ROOT, "BP"), os.path.join(ROOT, "RP")
NS = "kaleidoscope_baking"
TAG_ONLY = {f"{NS}:whisk", f"{NS}:mold"}  # tag names (whisk is also an item)
# Script-event ids and block-state names share the namespace but are not items.
NON_ITEM = re.compile(rf"^{NS}:(api_[a-z_]+|register_[a-z_]+|bulk_[a-z_]+|oven_part|oven_layer|oven_cell|facing|lit|growth|bites|cup_count|plant|stripped|fill|cups|despawn|drink_cups|ingredient_info|caffeine_adjust|query_ingredient|display|"
                      rf"whisk|frother|mold|cup|caffeine|auto_convert|[a-z_]+_settings|guidebook|open_[a-z_]+|sweet|ice|settings_changed|"
                      rf"(oven|bowl|proof|stand|espresso|pour|shaker|planter|dessert|plant|tree|bark|herb_planter|mixing_bowl|"
                      rf"proofing_basket|decorating_stand|espresso_machine|pour_over_stand|drink_shaker|drink_stack)(\b.*)?)$")
errors = []


def err(msg):
    errors.append(msg)


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:  # noqa: BLE001
        err(f"JSON error in {os.path.relpath(path, ROOT)}: {e}")
        return None


def rel(p):
    return os.path.relpath(p, ROOT)


# 1. JSON syntax everywhere
for p in glob.glob(f"{BP}/**/*.json", recursive=True) + glob.glob(f"{RP}/**/*.json", recursive=True):
    load(p)

item_tex = (load(f"{RP}/textures/item_texture.json") or {}).get("texture_data", {})
terrain_tex = (load(f"{RP}/textures/terrain_texture.json") or {}).get("texture_data", {})
for table, name in ((item_tex, "item_texture"), (terrain_tex, "terrain_texture")):
    for key, v in table.items():
        if not os.path.exists(os.path.join(RP, v["textures"] + ".png")):
            err(f"{name}: {key} -> missing {v['textures']}.png")

geometries = set()
for p in glob.glob(f"{RP}/models/**/*.json", recursive=True):
    for g in (load(p) or {}).get("minecraft:geometry", []):
        geometries.add(g["description"]["identifier"])

# 2. Items and blocks
items, blocks = set(), set()
for p in glob.glob(f"{BP}/items/**/*.json", recursive=True):
    d = (load(p) or {}).get("minecraft:item", {})
    iid = d.get("description", {}).get("identifier", "")
    items.add(iid)
    icon = d.get("components", {}).get("minecraft:icon")
    if icon not in item_tex:
        err(f"{rel(p)}: icon '{icon}' not in item_texture.json")
for p in glob.glob(f"{BP}/blocks/**/*.json", recursive=True):
    d = (load(p) or {}).get("minecraft:block", {})
    bid = d.get("description", {}).get("identifier", "")
    blocks.add(bid)
    comp_sets = [d.get("components", {})] + [x.get("components", {}) for x in d.get("permutations", [])]
    for comps in comp_sets:
        for face, mi in comps.get("minecraft:material_instances", {}).items():
            if mi.get("texture") not in terrain_tex:
                err(f"{rel(p)}: texture '{mi.get('texture')}' ({face}) not in terrain_texture.json")
        geo = comps.get("minecraft:geometry")
        if isinstance(geo, str) and not geo.startswith("minecraft:") and geo not in geometries:
            err(f"{rel(p)}: geometry '{geo}' not found in RP/models")
    loot = d.get("components", {}).get("minecraft:loot")
    if loot and not os.path.exists(os.path.join(BP, loot)):
        err(f"{rel(p)}: loot table {loot} missing")

# 3. Languages
langs = load(f"{RP}/texts/languages.json") or []
lang_keys = {}
for lang in langs:
    path = f"{RP}/texts/{lang}.lang"
    keys = {}
    with open(path, encoding="utf-8") as f:
        for n, line in enumerate(f, 1):
            line = line.rstrip("\n")
            if not line or line.startswith("##"):
                continue
            if "=" not in line:
                err(f"{rel(path)}:{n}: not key=value")
                continue
            k = line.split("=", 1)[0]
            if k in keys:
                err(f"{rel(path)}:{n}: duplicate key {k}")
            keys[k] = line.split("=", 1)[1]
    lang_keys[lang] = keys
    for iid in items:
        if f"item.{iid}.name" not in keys:
            err(f"{lang}: missing item.{iid}.name")
    for bid in blocks:
        if f"tile.{bid}.name" not in keys:
            err(f"{lang}: missing tile.{bid}.name")
# Placeholder counts must match across languages (a translation must not drop a %s).
base = lang_keys.get("en_US", {})
for lang, keys in lang_keys.items():
    for k, v in keys.items():
        if k in base and v.count("%s") != base[k].count("%s"):
            err(f"{lang}: {k} has {v.count('%s')} %s, en_US has {base[k].count('%s')}")

# 3b. Engine rules found by running the packs on Bedrock Dedicated Server (tools/bds_smoke.py)
for bp in glob.glob(f"{BP}/blocks/*.json"):
    blk = json.load(open(bp, encoding="utf-8"))["minecraft:block"]
    comps = [blk.get("components", {})] + [x.get("components", {}) for x in blk.get("permutations", [])]
    if any("minecraft:tags" in c for c in comps):
        err(f"{rel(bp)}: blocks take tags as `tag:<name>` components; `minecraft:tags` makes the engine reject the block")
    for st, vals in blk["description"].get("states", {}).items():
        n = len(vals) if isinstance(vals, list) else vals["values"]["max"] - vals["values"]["min"] + 1
        if n > 16:
            err(f"{rel(bp)}: state {st} has {n} values; the engine allows at most 16")

# 4. Scripts: message keys, ids, syntax
scripts = glob.glob(f"{BP}/scripts/**/*.js", recursive=True)
entities = {json.load(open(e, encoding="utf-8"))["minecraft:entity"]["description"]["identifier"]
            for e in glob.glob(f"{BP}/entities/*.json")}
known_ids = items | blocks | TAG_ONLY | entities
NO_TEXT = re.compile(r"onScreenDisplay|setActionBar|sendMessage\(|setTitle\(|actionBar\(")
for p in scripts:
    src = open(p, encoding="utf-8").read()
    if NO_TEXT.search(src):
        err(f"{rel(p)}: shows text on screen; Baking is immersive -- use sound / particles / the station visual instead")
    m = re.search(r'const MSG = "([^"]+)"', src)
    if m:
        for suffix in set(re.findall(r"\$\{MSG\}([a-z_.]*[a-z_])", src)):
            for lang, keys in lang_keys.items():
                if m.group(1) + suffix not in keys:
                    err(f"{rel(p)}: message {m.group(1) + suffix} missing in {lang}")
    for ref in set(re.findall(rf'["`]({NS}:[a-z0-9_]+)["`]', src)):
        if ref not in known_ids and not NON_ITEM.match(ref):
            err(f"{rel(p)}: references unknown id {ref}")
    r = subprocess.run(["node", "--check", p], capture_output=True, text=True)
    if r.returncode:
        err(f"{rel(p)}: syntax error\n{r.stderr}")
# Every kaleidoscope_baking id referenced by built-in recipes / effects / Cookery data
r = subprocess.run(["node", os.path.join(ROOT, "tools", "dump_refs.mjs")], capture_output=True, text=True)
if r.returncode:
    err(f"tools/dump_refs.mjs failed:\n{r.stderr}")
else:
    for ref in json.loads(r.stdout):
        if ref.startswith(NS + ":") and ref not in known_ids:
            err(f"built-in data references unknown id {ref}")

# Every custom component used by a block JSON must be registered in main.js
main_src = open(f"{BP}/scripts/main.js", encoding="utf-8").read()
for p in glob.glob(f"{BP}/blocks/**/*.json", recursive=True):
    b = (load(p) or {}).get("minecraft:block", {})
    comps = set(b.get("components", {})) | {k for x in b.get("permutations", []) for k in x.get("components", {})}
    for c in comps:
        if c.startswith(NS + ":") and f'"{c}"' not in main_src:
            err(f"{rel(p)}: custom component {c} is not registered in main.js")

# 5. Crafting recipes produce known items
for p in glob.glob(f"{BP}/recipes/**/*.json", recursive=True):
    d = load(p) or {}
    for kind in ("minecraft:recipe_shaped", "minecraft:recipe_shapeless"):
        if kind in d:
            res = d[kind]["result"]["item"]
            if res.startswith(NS) and res not in items:
                err(f"{rel(p)}: result {res} is not a defined item")

# 6. PBR: the resource pack declares it, and every colour texture has its texture set and maps
#    (tools/art/pbr_maps.py; tools/gen_content.py runs it). Flat UI art is never lit and has none.
if "pbr" not in (load(f"{RP}/manifest.json") or {}).get("capabilities", []):
    err("RP/manifest.json: the pbr capability is missing")
for p in glob.glob(f"{RP}/textures/**/*.png", recursive=True):
    q = p.replace(os.sep, "/")
    if "/textures/ui/" in q:
        continue
    layer = re.search(r"_(mer|normal)\.png$", q)
    if layer:
        if not os.path.exists(q[:layer.start()] + ".png"):
            err(f"{rel(p)}: PBR map without a colour texture")
        continue
    base = q[:-4]
    for need in (".texture_set.json", "_normal.png", "_mer.png"):
        if not os.path.exists(base + need):
            err(f"{rel(p)}: no {need.lstrip('._')}, run python tools/art/pbr_maps.py")

if errors:
    print("\n".join(f"✗ {e}" for e in errors))
    print(f"\n{len(errors)} problem(s).")
    sys.exit(1)
print(f"✓ OK: {len(items)} items, {len(blocks)} blocks, {len(scripts)} scripts, {len(langs)} languages")
