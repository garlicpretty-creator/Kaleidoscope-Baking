"""Package BP + RP into dist/Kaleidoscope-Baking-v<version>.mcaddon.

  python3 tools/build.py

Double-click the .mcaddon (or import it) to install both packs. Kaleidoscope Cookery
must also be installed and enabled in the world, above or below Baking.
"""
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_NAMES = {".DS_Store", "Thumbs.db"}


def main():
    version = ".".join(map(str, json.load(open(os.path.join(ROOT, "BP", "manifest.json")))["header"]["version"]))
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    out = os.path.join(ROOT, "dist", f"Kaleidoscope-Baking-v{version}.mcaddon")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for src, folder in (("BP", f"Kaleidoscope Baking v{version} [BP]"), ("RP", f"Kaleidoscope Baking v{version} [RP]")):
            base = os.path.join(ROOT, src)
            for dirpath, _, files in os.walk(base):
                for name in files:
                    if name in SKIP_NAMES:
                        continue
                    full = os.path.join(dirpath, name)
                    z.write(full, os.path.join(folder, os.path.relpath(full, base)))
    print(f"built {os.path.relpath(out, ROOT)} ({os.path.getsize(out) // 1024} KB)")


if __name__ == "__main__":
    main()
