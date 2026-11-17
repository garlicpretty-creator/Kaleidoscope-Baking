"""Station block models: mixing bowl, proofing basket, decorating stand, espresso machine, pour-over stand,
drink shaker and herb planter. Each model has its own swatch atlas, written as textures/blocks/kb_<id>.png.

Front of every directional station is south (+z); the block's cardinal_direction state rotates it to face the
player who placed it (see gen_content.py).
"""
import math

from kit import (Atlas, Box, Swatch, brushed, disc_mask, flat, glass, layer, mix, noise, ramp, ring_mask, shade,
                 solid, square_mask, weave, wood)

# --------------------------------------------------------------------------------------------- palettes
STEEL = ramp((186, 192, 200), lo=0.58, hi=1.25)
STEEL_D = ramp((120, 126, 134))
IRON = ramp((58, 58, 64), lo=0.7, hi=1.5)
WALNUT = ramp((104, 68, 42))
OAK = ramp((170, 124, 76))
CERAMIC = ramp((236, 232, 222), lo=0.8, hi=1.06)
ENAMEL = ramp((232, 216, 190), lo=0.72, hi=1.08)
ROSE = ramp((196, 92, 110))
TERRA = ramp((186, 100, 64))
TERRA_L = ramp((206, 124, 84))
RATTAN = ramp((198, 152, 96))
LINEN = ramp((228, 216, 192), lo=0.82, hi=1.08)
SOIL = ramp((92, 62, 40))
COFFEE = ramp((76, 44, 26))
GLASS = ramp((200, 226, 232))
TEA = ramp((204, 160, 112))


def rings_top(r_out, r_in, step=2, center=(8, 8)):
    """Concentric guide rings on a top face (u = x + 8, v = z + 8)."""
    def p(x, y):
        d = math.hypot(x + 0.5 - center[0], y + 0.5 - center[1])
        if int(d) in (2, 5):
            return r_out[1]
        return r_out[3] if noise(x, y, 9) > 0.85 else r_out[2]
    return p


def coil_top(r):
    """Rattan coil seen from above: concentric rings with flour dust."""
    def p(x, y):
        d = math.hypot(x + 0.5 - 8, y + 0.5 - 8)
        if noise(x, y, 31) > 0.9:
            return (238, 232, 216)  # flour
        return r[1] if int(d) % 2 == 0 else r[3]
    return p


def grate(r):
    def p(x, y):
        return r[0] if x % 2 == 0 else r[3]
    return p


def planter_rim(x, v):
    """Lighter rolled rim with a stamped dot band (world rows: rim is y 5..6.5)."""
    if v == 10 and x % 3 == 1:
        return TERRA[0]
    n = noise(x, v, 44)
    return TERRA_L[3] if n > 0.85 else TERRA_L[2]


def soil_top(x, y):
    n = noise(x, y, 41)
    if n > 0.9:
        return SOIL[4]
    return SOIL[1] if n < 0.3 else SOIL[2]


def check_cloth(x, y):
    if (x % 6 == 0) or (y % 6 == 0):
        return ROSE[2]
    return LINEN[3] if noise(x, y, 7) > 0.8 else LINEN[2]


def enamel_side(x, y):
    # cream enamel with a rose pin-stripe at y=12 (world y 4)
    if y == 12:
        return ROSE[2]
    if y == 14:
        return ENAMEL[0]
    return ENAMEL[3] if noise(x, y, 3) > 0.9 else ENAMEL[2]


def espresso_front(x, y):
    """12 x 10 front panel (decal): gauge at top-left, rose stripe, two knobs."""
    base = ENAMEL[3] if noise(x, y, 5) > 0.92 else ENAMEL[2]
    # pressure gauge, centre (9.5, 3) -- the side away from the steam wand
    d = math.hypot(x + 0.5 - 9.5, y + 0.5 - 3)
    if d < 2.1:
        if d > 1.4:
            return STEEL[3]
        return (200, 40, 40) if (x, y) == (9, 2) else (250, 246, 236)
    if y == 7:
        return ROSE[2]
    if y == 0:
        return STEEL[2]
    if y == 9:
        return ENAMEL[0]
    return base


