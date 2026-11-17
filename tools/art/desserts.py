"""Placeable whole desserts: round cakes and pies eaten in four slices where they stand.

Each dessert gets geometry.kaleidoscope_baking.<id>_q<1..4> (q = quarters left) and one atlas
textures/blocks/kb_<id>.png. Quarter k of the disc (0: +x-z, 1: -x-z, 2: -x+z, 3: +x+z) is built from its own
boxes, so removing a slice never leaves a box straddling the cut; decorations belong to a quarter and leave with
it. Faces on the x=0 / z=0 planes use the dessert's `cut` swatch, painted by world height so the layers inside
line up on every cut face.
"""
import math

from kit import Atlas, Box, Swatch, disc_mask, layer, noise, ramp, ring_mask

QUARTER_CENTRES = {0: (1, -1), 1: (-1, -1), 2: (-1, 1), 3: (1, 1)}  # unit direction of each quarter


# --------------------------------------------------------------------------------------------- painters
def rows(stack, default=(255, 0, 255), seed=1, grain=0.15):
    """Cut-face painter from world-height bands: stack = [(y_from, y_to, ramp)], v -> world y = 15 - v."""
    def p(x, v):
        wy = 15 - v
        for y0, y1, r in stack:
            if y0 <= wy < y1:
                n = noise(x, v, seed)
                return r[1] if n < grain else (r[3] if n > 1 - grain else r[2])
        return stack[-1][2][2] if wy >= stack[-1][1] else stack[0][2][2]  # never a missing colour
    return p


def speckle(r, dots=(), seed=3, rate=0.08):
    """Top/side surface: ramp r with sparse coloured dots [(colour, probability)]."""
    def p(x, y):
        n = noise(x, y, seed)
        acc = 0.0
        for c, prob in dots:
            acc += prob
            if n < acc:
                return c
        m = noise(x, y, seed + 1)
        return r[1] if m < rate else (r[3] if m > 1 - rate else r[2])
    return p


def radial(inner, outer, edge_r=5.5, seed=4, dots=()):
    """Top surface with a different band near the rim (piped cream / crust edge), u = x + 8, v = z + 8."""
    def p(x, y):
        d = math.hypot(x + 0.5 - 8, y + 0.5 - 8)
        n = noise(x, y, seed)
        acc = 0.0
        for c, prob in dots:
            acc += prob
            if n < acc and d < edge_r:
                return c
        r = outer if d >= edge_r else inner
        return r[1] if n > 0.92 else (r[3] if n < 0.12 else r[2])
    return p


