"""Placeholder art for Kaleidoscope Baking.

Draws simple 16x16 textures (64x64 pack icons) so every block/item has something
recognisable until the artist delivers final art.

  python3 tools/gen_placeholder_art.py          # create only MISSING files (safe default)
  python3 tools/gen_placeholder_art.py --force  # overwrite everything with placeholders

The artist simply replaces the PNGs in RP/textures/** with the same file names; see
docs/ART_ASSETS.md for the full list and what each texture is for.
"""
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RP = os.path.join(ROOT, "RP")
BP = os.path.join(ROOT, "BP")
FORCE = "--force" in sys.argv

BRICK = (156, 90, 60, 255)
MORTAR = (205, 180, 150, 255)
IRON = (184, 188, 194, 255)
IRON_D = (120, 124, 132, 255)
DOUGH = (240, 214, 160, 255)
CRUST = (196, 128, 60, 255)
CREAM = (255, 248, 225, 255)
BUTTER = (250, 220, 90, 255)
DARK = (40, 36, 34, 255)
FIRE = (255, 140, 30, 255)
FIRE2 = (255, 220, 80, 255)
T = (0, 0, 0, 0)


def new(size=16, fill=T):
    img = Image.new("RGBA", (size, size), fill)
    return img, ImageDraw.Draw(img)


def bricks(d, base=BRICK, mortar=MORTAR):
    d.rectangle([0, 0, 15, 15], fill=base)
    for y in (3, 7, 11, 15):
        d.line([0, y, 15, y], fill=mortar)
    for row, y0 in enumerate((0, 4, 8, 12)):
        for x in ((3, 11) if row % 2 == 0 else (7, 15)):
            d.line([x, y0, x, y0 + 2], fill=mortar)


# ---- block textures --------------------------------------------------------
def oven_brick():
    img, d = new(); bricks(d); return img


def oven_top():
    img, d = new(); bricks(d, (120, 70, 50, 255), (170, 140, 110, 255)); return img


def oven_chimney():
    img, d = oven_top(), None
    d = ImageDraw.Draw(img)
    d.rectangle([4, 4, 11, 11], fill=(70, 70, 70, 255))
    d.rectangle([6, 6, 9, 9], fill=DARK)
    return img


def oven_door():
    img, d = new(); bricks(d)
    d.rectangle([2, 3, 13, 13], fill=IRON_D)
    d.rectangle([4, 5, 11, 10], fill=(255, 170, 70, 255))  # glowing window
    d.line([3, 2, 12, 2], fill=IRON)  # handle
    return img


def oven_firebox(lit=False):
    img, d = new(); bricks(d)
    d.rectangle([3, 6, 12, 14], fill=DARK)
    if lit:
        d.polygon([(4, 14), (6, 8), (8, 12), (10, 7), (11, 14)], fill=FIRE)
        d.polygon([(6, 14), (8, 10), (10, 14)], fill=FIRE2)
    return img


def mixing_bowl():
    img, d = new(fill=IRON)
    for y in range(0, 16, 4):
        d.line([0, y, 15, y], fill=(200, 204, 210, 255))
    return img


# ---- item icons ------------------------------------------------------------
def i_oven():
    img, d = new(); d.rectangle([1, 2, 14, 15], fill=BRICK)
    d.rectangle([4, 5, 11, 9], fill=IRON_D); d.rectangle([5, 6, 10, 8], fill=(255, 170, 70, 255))
    d.rectangle([5, 11, 10, 14], fill=DARK); d.point([7, 13], fill=FIRE)
    d.rectangle([11, 0, 13, 2], fill=(90, 90, 90, 255)); return img


def i_bowl():
    img, d = new(); d.pieslice([1, -2, 14, 13], 0, 180, fill=IRON, outline=IRON_D)
    d.line([2, 5, 13, 5], fill=IRON_D); return img


def i_whisk():
    img, d = new(); d.line([7, 9, 7, 15], fill=CRUST, width=2)
    d.ellipse([3, 0, 12, 10], outline=IRON); d.line([7, 0, 7, 10], fill=IRON); return img


def i_cake_mold():
    img, d = new(); d.ellipse([1, 5, 14, 14], fill=IRON_D); d.ellipse([1, 3, 14, 11], fill=IRON)
    d.ellipse([4, 5, 11, 9], fill=IRON_D); return img


def i_loaf_pan():
    img, d = new(); d.polygon([(1, 5), (14, 5), (12, 13), (3, 13)], fill=IRON, outline=IRON_D); return img


