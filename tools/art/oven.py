"""Oven face textures (the oven is a 3x3x3 of full blocks, opaque): firebrick, top, chimney, iron door, firebox."""
import math

from PIL import Image

from kit import noise, ramp

BRICK = ramp((176, 92, 62), lo=0.66, hi=1.18)
MORTAR = ramp((206, 190, 168), lo=0.8, hi=1.06)
SLAB = ramp((150, 124, 108), lo=0.7, hi=1.15)
IRON = ramp((64, 62, 66), lo=0.6, hi=1.7)
SOOT = (34, 28, 26)
FIRE = [(120, 24, 10), (196, 58, 14), (238, 116, 24), (252, 182, 52), (255, 236, 150)]


def brick_px(x, y, seed=1):
    """Staggered 8x4 firebricks with mortar, tiling every 16 px."""
    row = y // 4
    off = 4 if row % 2 else 0
    if y % 4 == 3 or (x + off) % 8 == 7:
        return MORTAR[1] if noise(x, y, seed) < 0.3 else MORTAR[2]
    bid = ((x + off) // 8, row)
    tone = 1 + int(noise(*bid, seed + 2) * 3)  # per-brick tone 1..3
    n = noise(x, y, seed + 3)
    if n > 0.9:
        tone = min(4, tone + 1)
    elif n < 0.08:
        tone = max(0, tone - 1)
    if y % 4 == 0:
        tone = min(4, tone + 1)  # lit top edge of each brick
    return BRICK[tone]


def img(painter):
    im = Image.new("RGBA", (16, 16))
    for y in range(16):
        for x in range(16):
            im.putpixel((x, y), tuple(painter(x, y)[:3]) + (255,))
    return im


def brick(x, y):
    return brick_px(x, y)


def top(x, y):
    # stone slab cap in 8x8 tiles, slightly sooty toward the chimney side is handled on the chimney itself
    if x % 8 == 0 or y % 8 == 0:
        return SLAB[1]
    n = noise(x, y, 11)
    return SLAB[3] if n > 0.88 else (SLAB[1] if n < 0.1 else SLAB[2])


def chimney(x, y):
    d = max(abs(x - 7.5), abs(y - 7.5))
    if d < 3:
        return SOOT if d < 2 else (52, 42, 38)
    if d < 5:
        return brick_px(x, y, 5) if noise(x, y, 13) > 0.35 else (78, 60, 52)
    return top(x, y)


def door(x, y):
    # cast iron door with a riveted frame, a small window and a brass handle, set in brick
    if not (2 <= x <= 13 and 2 <= y <= 14):
        return brick_px(x, y)
    if x in (2, 13) or y in (2, 14):
        return IRON[1]
    if (x, y) in ((3, 3), (12, 3), (3, 13), (12, 13)):
        return IRON[4]  # rivets
    if 5 <= x <= 10 and 5 <= y <= 7:
        if x in (5, 10) or y in (5, 7):
            return IRON[3]
        return (226, 132, 48) if (x + y) % 3 else (250, 196, 96)  # warm glow through the window
    if 10 <= x <= 11 and y in (10, 11):
        return (214, 170, 72) if y == 10 else (160, 120, 44)  # brass handle
    n = noise(x, y, 17)
    return IRON[3] if n > 0.9 else (IRON[1] if n < 0.12 else IRON[2])


def _arch(x, y):
    """Inside of the firebox arch: x 3..12, y 5..15, round top."""
    if y >= 15 or x < 3 or x > 12:
        return False
    if y >= 8:
        return y >= 5
    return math.hypot(x - 7.5, (y - 8) * 1.3) <= 5.0


def firebox(x, y, lit=False):
    if not _arch(x, y):
        if _arch(x, y + 1) or _arch(x - 1, y) or _arch(x + 1, y):
            return (96, 52, 36)  # arch voussoirs
        return brick_px(x, y)
    if not lit:
        if y >= 13:
            return (70, 66, 64) if noise(x, y, 19) > 0.5 else (46, 42, 40)  # ash
        return SOOT if noise(x, y, 21) > 0.15 else (48, 36, 30)
    # flames rise from the embers; heat decreases with height
    if y >= 13:
        return FIRE[3] if noise(x, y, 23) > 0.5 else FIRE[2]
    h = (15 - y) / 10.0
    flick = noise(x, y, 25)
    v = 4 - int(h * 4 + flick * 1.6)
    if v < 0:
        return (52, 24, 16)
    return FIRE[max(0, min(4, v))]


TEXTURES = {"oven_brick": brick, "oven_top": top, "oven_chimney": chimney, "oven_door": door,
            "oven_firebox": firebox, "oven_firebox_lit": lambda x, y: firebox(x, y, True)}


def build(out_dir):
    made = []
    for name, fn in TEXTURES.items():
        im = img(fn)
        im.save(f"{out_dir}/kb_{name}.png")
        made.append((name, im))
    return made
