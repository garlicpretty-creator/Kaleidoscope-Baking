"""1.1 display furniture and placed hand-shaken drinks, Cookery style: few boxes, every face painted.

cake stand, three-tier tea tray, bread display, pastry case (textures/blocks/kb_<id>.png), and the takeaway cups
(takeaway_<1..4>, texture kb_takeaway_cup; the drink inside each cup uses the `cup` material instance, painted
as kb_fill_shaken, so a drink colour can later be swapped per block state).

The surfaces items are shown on keep the heights of the 1.1 placeholder models, so the display entities that
custom_components/furniture.js places (TRAY_SPOTS, CASE_SPOTS, the cake spot) still sit on them:
  cake stand plate top y=7; tea tray tiers top y=3 / 8 / 13; bread display shelf top y=8; pastry case shelf y=8.5.
None of these blocks has a facing state, so the glass front / open side is north (-z) and the back panel south.
"""
import math

from PIL import Image

from kit import Box, noise, painter, ramp

PORCELAIN = ramp((246, 242, 234), lo=0.8, hi=1.04)
GOLD = ramp((214, 172, 74), lo=0.62, hi=1.2)
ROSE = ramp((196, 92, 110))
OAK = ramp((176, 128, 80))
OAK_D = ramp((126, 86, 52))
MARBLE = ramp((232, 228, 222), lo=0.82, hi=1.05)
GLASS = ramp((200, 226, 232))
LINEN = ramp((232, 220, 196), lo=0.82, hi=1.06)
TEA = ramp((204, 160, 112))
CLEAR = (0, 0, 0, 0)


def n(t, seed):
    return noise(int(math.floor(t.x + 64)), int(math.floor(t.y + 64)) * 131 + int(math.floor(t.z + 64)), seed)


def g(r, t, seed=1):
    k = n(t, seed)
    return r[1] if k < 0.12 else (r[3] if k > 0.88 else r[2])


# --------------------------------------------------------------------------------------------- painters
@painter
def porcelain(t):
    if t.side and t.v == 0:
        return GOLD[3]  # gilt edge
    return g(PORCELAIN, t, 2)


@painter
def plate_top(t):
    """Porcelain plate seen from above: a gold rim and a rose lace ring, plain in the middle where food sits."""
    e = min(t.u, t.v, t.w - 1 - t.u, t.h - 1 - t.v)
    if e == 0:
        return GOLD[3]
    if e == 1 and (t.u + t.v) % 2 == 0:
        return ROSE[3]
    return g(PORCELAIN, t, 3)


plate_top.shade = False


@painter
def gold(t):
    return GOLD[3] if (t.u + t.v) % 3 == 0 else GOLD[2]


@painter
def stem(t):
    if 2 <= t.y < 2.6 or 4 <= t.y < 4.6:
        return GOLD[3]  # gold collars
    return g(PORCELAIN, t, 4)


@painter
def oak(t):
    k = (int(t.y * 3 + (t.x + t.z) * 0.4 + 64) + int(noise(int(t.x + 64), int(t.z + 64), 9) * 3)) % 7
    return OAK[1] if k == 0 else (OAK[3] if k == 4 else OAK[2])


@painter
def oak_dark(t):
    return OAK_D[1] if int(t.x + t.z + 64) % 4 == 0 else OAK_D[2]


@painter
def shelf_liner(t):
    """Linen liner on a bread shelf, with a rose check."""
    if int(t.x + 64) % 4 == 0 or int(t.z + 64) % 4 == 0:
        return ROSE[2]
    return g(LINEN, t, 5)


@painter
def glass_front(t):
    """Glass pane: opaque frame and a highlight streak, clear elsewhere so the food shows."""
    if t.u in (0, t.w - 1) or t.v in (0, t.h - 1):
        return OAK[1] if t.v in (0, t.h - 1) else GLASS[2]
    if (t.u - t.v) % 9 in (2, 3) and t.v < t.h // 2:
        return GLASS[4]
    return CLEAR


glass_front.shade = False


@painter
def case_glass(t):
    if t.u in (0, t.w - 1) or t.v in (0, t.h - 1):
        return GOLD[2]
    if (t.u - t.v) % 11 in (3, 4) and t.v < t.h // 2:
        return GLASS[4]
    return CLEAR


case_glass.shade = False


@painter
def marble(t):
    k = n(t, 7)
    if int(t.x * 0.7 + t.y * 1.3 + t.z * 0.5 + 64) % 9 == 0 and k > 0.3:
        return MARBLE[0]  # veins
    return MARBLE[3] if k > 0.85 else MARBLE[2]


@painter
def rose_trim(t):
    return ROSE[2] if t.v != 0 else GOLD[3]


@painter
def mirror_back(t):
    """Back wall of the pastry case: pale rose panel with a gold frame line."""
    if t.u in (1, t.w - 2) or t.v in (1, t.h - 2):
        return GOLD[2]
    return ramp((244, 214, 220))[2] if n(t, 8) > 0.15 else ramp((244, 214, 220))[1]


