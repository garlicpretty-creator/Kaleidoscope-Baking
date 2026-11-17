"""Station block models, Cookery style: few boxes, every face hand-painted in its own texture region.

mixing bowl, proofing basket, decorating stand, espresso machine, pour-over stand, drink shaker, herb planter.
Each writes textures/blocks/kb_<id>.png. Front of directional stations is south (+z); the block's
cardinal_direction state turns it toward the player who placed it (gen_content.py).
"""
import math

from kit import Box, noise, painter, ramp

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
CLEAR = (0, 0, 0, 0)


def n(t, seed, a=1.0, b=1.0):
    """Hashed noise for a texel, stable in world space."""
    return noise(int(math.floor(t.x * a + 64)), int(math.floor(t.y * b + 64)) * 131 + int(math.floor(t.z * a + 64)), seed)


def grain(r, t, seed, lo=0.12, hi=0.88):
    k = n(t, seed)
    return r[1] if k < lo else (r[3] if k > hi else r[2])


def dist(t, cx=0.0, cz=0.0):
    return math.hypot(t.x - cx, t.z - cz)


# --------------------------------------------------------------------------------------------- shared painters
@painter
def steel(t):
    """Brushed steel: horizontal streaks on sides, sheen on tops."""
    if t.side:
        row = noise(int(t.y * 2 + 64), 3, 5)
        base = 3 if row > 0.8 else (1 if row < 0.15 else 2)
        if noise(t.u // 3, t.v, 6) > 0.94:
            base = min(4, base + 1)
        return STEEL[base]
    return STEEL[3] if n(t, 7) > 0.85 else STEEL[2]


@painter
def steel_in(t):
    return STEEL_D[2] if n(t, 8) > 0.2 else STEEL_D[1]


@painter
def walnut(t):
    k = (int(t.y * 3 + t.x * 0.3 + t.z * 0.3) + int(noise(int(t.x + 64), int(t.z + 64), 9) * 3)) % 7
    return WALNUT[1] if k == 0 else (WALNUT[3] if k == 4 else WALNUT[2])


@painter
def walnut_top(t):
    k = (int(t.z * 2 + 64) + int(noise(int(t.x * 0.5 + 64), 0, 10) * 4)) % 6
    return WALNUT[1] if k == 0 else (WALNUT[3] if k == 3 else WALNUT[2])


@painter
def oak(t):
    return OAK[1] if int(t.x * 2 + t.y + 64) % 5 == 0 else OAK[2]


@painter
def ceramic(t):
    return CERAMIC[3] if n(t, 11) > 0.85 else CERAMIC[2]


@painter
def iron(t):
    return grain(IRON, t, 12)


# --------------------------------------------------------------------------------------------- mixing bowl
@painter
def bowl_inside(t):
    """Floor of the bowl seen from above: darker toward the middle (depth), a bright reflected arc."""
    d = dist(t)
    if 3.0 < d < 3.9 and t.x < 0 and t.z < 0:
        return STEEL[4]
    if d < 2:
        return STEEL_D[1]
    return STEEL_D[2] if d < 3.6 else STEEL[1]


@painter
def bowl_rim(t):
    return STEEL[4] if (t.u + t.v) % 5 else STEEL[3]


def mixing_bowl():
    w = {"*": "steel", "top": "rim"}
    b = [Box(-3, 0, -3, 3, 1, 3, "steel_in"),
         Box(-5, 1, -5, 5, 4, 5, {"*": "steel", "top": "inside"}),
         Box(-6, 4, -6, 6, 7, -5, dict(w, south="steel_in")), Box(-6, 4, 5, 6, 7, 6, dict(w, north="steel_in")),
         Box(-6, 4, -5, -5, 7, 5, dict(w, west="steel_in")), Box(5, 4, -5, 6, 7, 5, dict(w, east="steel_in"))]
    rot, piv = (0, 0, -14), (0, 7, 0)
    b.append(Box(-5, 7, -0.5, 7.5, 7.75, 0.5, "oak", rot=rot, pivot=piv))
    b.append(Box(-6, 6.5, -1.25, -3, 7.5, 1.25, "oak", rot=rot, pivot=piv))
    return b, {"steel": steel, "steel_in": steel_in, "inside": bowl_inside, "rim": bowl_rim, "oak": oak}


# --------------------------------------------------------------------------------------------- proofing basket
@painter
def rattan(t):
    """Coiled cane: bands half a pixel... drawn two texels high, stitches offset per band."""
    band = int(t.y + 64) // 2
    if (int(t.x + t.z + 64) + band * 2) % 4 == 0:
        return RATTAN[1]
    return RATTAN[3] if int(t.y + 64) % 2 == 0 else RATTAN[2]


@painter
def rattan_top(t):
    return RATTAN[3] if (t.u + t.v) % 3 else RATTAN[2]


@painter
def coil(t):
    d = max(abs(t.x), abs(t.z))
    if n(t, 31) > 0.86:
        return (238, 232, 216)  # flour
    return RATTAN[1] if int(d) % 2 == 0 else RATTAN[3]


@painter
def rattan_in(t):
    return RATTAN[1] if int(t.y + 64) % 2 == 0 else RATTAN[2]


@painter
def cloth(t):
    if int(t.x + t.z + 64) % 6 == 0 or int(t.y * 2 + t.z + 64) % 6 == 0:
        return ROSE[2]
    return LINEN[3] if n(t, 7) > 0.8 else LINEN[2]


def proofing_basket():
    w = {"*": "rattan", "top": "rattan_top"}
    b = [Box(-5, 0, -5, 5, 1, 5, {"*": "rattan", "top": "coil"}),
         Box(-6, 0, -6, 6, 5, -5, dict(w, south="rattan_in")), Box(-6, 0, 5, 6, 5, 6, dict(w, north="rattan_in")),
         Box(-6, 0, -5, -5, 5, 5, dict(w, west="rattan_in")), Box(5, 0, -5, 6, 5, 5, dict(w, east="rattan_in")),
         Box(2.5, 5, -3.5, 6.5, 5.5, 3.5, "cloth"), Box(6, 1.5, -3.5, 6.5, 5, 3.5, "cloth")]
    return b, {"rattan": rattan, "rattan_top": rattan_top, "coil": coil, "rattan_in": rattan_in, "cloth": cloth}


# --------------------------------------------------------------------------------------------- decorating stand
@painter
def plate_top(t):
    d = dist(t)
    if d > 6.6 or int(d) in (2, 5):
        return CERAMIC[1]  # outer edge and two guide rings
    return CERAMIC[3] if n(t, 13) > 0.85 else CERAMIC[2]


@painter
def bag(t):
    if t.side and int(t.x * 2 + 64) % 4 == 0:
        return LINEN[1]  # fold lines
    return grain(LINEN, t, 14)


@painter
def spatula(t):
    return STEEL[4] if t.v == 0 else STEEL[3]


def decorating_stand():
    b = [Box(-4, 0, -4, 4, 1, 4, "iron"), Box(-1, 1, -1, 1, 7, 1, "iron"),
         Box(-7, 7, -7, 7, 8, 7, {"*": "ceramic", "top": "plate"}),
         Box(-4, 8, 1, 1, 10, 4, "bag"), Box(-5, 8, 2, -4, 9, 3, "steel"),
         Box(-3, 8, -4, 3, 8.5, -2.5, "spatula"), Box(3, 8, -3.75, 6, 9, -2.75, "walnut")]
    return b, {"iron": iron, "ceramic": ceramic, "plate": plate_top, "bag": bag, "steel": steel, "spatula": spatula,
               "walnut": walnut}


# --------------------------------------------------------------------------------------------- espresso machine
@painter
def enamel(t):
    if 3 <= t.y < 4:
        return ROSE[2]
    if t.y < 1.5:
        return ENAMEL[0]
    return ENAMEL[3] if n(t, 3) > 0.9 else ENAMEL[2]


@painter
def espresso_front(t):
    """12 x 10 front panel: pressure gauge, brass name plate, rose stripe."""
    u, v = t.u, t.v
    d = math.hypot(u + 0.5 - 9.5, v + 0.5 - 3)
    if d < 2.1:
        if d > 1.4:
            return STEEL[3]
        return (200, 40, 40) if (u, v) == (9, 2) else (250, 246, 236)
    if v == 1 and 1 <= u <= 4:
        return (214, 170, 72)
    if v == 7:
        return ROSE[2]
    if v == 9:
        return ENAMEL[0]
    return ENAMEL[3] if n(t, 5) > 0.92 else ENAMEL[2]


@painter
def rail(t):
    """Cup-warmer gallery: posts and a top bar, see-through between them."""
    if t.side and not (t.v == 0 or t.u % 3 == 0):
        return CLEAR
    return STEEL[3]


@painter
def grate(t):
    return STEEL_D[0] if int(t.x + 64) % 2 == 0 else STEEL[3]


@painter
def cup_top(t):
    if t.u in (0, t.w - 1) or t.v in (0, t.h - 1):
        return CERAMIC[3]
    return (150, 96, 54) if (t.u + t.v) % 3 else (196, 140, 80)


@painter
def dark(t):
    return IRON[1]


def espresso_machine():
    b = [Box(-6, 0, -5, 6, 1, 2, "dark"),
         Box(-6, 1, -5, 6, 11, 2, {"*": "enamel", "south": "front", "top": "steel"}),
         Box(-6, 11, -5, 6, 12, -4.5, "rail"), Box(-6, 11, 1.5, 6, 12, 2, "rail"),
         Box(-6, 11, -4.5, -5.5, 12, 1.5, "rail"), Box(5.5, 11, -4.5, 6, 12, 1.5, "rail"),
         Box(-4, 11, -3, -2, 13, -1, {"*": "ceramic", "top": "cup_top"}),
         Box(-1, 11, -3.5, 1, 13, -1.5, {"*": "ceramic", "top": "cup_top"}),
         Box(-2, 8, 2, 2, 10, 4, "steel"), Box(-1.5, 7, 2, 1.5, 8, 4.5, "steel"),
         Box(-0.5, 7, 4.5, 0.5, 7.75, 7.5, "walnut"),
         Box(-4, 1, 2, 4, 2, 6, {"*": "steel", "top": "grate"}),
         Box(-1.5, 2, 2.5, 1.5, 4.5, 5.5, {"*": "ceramic", "top": "cup_top"}),
         Box(4.5, 3.5, 2, 5, 8, 2.5, "steel"), Box(4, 8.5, 2, 5.5, 10, 3, "walnut")]
    return b, {"dark": dark, "enamel": enamel, "front": espresso_front, "steel": steel, "rail": rail,
               "ceramic": ceramic, "cup_top": cup_top, "walnut": walnut, "grate": grate}


# --------------------------------------------------------------------------------------------- pour-over stand
@painter
def dripper(t):
    if t.side:
        return CERAMIC[1] if t.u % 2 == 0 and t.v > 0 else CERAMIC[2]  # ribbed cone
    d = max(abs(t.x), abs(t.z - 2))
    if d > 2.4:
        return CERAMIC[3]  # rim
    return COFFEE[1] if n(t, 15) > 0.7 else COFFEE[2]  # wet grounds


@painter
def server_glass(t):
    """Glass server: opaque rim, base, edges, a highlight streak and a wooden collar; clear elsewhere."""
    if not t.side:
        return GLASS[3] if (t.u in (0, t.w - 1) or t.v in (0, t.h - 1)) else CLEAR
    if 6 <= t.y < 7:
        return OAK[2] if t.u % 3 else OAK[1]
    if t.v == 0:
        return GLASS[4]
    if t.v == t.h - 1 or t.u in (0, t.w - 1):
        return GLASS[2]
    if t.u == 2 and 1 <= t.v <= 4:
        return GLASS[4]
    return CLEAR


server_glass.shade = False


@painter
def coffee(t):
    return COFFEE[2] if n(t, 16) > 0.2 else COFFEE[1]


@painter
def coffee_top(t):
    return (150, 96, 54) if n(t, 17) > 0.7 else COFFEE[3]


def pour_over_stand():
    b = [Box(-5, 0, -6, 5, 1, 7, {"*": "walnut", "top": "walnut_top"}),
         Box(-1, 1, -6, 1, 13, -4, "walnut"), Box(-1, 11, -4, 1, 12, -1, "steel"),
         Box(-3, 11, -1, 3, 12, 5, "steel"),
         Box(-3, 12, -1, 3, 14.5, 5, "dripper"), Box(-1.5, 10, 0.5, 1.5, 11, 3.5, "ceramic"),
         Box(-4, 1, -2, 4, 9, 6, "glass", clear=True),
         Box(-3, 1, -1, 3, 5, 5, {"*": "coffee", "top": "coffee_top"})]
    return b, {"walnut": walnut, "walnut_top": walnut_top, "steel": steel, "dripper": dripper, "ceramic": ceramic,
               "glass": server_glass, "coffee": coffee, "coffee_top": coffee_top}


# --------------------------------------------------------------------------------------------- drink shaker
@painter
def tea_cup(t):
    """Sealed cup of milk tea: pearls at the bottom, tea, a clear band and the sealed rim."""
    if t.y >= 7:
        return (236, 240, 244)
    if t.y >= 6:
        return (214, 226, 232)
    if t.y < 3.5 and n(t, 77) > 0.45:
        return (44, 26, 18) if n(t, 78) > 0.3 else (72, 44, 30)
    return TEA[1] if t.y < 3.5 else (TEA[2] if n(t, 12) > 0.2 else TEA[3])


@painter
def film(t):
    if t.u in (0, t.w - 1) or t.v in (0, t.h - 1):
        return (236, 240, 244)
    return (250, 244, 236) if (t.u + t.v) % 3 else (236, 120, 140)


@painter
def straw(t):
    return ROSE[3] if t.v % 2 else ROSE[2]


def drink_shaker():
    b = [Box(-6, 0, -5, 6, 1, 5, {"*": "walnut", "top": "walnut_top"}),
         Box(-6, 1, -4, 0, 8, 2, "steel"), Box(-5, 8, -3, -1, 10, 1, "steel"), Box(-4, 10, -2, -2, 11, 0, "steel"),
         Box(1, 1, 0, 5, 8, 4, {"*": "cup", "top": "film"}),
         Box(3, 8, 1.75, 3.5, 12, 2.25, "straw", rot=(0, 0, -12), pivot=(3.25, 8, 2))]
    return b, {"walnut": walnut, "walnut_top": walnut_top, "steel": steel, "cup": tea_cup, "film": film, "straw": straw}


# --------------------------------------------------------------------------------------------- herb planter
@painter
def terra(t):
    if t.side and t.y < 1:
        return TERRA[0]
    return grain(TERRA, t, 2)


@painter
def soil(t):
    if t.u in (0, t.w - 1) or t.v in (0, t.h - 1):
        return TERRA_L[2]  # the pot's lip around the soil
    k = n(t, 41)
    return SOIL[4] if k > 0.9 else (SOIL[1] if k < 0.3 else SOIL[2])


soil.shade = False


@painter
def band(t):
    if t.side and int(t.x + t.z + 64) % 3 == 0:
        return TERRA[0]  # stamped dots
    return TERRA_L[3] if n(t, 44) > 0.85 else TERRA_L[2]


@painter
def saucer(t):
    return TERRA_L[1] if not t.side and max(abs(t.x), abs(t.z)) < 5.5 else TERRA_L[2]


def herb_planter():
    b = [Box(-6, 0, -6, 6, 0.5, 6, "saucer"),
         Box(-5, 0.5, -5, 5, 6, 5, {"*": "terra", "top": "soil"}),
         Box(-5.5, 4.5, -5.5, 5.5, 5.5, 5.5, "band")]
    for rot in (45, -45):
        b.append(Box(-6, 6, 0, 6, 16, 0, "terra", rot=(0, rot, 0), pivot=(0, 6, 0), instance="cross", full_uv=True,
                     mirror=("south",), bone="plant"))
    return b, {"saucer": saucer, "terra": terra, "soil": soil, "band": band}


MODELS = {"mixing_bowl": mixing_bowl, "proofing_basket": proofing_basket, "decorating_stand": decorating_stand,
          "espresso_machine": espresso_machine, "pour_over_stand": pour_over_stand, "drink_shaker": drink_shaker,
          "herb_planter": herb_planter}
DIRECTIONAL = {"proofing_basket", "decorating_stand", "espresso_machine", "pour_over_stand", "drink_shaker"}