def cup_top(x, y):
    # 3x3 espresso cup from above: rim + crema
    if (x, y) == (1, 1):
        return (150, 96, 54)
    return CERAMIC[3]


def tea_cup_side(x, y):
    """Clear cup of milk tea seen from the side; rows are world height (v = 16 - y)."""
    wy = 16 - y  # world y of this row's top
    if wy >= 9:
        return (0, 0, 0, 0)
    if wy == 8:
        return (236, 240, 244)  # sealed rim
    if wy <= 3 and noise(x, wy, 77) > 0.45:
        return (44, 26, 18) if noise(x, wy, 78) > 0.3 else (72, 44, 30)  # tapioca pearls
    if wy <= 4:
        return TEA[1]
    return TEA[2] if noise(x, y, 12) > 0.2 else TEA[3]


def server_glass(x, y):
    """Glass coffee server, 8 high from y=1: opaque rim and base rows, vertical highlights, clear between."""
    wy = 15 - y  # world y of the bottom of this row
    if wy == 8:
        return GLASS[4]
    if wy == 1:
        return GLASS[2]
    if x % 4 == 1 and 2 <= wy <= 7:
        return GLASS[4] if wy > 3 else GLASS[3]
    return (0, 0, 0, 0)


def film_top(x, y):
    return (250, 244, 236) if (x + y) % 3 else (236, 120, 140)


ATLASES = {}


def atlas(sid, **swatches):
    ATLASES[sid] = Atlas({k: Swatch(v) for k, v in swatches.items()})
    return ATLASES[sid]


# --------------------------------------------------------------------------------------------- models
def mixing_bowl():
    atlas("mixing_bowl", steel=brushed(STEEL), steel_in=brushed(STEEL_D, 8), rim=flat(STEEL, 4, 0.05),
          oak=wood(OAK, vertical=False), oak_end=flat(OAK))
    b = []
    b += layer(disc_mask(6), 0, 1, "steel_in")
    b += layer(disc_mask(8), 1, 2, {"*": "steel", "top": "steel_in"})
    b += layer(ring_mask(10, 8), 2, 4, {"*": "steel", "top": "steel_in"})
    b += layer(ring_mask(12, 10), 4, 6, {"*": "steel", "top": "steel_in"})
    b += layer(ring_mask(14, 12), 6, 7, {"*": "rim"})
    # wooden spoon resting across the rim, dipping into the bowl
    rot, piv = (0, 0, -14), (0, 7, 0)
    b.append(Box(-5, 7, -0.5, 7.5, 7.75, 0.5, {"*": "oak", "west": "oak_end", "east": "oak_end"}, rot=rot, pivot=piv))
    b.append(Box(-6, 6.5, -1.25, -3, 7.5, 1.25, "oak", rot=rot, pivot=piv))
    return b


def proofing_basket():
    atlas("proofing_basket", rattan=weave(RATTAN), coil=coil_top(RATTAN), rim=flat(RATTAN, 6), cloth=check_cloth)
    b = []
    b += layer(disc_mask(10), 0, 1, {"*": "rattan", "top": "coil", "bottom": "rim"})
    b += layer(ring_mask(12, 10), 0, 5, {"*": "rattan", "top": "rim"})
    # folded linen cloth over the east rim
    b.append(Box(2.5, 5, -3.5, 6.5, 5.5, 3.5, "cloth"))
    b.append(Box(6, 1.5, -3.5, 6.5, 5, 3.5, "cloth"))
    return b