@painter
def lid(t):
    if not t.side:
        d = max(abs(t.u + 0.5 - t.w / 2), abs(t.v + 0.5 - t.h / 2))
        return (236, 240, 244) if d > 0.6 else (250, 250, 252)  # dome with the straw hole
    return (226, 232, 238)


@painter
def straw(t):
    return ROSE[3] if t.v % 2 else ROSE[2]


# --------------------------------------------------------------------------------------------- models
def cake_stand():
    b = [Box(-4, 0, -4, 4, 1, 4, {"*": "porcelain", "top": "porcelain"}),
         Box(-1, 1, -1, 1, 6, 1, "stem"),
         Box(-7, 6, -7, 7, 7, 7, {"*": "porcelain", "top": "plate"})]
    return b, {"porcelain": porcelain, "stem": stem, "plate": plate_top}


def tea_tray():
    b = [Box(-6, 2, -6, 6, 3, 6, {"*": "porcelain", "top": "plate"}),
         Box(-5, 7, -5, 5, 8, 5, {"*": "porcelain", "top": "plate"}),
         Box(-4, 12, -4, 4, 13, 4, {"*": "porcelain", "top": "plate"}),
         Box(-0.5, 0, -0.5, 0.5, 2, 0.5, "gold"), Box(-0.5, 3, -0.5, 0.5, 7, 0.5, "gold"),
         Box(-0.5, 8, -0.5, 0.5, 12, 0.5, "gold"), Box(-0.5, 13, -0.5, 0.5, 15, 0.5, "gold"),
         Box(-2, 15, -0.5, 2, 16, 0.5, "gold")]  # the carrying handle
    return b, {"porcelain": porcelain, "plate": plate_top, "gold": gold}


def bread_display():
    b = [Box(-8, 0, -8, 8, 2, 8, {"*": "oak", "top": "oak_dark"}),
         Box(-8, 14, -8, 8, 16, 8, "oak"),
         Box(-8, 2, 6, 8, 14, 8, "oak_dark"),
         Box(-8, 2, -8, -7, 14, 6, "oak"), Box(7, 2, -8, 8, 14, 6, "oak"),
         Box(-7, 7, -7.5, 7, 8, 6, {"*": "oak", "top": "liner"}),
         Box(-7, 2, -8, 7, 14, -7.5, "glass", clear=True)]
    return b, {"oak": oak, "oak_dark": oak_dark, "liner": shelf_liner, "glass": glass_front}


def pastry_case():
    b = [Box(-8, 0, -8, 8, 3, 8, {"*": "marble", "top": "marble", "north": "trim"}),
         Box(-8, 14, -8, 8, 16, 8, {"*": "marble", "bottom": "marble"}),
         Box(-8, 3, 6, 8, 14, 8, {"*": "marble", "north": "back"}),
         Box(-8, 3, -8, -7.5, 14, 6, "glass", clear=True), Box(7.5, 3, -8, 8, 14, 6, "glass", clear=True),
         Box(-7.5, 3, -8, 7.5, 14, -7.5, "glass", clear=True),
         Box(-7.5, 8, -7.5, 7.5, 8.5, 6, "shelf_glass", clear=True)]
    return b, {"marble": marble, "trim": rose_trim, "back": mirror_back, "glass": case_glass, "shelf_glass": case_glass}


FURNITURE = {"cake_stand": cake_stand, "tea_tray": tea_tray, "bread_display": bread_display, "pastry_case": pastry_case}

# takeaway cups: same spots as the 1.1 placeholder (gen_content TAKEAWAY_SPOTS), 4 x 7 x 4 cups
TAKEAWAY_SPOTS = [(-6, -6), (2, -6), (-6, 2), (2, 2)]


def takeaway(n):
    b = []
    for x, z in TAKEAWAY_SPOTS[:n]:
        b.append(Box(x, 0, z, x + 4, 7, z + 4, "cup", instance="cup", full_uv=True, skip=("up",)))
        b.append(Box(x - 0.25, 7, z - 0.25, x + 4.25, 8, z + 4.25, "lid"))
        b.append(Box(x + 1.5, 8, z + 1.5, x + 2.5, 11, z + 2.5, "straw"))
    return b


TAKEAWAY_PAINTERS = {"lid": lid, "straw": straw}


def fill_texture():
    """kb_fill_shaken: the drink seen through the clear cup -- pearls at the bottom, milk tea, a clear band at the top.
    Mapped onto each 4 x 7 cup side, so it is drawn in broad horizontal bands."""
    img = Image.new("RGBA", (16, 16))
    for y in range(16):
        for x in range(16):
            if y <= 1:
                c = (236, 240, 244)               # clear plastic band under the lid
            elif y >= 12 and noise(x // 2, y, 77) > 0.4:
                c = (44, 26, 18) if noise(x, y, 78) > 0.3 else (74, 46, 30)  # tapioca pearls
            elif y >= 12:
                c = TEA[1]
            else:
                c = TEA[2] if noise(x, y, 12) > 0.2 else TEA[3]
            if x in (0, 15):
                c = tuple(min(255, int(v * 1.12)) for v in c)  # plastic highlight at the cup's edges
            img.putpixel((x, y), tuple(c) + (255,))
    return img
