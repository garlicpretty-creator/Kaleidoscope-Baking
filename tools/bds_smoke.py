"""Load Baking (with Cookery) on a Bedrock Dedicated Server and report every engine error.

  python tools/bds_smoke.py <bds-folder> <cookery-BP-folder> <cookery-RP-folder>

Use a COPY of a BDS install (this writes development packs, a world `BakingSmoke` and server.properties into it).
Then the server:
  - loads both packs (block / item / entity / recipe / feature definition errors show up here)
  - places every Baking block in every value of every state, and every oven part / facing
  - summons the station visual and plays the Baking particles
  - stops
Exit code 1 when the log has errors that come from Baking. The full log is written to <bds-folder>/smoke.log.
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NS = "kaleidoscope_baking"


def header(pack):
    return json.load(open(os.path.join(pack, "manifest.json"), encoding="utf-8"))["header"]


def setup(bds, cookery_bp, cookery_rp):
    # Another copy of the same pack (same UUID) in the development folders would be loaded instead of ours.
    ours = {header(p)["uuid"] for p in (cookery_bp, cookery_rp, os.path.join(ROOT, "BP"), os.path.join(ROOT, "RP"))}
    for kind in ("behavior", "resource"):
        for m in glob.glob(os.path.join(bds, f"development_{kind}_packs", "*", "manifest.json")):
            folder = os.path.basename(os.path.dirname(m))
            if not folder.startswith("smoke_") and header(os.path.dirname(m))["uuid"] in ours:
                sys.exit(f"{m} has the same UUID as a pack under test; remove that copy first")
    for kind, packs in (("behavior", [cookery_bp, os.path.join(ROOT, "BP")]), ("resource", [cookery_rp, os.path.join(ROOT, "RP")])):
        dev = os.path.join(bds, f"development_{kind}_packs")
        os.makedirs(dev, exist_ok=True)
        for name, src in zip(("cookery", "baking"), packs):
            dst = os.path.join(dev, f"smoke_{name}")
            if os.path.isdir(dst):
                shutil.rmtree(dst)  # only our own smoke_* copy inside the given BDS folder
            shutil.copytree(src, dst)
    level = time.strftime("BakingSmoke-%Y%m%d-%H%M%S")  # a fresh world each run, so every block is really placed
    world = os.path.join(bds, "worlds", level)
    os.makedirs(world, exist_ok=True)
    for kind, packs in (("behavior", [cookery_bp, os.path.join(ROOT, "BP")]), ("resource", [cookery_rp, os.path.join(ROOT, "RP")])):
        with open(os.path.join(world, f"world_{kind}_packs.json"), "w") as f:
            json.dump([{"pack_id": header(p)["uuid"], "version": header(p)["version"]} for p in packs], f)
    props = os.path.join(bds, "server.properties")
    s = open(props, encoding="utf-8").read()
    for k, v in {"level-name": level, "server-port": "19152", "server-portv6": "19153", "allow-cheats": "true",
                 "content-log-file-enabled": "true", "content-log-console-output-enabled": "true", "level-type": "FLAT",
                 "online-mode": "false", "emit-server-telemetry": "false"}.items():
        s = re.sub(rf"(?m)^{re.escape(k)}=.*$", f"{k}={v}", s) if re.search(rf"(?m)^{re.escape(k)}=", s) else s + f"\n{k}={v}\n"
    open(props, "w", encoding="utf-8").write(s)
    return level


def commands():
    cmds = ["tickingarea add 0 -64 -2 95 -40 40 baking_smoke", "gamerule doDaylightCycle false"]
    spot = [0, 0]

    def pos():
        p = (spot[0], -50, spot[1])
        spot[0] += 2
        if spot[0] > 92:
            spot[0], spot[1] = 0, spot[1] + 2
        return p
    for p in sorted(glob.glob(os.path.join(ROOT, "BP", "blocks", "*.json"))):
        d = json.load(open(p, encoding="utf-8"))["minecraft:block"]
        bid = d["description"]["identifier"]
        if bid == f"{NS}:oven":
            continue
        combos = [None]
        for st, vals in d["description"].get("states", {}).items():
            if isinstance(vals, dict):
                vals = list(range(vals["values"]["min"], vals["values"]["max"] + 1))
            combos += [(st, v) for v in vals]
        for c in combos:
            x, y, z = pos()
            if c is None:
                cmds.append(f"setblock {x} {y} {z} {bid}")
            else:
                v = f'"{c[1]}"' if isinstance(c[1], str) else str(c[1]).lower()
                cmds.append(f'setblock {x} {y} {z} {bid} ["{c[0]}"={v}]')
    for layer in range(3):
        for cell in range(9):
            for f in ("north", "south", "east", "west"):
                x, y, z = pos()
                cmds.append(f'setblock {x} {y} {z} {NS}:oven ["{NS}:oven_layer"={layer},"{NS}:oven_cell"={cell},'
                            f'"{NS}:facing"="{f}","{NS}:lit"=true]')
    x, y, z = pos()
    cmds += [f"summon {NS}:station_visual {x} {y} {z}", f"particle {NS}:steam {x} {y} {z}", f"particle {NS}:crumbs {x} {y} {z}",
             f"testfor @e[type={NS}:station_visual]", f"kill @e[type={NS}:station_visual]"]
    return cmds


def run(bds, cmds):
    proc = subprocess.Popen([os.path.join(bds, "bedrock_server.exe")], cwd=bds, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
    lines = []
    reader = threading.Thread(target=lambda: [lines.append(l.rstrip("\n")) for l in proc.stdout], daemon=True)
    reader.start()
    t0 = time.time()
    while not any("Server started" in l for l in lines):
        if time.time() - t0 > 240 or proc.poll() is not None:
            break
        time.sleep(0.5)
    time.sleep(5)
    mark = len(lines)
    for i, c in enumerate(cmds):
        proc.stdin.write(c + "\n")
        proc.stdin.flush()
        time.sleep(3 if i == 0 else 0.04)  # let the ticking area load before placing blocks
    time.sleep(15)
    proc.stdin.write("stop\n")
    proc.stdin.flush()
    try:
        proc.wait(90)
    except subprocess.TimeoutExpired:
        proc.kill()
    reader.join(5)
    return lines, mark


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    bds, cbp, crp = sys.argv[1:4]
    level = setup(bds, cbp, crp)
    cmds = commands()
    lines, mark = run(bds, cmds)
    open(os.path.join(bds, "smoke.log"), "w", encoding="utf-8").write("\n".join(lines))
    version = next((l.split("Version:")[1].strip() for l in lines if "Version:" in l), "?")
    placed = sum("Block placed" in l for l in lines[mark:])
    setblocks = sum(c.startswith("setblock") for c in cmds)
    errors = [l for l in lines if re.search(r"\b(ERROR|WARN)\]", l) and ("baking" in l.lower() or NS in l)
              and "Watchdog" not in l]
    later = [l for l in lines[mark:] if "ERROR]" in l]
    print(f"BDS {version}, world {level}: {placed}/{setblocks} blocks placed")
    for l in errors + [l for l in later if l not in errors]:
        print(" ", re.sub(r"^\[[^\]]*\] ?", "", l)[:220])
    ok = not errors and not later and placed == setblocks
    print("OK" if ok else f"{len(errors) + len(later)} problems")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