def decorating_stand():
    atlas("decorating_stand", iron=flat(IRON, 2), plate=rings_top(CERAMIC, STEEL), plate_side=flat(CERAMIC, 3),
          bag=flat(LINEN, 5), tip=flat(STEEL, 6), cream=flat(ramp((250, 238, 240), lo=0.85, hi=1.04)),
          spatula=brushed(STEEL), handle=flat(WALNUT, 2))
    b = []
    b += layer(disc_mask(8), 0, 1, "iron")
    b += layer(disc_mask(4), 1, 2, "iron")
    b += layer(square_mask(-1, -1, 1, 1), 2, 6, "iron")
    b += layer(disc_mask(6), 6, 7, "iron")
    b += layer(disc_mask(14), 7, 8, {"*": "plate_side", "top": "plate", "bottom": "plate_side"})
    # piping bag lying on the plate, nozzle pointing west, a dab of cream in front of it
    b.append(Box(-5, 8, 2, -4, 9, 3, "tip"))
    b.append(Box(-4, 8, 1.5, -2, 9.5, 3.5, "bag"))
    b.append(Box(-2, 8, 1, 1, 10, 4, "bag"))
    b.append(Box(1, 8, 1.5, 2, 9.5, 3.5, "bag"))
    b.append(Box(-6.5, 8, 2, -5.5, 8.75, 3, "cream"))
    # offset spatula
    b.append(Box(-3, 8, -4, 3, 8.5, -2.5, "spatula"))
    b.append(Box(3, 8, -3.75, 6, 9, -2.75, "handle"))
    return b


def espresso_machine():
    atlas("espresso_machine", enamel=enamel_side, front=espresso_front, steel=brushed(STEEL), grate=grate(STEEL_D),
          ceramic=flat(CERAMIC, 2), cup_top=cup_top, walnut=flat(WALNUT, 4), dark=flat(IRON, 5), top=flat(STEEL_D, 3))
    b = []
    for x, z in ((-6, -5), (5, -5), (-6, 1), (5, 1)):
        b.append(Box(x, 0, z, x + 1, 1, z + 1, "dark"))
    b.append(Box(-6, 1, -5, 6, 11, 2, {"*": "enamel", "top": "top", "bottom": "dark"}, decal={"south": ("front", 0, 0)}))
    b.append(Box(-6, 11, -5, 6, 11.5, 2, "steel"))
    # cup-warmer rail
    for x in (-6, 5.5):
        for z in (-5, 1.5):
            b.append(Box(x, 11.5, z, x + 0.5, 13, z + 0.5, "steel"))
    b.append(Box(-5.5, 12.5, -5, 5.5, 13, -4.5, "steel"))
    b.append(Box(-5.5, 12.5, 1.5, 5.5, 13, 2, "steel"))
    b.append(Box(-6, 12.5, -4.5, -5.5, 13, 1.5, "steel"))
    b.append(Box(5.5, 12.5, -4.5, 6, 13, 1.5, "steel"))
    # two cups warming on top
    b.append(Box(-4, 11.5, -3, -2, 13.5, -1, {"*": "ceramic", "top": "cup_top"}, decal={"up": ("cup_top", 0, 0)}))
    b.append(Box(-1, 11.5, -3.5, 1, 13.5, -1.5, {"*": "ceramic", "top": "cup_top"}, decal={"up": ("cup_top", 0, 0)}))
    # group head + portafilter
    b.append(Box(-2, 8, 2, 2, 10, 4, "steel"))
    b.append(Box(-1.5, 7, 2, 1.5, 8, 4.5, "steel"))
    b.append(Box(-0.5, 7, 4.5, 0.5, 7.75, 7.5, "walnut"))
    # drip tray and the cup on it
    b.append(Box(-4, 1, 2, 4, 2, 6, {"*": "steel", "top": "grate"}))
    b.append(Box(-1.5, 2, 2.5, 1.5, 4.5, 5.5, {"*": "ceramic", "top": "cup_top"}, decal={"up": ("cup_top", 0, 0)}))
    # steam wand and its knob
    b.append(Box(4.5, 3.5, 2, 5, 8, 2.5, "steel"))
    b.append(Box(4, 8.5, 2, 5.5, 10, 3, "walnut"))
    return b