def i_baking_tray():
    img, d = new(); d.rectangle([0, 6, 15, 11], fill=IRON, outline=IRON_D)
    for x in (3, 7, 11):
        d.ellipse([x - 1, 7, x + 1, 9], fill=IRON_D)
    return img


def i_butter():
    img, d = new(); d.polygon([(2, 8), (9, 5), (14, 8), (7, 11)], fill=(255, 238, 140, 255))
    d.polygon([(2, 8), (7, 11), (7, 14), (2, 11)], fill=BUTTER)
    d.polygon([(7, 11), (14, 8), (14, 11), (7, 14)], fill=(220, 185, 60, 255)); return img


def i_batter():
    img, d = new(); d.pieslice([1, 0, 14, 14], 0, 180, fill=IRON)
    d.ellipse([2, 4, 13, 9], fill=(250, 230, 170, 255)); return img


def i_dough(color=DOUGH, chips=False):
    img, d = new(); d.ellipse([2, 4, 13, 14], fill=color, outline=(200, 170, 110, 255))
    if chips:
        for p in ((5, 8), (9, 7), (7, 11), (10, 11)):
            d.point(p, fill=(110, 70, 40, 255))
    return img


def i_sponge_cake():
    img, d = new(); d.rectangle([1, 6, 14, 14], fill=(250, 220, 140, 255))
    d.rectangle([1, 4, 14, 7], fill=CREAM); d.rectangle([1, 10, 14, 10], fill=CREAM)
    d.ellipse([6, 1, 9, 4], fill=(220, 40, 60, 255)); return img


def i_toast_loaf():
    img, d = new(); d.rectangle([1, 7, 14, 14], fill=CRUST)
    d.ellipse([1, 2, 14, 11], fill=CRUST); d.ellipse([3, 4, 12, 9], fill=(220, 160, 90, 255)); return img


def i_toast_slice():
    img, d = new(); d.rectangle([3, 6, 12, 14], fill=CRUST); d.ellipse([3, 2, 12, 9], fill=CRUST)
    d.rectangle([4, 7, 11, 13], fill=(250, 230, 180, 255)); d.ellipse([4, 3, 11, 9], fill=(250, 230, 180, 255)); return img


def i_cookie():
    img, d = new(); d.ellipse([2, 2, 13, 13], fill=(230, 180, 100, 255), outline=CRUST)
    for p in ((5, 5), (9, 6), (6, 9), (10, 10)):
        d.point(p, fill=(150, 100, 50, 255))
    return img


def i_burnt():
    img, d = new(); d.ellipse([2, 4, 13, 14], fill=(50, 40, 35, 255), outline=DARK)
    d.line([5, 3, 6, 0], fill=(120, 120, 120, 255)); d.line([9, 3, 10, 1], fill=(120, 120, 120, 255)); return img


def pack_icon():
    img = Image.new("RGBA", (64, 64), (252, 236, 210, 255))
    cake = i_sponge_cake().resize((48, 48), Image.NEAREST)
    img.alpha_composite(cake, (8, 10))
    return img


BLOCKS = {
    "kb_oven_brick": oven_brick, "kb_oven_top": oven_top, "kb_oven_chimney": oven_chimney,
    "kb_oven_door": oven_door, "kb_oven_firebox": lambda: oven_firebox(False),
    "kb_oven_firebox_lit": lambda: oven_firebox(True), "kb_mixing_bowl": mixing_bowl,
}
ITEMS = {
    "kb_oven": i_oven, "kb_mixing_bowl": i_bowl, "kb_whisk": i_whisk, "kb_cake_mold": i_cake_mold,
    "kb_loaf_pan": i_loaf_pan, "kb_baking_tray": i_baking_tray, "kb_butter": i_butter,
    "kb_cake_batter": i_batter, "kb_bread_dough": lambda: i_dough(),
    "kb_cookie_dough": lambda: i_dough((225, 190, 130, 255), True), "kb_sponge_cake": i_sponge_cake,
    "kb_toast_loaf": i_toast_loaf, "kb_toast_slice": i_toast_slice, "kb_butter_cookie": i_cookie,
    "kb_burnt_food": i_burnt,
}


def save(img, path):
    if os.path.exists(path) and not FORCE:
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    return True


def main():
    made = 0
    for name, fn in BLOCKS.items():
        made += save(fn(), os.path.join(RP, "textures", "blocks", name + ".png"))
    for name, fn in ITEMS.items():
        made += save(fn(), os.path.join(RP, "textures", "items", name + ".png"))
    for pack in (RP, BP):
        made += save(pack_icon(), os.path.join(pack, "pack_icon.png"))
    print(f"placeholder art: {made} file(s) written")


if __name__ == "__main__":
    main()
