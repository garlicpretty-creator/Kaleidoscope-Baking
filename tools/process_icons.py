#!/usr/bin/env python3
"""Post-process AI-generated pixel art (e.g. Retro Diffusion) into Minecraft item icons.

Usage:
    python tools/process_icons.py <input_dir> <output_dir> [--size 16] [--bg-tolerance 30]

Steps per PNG/JPG/WEBP:
  1. If the image has no transparency, key out the background colour (sampled from corners).
  2. Crop to the content bounding box and pad to a centred square.
  3. Downscale with nearest-neighbour to --size.
  4. Snap alpha to fully transparent / fully opaque.
"""
import argparse
from pathlib import Path

from PIL import Image

EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def key_background(img: Image.Image, tolerance: int) -> Image.Image:
    img = img.convert("RGBA")
    alpha = img.getchannel("A")
    if alpha.getextrema()[0] < 255:
        return img  # already has transparency
    w, h = img.size
    corners = [img.getpixel(p)[:3] for p in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) <= tolerance:
                px[x, y] = (0, 0, 0, 0)
    return img


def square_crop(img: Image.Image) -> Image.Image:
    bbox = img.getchannel("A").getbbox()
    if bbox:
        img = img.crop(bbox)
    side = max(img.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return canvas


def snap_alpha(img: Image.Image) -> Image.Image:
    r, g, b, a = img.split()
    a = a.point(lambda v: 255 if v >= 128 else 0)
    return Image.merge("RGBA", (r, g, b, a))


def process(src: Path, dst: Path, size: int, tolerance: int) -> None:
    img = Image.open(src)
    img = key_background(img, tolerance)
    img = square_crop(img)
    img = img.resize((size, size), Image.NEAREST)
    img = snap_alpha(img)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst.with_suffix(".png"))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input_dir", type=Path)
    ap.add_argument("output_dir", type=Path)
    ap.add_argument("--size", type=int, default=16)
    ap.add_argument("--bg-tolerance", type=int, default=30, help="RGB distance for background keying")
    args = ap.parse_args()

    files = sorted(p for p in args.input_dir.iterdir() if p.suffix.lower() in EXTS)
    if not files:
        raise SystemExit(f"No images found in {args.input_dir}")
    for f in files:
        out = args.output_dir / (f.stem.lower().replace(" ", "_") + ".png")
        process(f, out, args.size, args.bg_tolerance)
        print(f"{f.name} -> {out}")


if __name__ == "__main__":
    main()