def lattice(crust, filling, seed=5):
    """Woven pastry lattice: 2-pixel strips every 5 pixels both ways, over/under alternating at crossings."""
    def p(x, y):
        on_x, on_z = y % 5 in (1, 2), x % 5 in (1, 2)
        if on_x and on_z:
            over_x = (x // 5 + y // 5) % 2 == 0
            return crust[4] if over_x == (y % 5 == 1) else crust[1]
        if on_x:
            return crust[3] if y % 5 == 1 else crust[2]
        if on_z:
            return crust[3] if x % 5 == 1 else crust[2]
        n = noise(x, y, seed)
        return filling[0] if n < 0.2 else (filling[4] if n > 0.85 else filling[2])
    return p


def fluted(crust, seed=6):
    """Crimped crust side: vertical flutes."""
    def p(x, v):
        return crust[3] if x % 2 == 0 else crust[1]
    return p


def drip(top, body, depth=2, seed=7):
    """Side with glaze dripping from the top edge of a cake `h` high: rows v near 16-h are glaze."""
    def p(x, v, h=[None]):
        return top[2]
    return p


def side_with_band(h, top_r, body_r, band, seed=8):
    """Cake side: glaze/cream drip band at the top `band` rows, body below; drips vary per column."""
    def p(x, v):
        wy = 15 - v
        reach = band + (1 if noise(x, 0, seed) > 0.6 else 0) + (1 if noise(x, 1, seed) > 0.85 else 0)
        n = noise(x, v, seed + 1)
        if wy >= h - reach:
            return top_r[1] if n < 0.12 else (top_r[3] if n > 0.9 else top_r[2])
        if wy == 0:
            return body_r[0]
        return body_r[1] if n < 0.12 else (body_r[3] if n > 0.9 else body_r[2])
    return p


def candle(x, v):
    wy = 15 - v
    return (250, 240, 240) if (wy + x) % 2 else (236, 110, 140)


def flame(x, v):
    return (255, 214, 90) if (x + v) % 2 else (255, 150, 40)


def berry_side(x, v):
    n = noise(x, v, 11)
    if n > 0.82:
        return (250, 226, 120)  # seeds
    return (200, 30, 44) if n > 0.3 else (226, 52, 60)


def berry_top(x, y):
    return (70, 140, 54) if (x + y) % 3 else (44, 104, 40)


# --------------------------------------------------------------------------------------------- palettes
def R(c, lo=0.72, hi=1.12):
    return ramp(c, lo=lo, hi=hi)


SPONGE = R((238, 200, 120))
SPONGE_CRUST = R((196, 132, 62))
CREAM = R((250, 246, 236), 0.86, 1.03)
CHOC = R((92, 54, 34))
CHOC_SPONGE = R((120, 74, 46))
GANACHE = R((70, 38, 24))
PINK = R((246, 172, 192), 0.8, 1.06)
MINT = R((150, 222, 186), 0.8, 1.06)
CHEESE = R((246, 222, 150), 0.82, 1.05)
CHEESE_TOP = R((214, 150, 72))
GRAHAM = R((168, 112, 64))
MATCHA = R((150, 190, 96))
MATCHA_TOP = R((128, 150, 70))
CRUST = R((214, 150, 76))
CRUST_D = R((176, 108, 48))
APPLE = R((200, 120, 40), 0.6, 1.25)
BLUE = R((64, 44, 120), 0.6, 1.3)
CUSTARD = R((248, 214, 96))
FISHPIE = R((240, 232, 210))
STRAW = R((214, 46, 60))

ATLASES = {}


def make_atlas(did, sw):
    ATLASES[did] = Atlas({k: Swatch(v) for k, v in sw.items()})


# --------------------------------------------------------------------------------------------- builders
def disc_layers(quarters, specs, diameter=14, hole=0.0):
    """specs: [(y0, y1, mat, diameter or None, ring_inner or 0)] -> boxes per quarter."""
    out = []
    for k in quarters:
        for y0, y1, mat, d, inner in specs:
            d = d or diameter
            cells = disc_mask(d, quadrants={k}, hole=max(hole, inner))
            out += layer(cells, y0, y1, mat, tag=k)
    return out


def deco_at(k, radius, angle_off=0.0):
    """Centre (x, z) of a decoration in quarter k at `radius` (snapped to whole pixels)."""
    a = math.radians(45 + angle_off)
    sx, sz = QUARTER_CENTRES[k]
    return round(sx * radius * math.cos(a)), round(sz * radius * math.sin(a))


def cube_at(cx, cz, y0, size, h, mat, k):
    s = size / 2.0
    sx, sz = QUARTER_CENTRES[k]
    assert sx * cx - s >= -1e-6 and sz * cz - s >= -1e-6, f"decoration at {cx},{cz} leaves quarter {k}"
    return Box(cx - s, y0, cz - s, cx + s, y0 + h, cz + s, mat, tag=k)


def _overlaps(a, b):
    return all(min(a.hi[i], b.hi[i]) - max(a.lo[i], b.lo[i]) > 1e-6 for i in range(3))


def piping(k, y, mat, others, r=6.0, angles=(15, 45, 75)):
    """Piped beads of cream around the top edge of quarter k (skipping any spot a topping already uses)."""
    sx, sz = QUARTER_CENTRES[k]
    out = []
    for a in angles:
        cx = sx * (math.floor(abs(r * math.cos(math.radians(a)))) + 0.5)
        cz = sz * (math.floor(abs(r * math.sin(math.radians(a)))) + 0.5)
        bead = [Box(cx - 0.5, y, cz - 0.5, cx + 0.5, y + 1, cz + 0.5, mat, tag=k),
                Box(cx - 0.25, y + 1, cz - 0.25, cx + 0.25, y + 1.5, cz + 0.25, mat, tag=k)]
        if not any(_overlaps(b, o) for b in bead for o in others + out):
            out += bead
    return out


def cake(did, h, side, top, cut, quarters, deco=None, hole=0.0, base=None, pipe=None):
    m = {"*": "side", "top": "top", "cut": "cut", "bottom": "base" if base else "side"}
    boxes = []
    if base:
        boxes += disc_layers(quarters, [(0, 1, {"*": "base", "cut": "cut", "top": "top"}, None, 0)], hole=hole)
        boxes += disc_layers(quarters, [(1, h, m, None, 0)], hole=hole)
    else:
        boxes += disc_layers(quarters, [(0, h, m, None, 0)], hole=hole)
    if deco:
        for k in quarters:
            boxes += deco(k)
    if pipe:
        for k in quarters:
            boxes += piping(k, h, pipe, boxes)
    return boxes


def strawberry(cx, cz, y, k):
    cube_at(cx, cz, y, 2, 2, "berry", k)  # quarter check
    return [Box(cx - 1, y, cz - 1, cx + 1, y + 2, cz + 1, {"*": "berry", "top": "leaf"}, tag=k)]


def dollop(cx, cz, y, k, mat="dollop"):
    cube_at(cx, cz, y, 2, 1, mat, k)  # quarter check
    return [Box(cx - 1, y, cz - 1, cx + 1, y + 1, cz + 1, mat, tag=k),
            Box(cx - 0.5, y + 1, cz - 0.5, cx + 0.5, y + 1.5, cz + 0.5, mat, tag=k)]


# --------------------------------------------------------------------------------------------- desserts
def sponge_cake(q):
    make_atlas("sponge_cake", {
        "side": side_with_band(8, SPONGE_CRUST, SPONGE_CRUST, 1),
        "top": speckle(SPONGE_CRUST, [((250, 250, 244), 0.18)]),
        "cut": rows([(0, 1, SPONGE_CRUST), (1, 7, SPONGE), (7, 8, SPONGE_CRUST)]),
    })
    return cake("sponge_cake", 8, None, None, None, q)


def chocolate_cake(q):
    make_atlas("chocolate_cake", {
        "side": side_with_band(8, GANACHE, CHOC, 2),
        "top": speckle(GANACHE, [((150, 96, 60), 0.06)]),
        "cut": rows([(0, 2, CHOC_SPONGE), (2, 3, GANACHE), (3, 5, CHOC_SPONGE), (5, 6, GANACHE), (6, 7, CHOC_SPONGE), (7, 8, GANACHE)]),
        "curl": speckle(R((138, 88, 56))), "pipe": speckle(GANACHE),
    })
    return cake("chocolate_cake", 8, None, None, None, q, pipe="pipe",
                deco=lambda k: [cube_at(*deco_at(k, 4.5), 8, 2, 1, "curl", k), cube_at(*deco_at(k, 2.5, 30), 8, 1, 1, "curl", k)])


def strawberry_cream_cake(q):
    make_atlas("strawberry_cream_cake", {
        "side": side_with_band(9, CREAM, CREAM, 1),
        "top": radial(CREAM, CREAM),
        "cut": rows([(0, 3, SPONGE), (3, 4, CREAM), (4, 5, STRAW), (5, 7, SPONGE), (7, 9, CREAM)]),
        "berry": berry_side, "leaf": berry_top, "dollop": speckle(CREAM),
    })
    return cake("strawberry_cream_cake", 9, None, None, None, q, pipe="dollop",
                deco=lambda k: strawberry(*deco_at(k, 4.5), 9, k) + dollop(*deco_at(k, 4.5, 38), 9, k))


def birthday_cake(q):
    make_atlas("birthday_cake", {
        "side": side_with_band(9, CREAM, PINK, 2),
        "top": radial(CREAM, PINK, 5.5, dots=[((236, 80, 100), 0.05), ((90, 160, 230), 0.05), ((250, 220, 80), 0.05)]),
        "cut": rows([(0, 3, SPONGE), (3, 4, PINK), (4, 7, SPONGE), (7, 9, CREAM)]),
        "candle": candle, "flame": flame, "berry": berry_side, "leaf": berry_top, "pipe": speckle(CREAM),
    })

    def deco(k):
        cx, cz = deco_at(k, 3.5)
        return [Box(cx - 0.5, 9, cz - 0.5, cx + 0.5, 12, cz + 0.5, "candle", tag=k),
                Box(cx - 0.5, 12.25, cz - 0.5, cx + 0.5, 13.25, cz + 0.5, "flame", tag=k)] + strawberry(*deco_at(k, 5.5, 30), 9, k)
    return cake("birthday_cake", 9, None, None, None, q, deco=deco, pipe="pipe")


def mint_chocolate_cake(q):
    make_atlas("mint_chocolate_cake", {
        "side": side_with_band(9, GANACHE, MINT, 2),
        "top": radial(MINT, GANACHE, 5.5, dots=[((70, 38, 24), 0.12)]),
        "cut": rows([(0, 3, CHOC_SPONGE), (3, 4, MINT), (4, 6, CHOC_SPONGE), (6, 7, MINT), (7, 9, GANACHE)]),
        "leaf": speckle(R((64, 160, 84))), "curl": speckle(GANACHE), "pipe": speckle(MINT),
    })
    return cake("mint_chocolate_cake", 9, None, None, None, q, pipe="pipe",
                deco=lambda k: [cube_at(*deco_at(k, 4), 9, 2, 0.5, "leaf", k), cube_at(*deco_at(k, 2, 20), 9, 1, 1, "curl", k)])


def cheesecake(q):
    make_atlas("cheesecake", {
        "side": side_with_band(7, CHEESE_TOP, CHEESE, 1),
        "top": radial(CHEESE_TOP, CHEESE_TOP, 5.5),
        "cut": rows([(0, 1, GRAHAM), (1, 6, CHEESE), (6, 7, CHEESE_TOP)]),
        "base": speckle(GRAHAM),
    })
    return cake("cheesecake", 7, None, None, None, q, base=True)


def matcha_chiffon(q):
    make_atlas("matcha_chiffon", {
        "side": side_with_band(9, MATCHA_TOP, MATCHA, 1),
        "top": speckle(MATCHA_TOP),
        "cut": rows([(0, 9, MATCHA)], grain=0.25),
        "dollop": speckle(CREAM, [((150, 190, 96), 0.15)]),
    })
    return cake("matcha_chiffon", 9, None, None, None, q, hole=4, pipe="dollop",
                deco=lambda k: dollop(*deco_at(k, 4.5), 9, k))


def pie(did, filling_top, filling_cut, top_mat_painter, rim=True, dome=False, vents=False):
    sw = {
        "side": fluted(CRUST), "rim": speckle(CRUST, [((240, 200, 130), 0.1)]), "top": top_mat_painter,
        "cut": rows([(0, 1, CRUST_D), (1, 4, filling_cut)]), "under": speckle(CRUST_D),
    }
    make_atlas(did, sw)

    def build(q):
        boxes = []
        for k in q:
            boxes += layer(disc_mask(14, quadrants={k}), 0, 3, {"*": "side", "top": "top", "cut": "cut", "bottom": "under"}, tag=k)
            if rim:
                boxes += layer(ring_mask(14, 12, quadrants={k}), 3, 4, {"*": "rim", "cut": "cut"}, tag=k)
            if dome:
                boxes += layer(disc_mask(12, quadrants={k}), 3, 4, {"*": "rim", "cut": "cut", "top": "top"}, tag=k)
            if rim:  # crimped edge: every other rim pixel pinched up
                for x, z in sorted(ring_mask(14, 12, quadrants={k})):
                    if (x + z) % 2 == 0:
                        boxes.append(Box(x, 4, z, x + 1, 4.5, z + 1, "rim", tag=k))
        return boxes
    return build


LATTICE = R((236, 182, 104), 0.7, 1.12)
apple_pie = pie("apple_pie", APPLE, APPLE, lattice(LATTICE, APPLE))
blueberry_pie = pie("blueberry_pie", BLUE, BLUE, lattice(LATTICE, BLUE))
quiche = pie("quiche", CUSTARD, CUSTARD, speckle(CUSTARD, [((80, 150, 60), 0.08), ((200, 80, 60), 0.05)]))


def _fish_top(x, y):
    # golden pastry lid with three steam vents and a fish cut-out in the middle
    if (x, y) in ((5, 6), (5, 7), (10, 6), (10, 7), (8, 11), (8, 12)):
        return (120, 70, 30)
    if 6 <= x <= 10 and y == 8 or (x, y) in ((6, 7), (6, 9), (11, 7), (11, 9)):
        return (240, 196, 120)
    n = noise(x, y, 21)
    return CRUST[2] if n > 0.15 else CRUST[1]


fish_pie = pie("fish_pie", FISHPIE, FISHPIE, _fish_top, rim=True, dome=True)


def _fish_pie_cut(x, v):
    wy = 15 - v
    if wy == 0 or wy == 3:
        return CRUST_D[2]
    return (232, 132, 120) if noise(x, v, 23) > 0.7 else FISHPIE[2]


DESSERTS = {
    "sponge_cake": (8, sponge_cake), "chocolate_cake": (8, chocolate_cake),
    "strawberry_cream_cake": (9, strawberry_cream_cake), "birthday_cake": (9, birthday_cake),
    "mint_chocolate_cake": (9, mint_chocolate_cake), "cheesecake": (7, cheesecake), "matcha_chiffon": (9, matcha_chiffon),
    "apple_pie": (4, apple_pie), "blueberry_pie": (4, blueberry_pie), "quiche": (4, quiche), "fish_pie": (4, fish_pie),
}


def models(did):
    """{q: boxes} for q = 1..4 quarters left (quarters 0..q-1 kept), plus the dessert's atlas."""
    _, fn = DESSERTS[did]
    out = {q: fn(list(range(q))) for q in range(1, 5)}
    if did == "fish_pie":
        ATLASES[did].swatches["cut"] = Swatch(_fish_pie_cut)
    return out, ATLASES[did]