def pour_over_stand():
    atlas("pour_over_stand", walnut=wood(WALNUT), walnut_top=wood(WALNUT, 5, vertical=True), steel=brushed(STEEL),
          ceramic=flat(CERAMIC, 3), grounds=flat(COFFEE, 4, 0.3), glass=server_glass, coffee=flat(COFFEE, 2, 0.05),
          oak=flat(OAK, 3))
    b = []
    b.append(Box(-5, 0, -6, 5, 1, 7, {"*": "walnut", "top": "walnut_top"}))
    b.append(Box(-1, 1, -6, 1, 13, -4, "walnut"))
    b.append(Box(-1, 11, -4, 1, 12, -2, "steel"))
    c = dict(cz=2)
    b += layer(ring_mask(6, 4, **c), 11, 12, "steel")
    # ceramic dripper cone with coffee grounds inside
    b += layer(disc_mask(2, **c), 10, 11, "ceramic")
    b += layer(disc_mask(4, **c), 11, 12, "ceramic")
    b += layer(ring_mask(6, 4, **c), 12, 13.5, "ceramic")
    b += layer(disc_mask(4, **c), 12, 12.5, "grounds")
    b += layer(ring_mask(8, 6, **c), 13.5, 15, "ceramic")
    # glass server with coffee
    b += layer(ring_mask(8, 6, **c), 1, 9, "glass", clear=True)
    b += layer(disc_mask(6, **c), 1, 5, "coffee")
    b += layer(ring_mask(10, 8, **c), 6, 7, "oak")
    return b


def drink_shaker():
    atlas("drink_shaker", walnut=wood(WALNUT), walnut_top=wood(WALNUT, 6, vertical=True), steel=brushed(STEEL),
          steel_top=flat(STEEL, 8, 0.05), cup=tea_cup_side, film=film_top, straw=solid(ROSE[3]), tea=flat(TEA))
    b = []
    b.append(Box(-6, 0, -5, 6, 1, 5, {"*": "walnut", "top": "walnut_top"}))
    s = dict(cx=-3, cz=-1)
    b += layer(disc_mask(6, **s), 1, 8, {"*": "steel", "top": "steel_top"})
    b += layer(disc_mask(4, **s), 8, 10, {"*": "steel", "top": "steel_top"})
    b += layer(disc_mask(2, **s), 10, 11, {"*": "steel", "top": "steel_top"})
    cpos = dict(cx=3, cz=2)
    b += layer(disc_mask(4, **cpos), 1, 8, {"*": "cup", "top": "film", "bottom": "tea"})
    b.append(Box(3.5, 8, 1.5, 4, 12, 2, "straw", rot=(0, 0, -12), pivot=(3.75, 8, 1.75)))
    return b


def herb_planter():
    atlas("herb_planter", terra=flat(TERRA, 2), terra_l=planter_rim, soil=soil_top, foot=flat(ramp(TERRA[1]), 4),
          saucer=flat(TERRA_L, 6))
    b = []
    b += layer(disc_mask(12), 0, 0.5, {"*": "saucer", "top": "saucer"})
    b += layer(disc_mask(8), 0.5, 1, "foot")
    b += layer(disc_mask(10), 1, 5, {"*": "terra", "top": "soil"})
    b += layer(ring_mask(12, 10), 5, 6.5, "terra_l")
    b += layer(ring_mask(12, 10), 4, 5, "terra")
    # plant planes, textured with the plant's stage texture through the `cross` material instance
    for rot in (45, -45):
        b.append(Box(-6, 5, 0, 6, 16, 0, "terra", rot=(0, rot, 0), pivot=(0, 5, 0), instance="cross", full_uv=True,
                     mirror=("south",), bone="plant"))
    return b


MODELS = {"mixing_bowl": mixing_bowl, "proofing_basket": proofing_basket, "decorating_stand": decorating_stand,
          "espresso_machine": espresso_machine, "pour_over_stand": pour_over_stand, "drink_shaker": drink_shaker,
          "herb_planter": herb_planter}
DIRECTIONAL = {"proofing_basket", "decorating_stand", "espresso_machine", "pour_over_stand", "drink_shaker"}
