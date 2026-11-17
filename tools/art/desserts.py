"""Placeable whole desserts, Cookery style: one box per slice, everything else painted.

Each dessert has geometry.kaleidoscope_baking.<id>_q<1..4> (q = slices left) sharing one texture
textures/blocks/kb_<id>.png. Slice k (0: +x-z, 1: -x-z, 2: -x+z, 3: +x+z) is a 7 x h x 7 box; the faces on the
x=0 / z=0 planes are cut faces and show the layers inside. Piping, drips, crimped crusts, lattice and fillings are
painted from world coordinates so they line up across slices. Only toppings that stand up (strawberries, candles,
cream dollops) are boxes, and they leave with their slice.
"""
import math

from kit import Box, noise, painter, ramp

QUARTER = {0: (1, -1), 1: (-1, -1), 2: (-1, 1), 3: (1, 1)}


def R(c, lo=0.72, hi=1.12):
    return ramp(c, lo=lo, hi=hi)


SPONGE = R((238, 200, 120))
CRUST_C = R((196, 132, 62))
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
LATTICE = R((236, 182, 104), 0.7, 1.12)
APPLE = R((200, 120, 40), 0.6, 1.25)
BLUE = R((64, 44, 120), 0.6, 1.3)
CUSTARD = R((248, 214, 96))
FISHPIE = R((240, 232, 210))
STRAW = R((214, 46, 60))
LEAF = R((64, 160, 84))


def nz(t, seed):
    return noise(int(math.floor(t.x + 64)), int(math.floor(t.y + 64)) * 131 + int(math.floor(t.z + 64)), seed)


def g(r, t, seed=1, lo=0.12, hi=0.88):
    k = nz(t, seed)
    return r[1] if k < lo else (r[3] if k > hi else r[2])


def edge(t):
    """Distance from the cake's outer edge, in pixels (0 at the edge)."""
    return 7 - max(abs(t.x), abs(t.z))


# --------------------------------------------------------------------------------------------- painter factories
def layers(stack, seed=2):
    """Cut face / side: bands by height. stack = [(y_from, y_to, ramp)]; above the last band uses the last ramp."""
    @painter
    def p(t):
        for y0, y1, r in stack:
            if y0 <= t.y < y1:
                return g(r, t, seed)
        return g(stack[-1][2], t, seed)
    return p


def frosted_side(h, top_r, body_r, drip=2, seed=3):
    """Outside of a frosted cake: a glaze / cream band at the top that drips unevenly down, body below."""
    @painter
    def p(t):
        col = int(math.floor(t.x + t.z + 64))
        reach = drip + (1 if noise(col, 0, seed) > 0.6 else 0) + (1 if noise(col, 1, seed) > 0.85 else 0)
        if t.y >= h - reach:
            return g(top_r, t, seed + 1)
        return g(body_r, t, seed + 2)
    return p


def piped_top(fill, pipe, dots=(), seed=4, centre=None):
    """Top: piped beads around the edge (alternating light / shaded), sprinkles inside, optional centre art."""
    @painter
    def p(t):
        if edge(t) < 1.2:
            return pipe[3] if (int(math.floor(t.x + 64)) + int(math.floor(t.z + 64))) % 2 == 0 else pipe[1]
        if centre:
            c = centre(t)
            if c:
                return c
        k = nz(t, seed)
        acc = 0.0
        for col, prob in dots:
            acc += prob
            if k < acc:
                return col
        return g(fill, t, seed + 5)
    return p


def plain_top(r, dots=(), seed=5):
    @painter
    def p(t):
        k = nz(t, seed)
        acc = 0.0
        for col, prob in dots:
            acc += prob
            if k < acc:
                return col
        return g(r, t, seed + 1)
    return p


@painter
def berry(t):
    if not t.side:
        return (70, 140, 54) if (t.u + t.v) % 3 else (44, 104, 40)  # calyx
    k = nz(t, 11)
    return (250, 226, 120) if k > 0.8 else STRAW[2 if k > 0.3 else 3]


@painter
def candle(t):
    return (250, 240, 240) if int(t.y * 2) % 2 else (236, 110, 140)


@painter
def flame(t):
    return (255, 214, 90) if (t.u + t.v) % 2 else (255, 150, 40)


flame.shade = False


def dollop_of(r):
    @painter
    def p(t):
        if not t.side:
            return r[4] if (t.u, t.v) == (0, 0) else r[3]
        return r[3] if t.v == 0 else r[2]
    return p


def base_under(r):
    @painter
    def p(t):
        return g(r, t, 9)
    return p


# --------------------------------------------------------------------------------------------- builders
SLICE = {0: (0, -7, 7, 0), 1: (-7, -7, 0, 0), 2: (-7, 0, 0, 7), 3: (0, 0, 7, 7)}
MATS = {"*": "side", "top": "top", "cut": "cut", "bottom": "base"}


def slices(q, h):
    return [Box(SLICE[k][0], 0, SLICE[k][1], SLICE[k][2], h, SLICE[k][3], MATS, tag=k) for k in range(q)]


def topper(k, a, b, y, size, h, mat):
    """A standing topping centred (a, b) pixels into slice k from the cake centre."""
    sx, sz = QUARTER[k]
    cx, cz, s = sx * a, sz * b, size / 2.0
    assert a - s >= 0 and b - s >= 0, "topping must stay inside its slice"
    return Box(cx - s, y, cz - s, cx + s, y + h, cz + s, mat, tag=k)


DESSERTS = {}


def dessert(did, h, painters, deco=None):
    def build(q):
        boxes = slices(q, h)
        if deco:
            for k in range(q):
                boxes += deco(k, h)
        return boxes
    DESSERTS[did] = (h, build, painters)


# --------------------------------------------------------------------------------------------- the eleven desserts
dessert("sponge_cake", 8, {
    "side": frosted_side(8, CRUST_C, SPONGE, 1), "top": plain_top(CRUST_C, [((250, 250, 244), 0.2)]),
    "cut": layers([(0, 1, CRUST_C), (1, 7, SPONGE), (7, 8, CRUST_C)]), "base": base_under(CRUST_C)})

dessert("chocolate_cake", 8, {
    "side": frosted_side(8, GANACHE, CHOC, 2),
    "top": piped_top(GANACHE, GANACHE, [((150, 96, 60), 0.12), ((176, 120, 80), 0.05)]),
    "cut": layers([(0, 2, CHOC_SPONGE), (2, 3, GANACHE), (3, 5, CHOC_SPONGE), (5, 6, GANACHE), (6, 7, CHOC_SPONGE), (7, 8, GANACHE)]),
    "base": base_under(CHOC)})

dessert("strawberry_cream_cake", 9, {
    "side": frosted_side(9, CREAM, CREAM, 1), "top": piped_top(CREAM, CREAM, [((226, 52, 60), 0.04)]),
    "cut": layers([(0, 3, SPONGE), (3, 4, CREAM), (4, 5, STRAW), (5, 7, SPONGE), (7, 9, CREAM)]),
    "base": base_under(SPONGE), "berry": berry},
    deco=lambda k, h: [topper(k, 3.5, 3.5, h, 2, 2, "berry")])

dessert("birthday_cake", 9, {
    "side": frosted_side(9, CREAM, PINK, 2),
    "top": piped_top(PINK, CREAM, [((236, 80, 100), 0.06), ((90, 160, 230), 0.06), ((250, 220, 80), 0.06)]),
    "cut": layers([(0, 3, SPONGE), (3, 4, PINK), (4, 7, SPONGE), (7, 9, CREAM)]),
    "base": base_under(SPONGE), "berry": berry, "candle": candle, "flame": flame},
    deco=lambda k, h: [topper(k, 3.5, 3.5, h, 1, 3, "candle"), topper(k, 3.5, 3.5, h + 3.25, 1, 1, "flame")])


def _mint_leaves(t):
    if 2 < abs(t.x) < 4.5 and 2 < abs(t.z) < 4.5 and (int(t.x + 64) + int(t.z + 64)) % 3 != 0:
        return LEAF[2] if int(t.x + t.z + 64) % 2 else LEAF[3]
    return None


dessert("mint_chocolate_cake", 9, {
    "side": frosted_side(9, GANACHE, MINT, 2),
    "top": piped_top(MINT, GANACHE, [((70, 38, 24), 0.14)], centre=_mint_leaves),
    "cut": layers([(0, 3, CHOC_SPONGE), (3, 4, MINT), (4, 6, CHOC_SPONGE), (6, 7, MINT), (7, 9, GANACHE)]),
    "base": base_under(CHOC)})

dessert("cheesecake", 7, {
    "side": layers([(0, 1, GRAHAM), (1, 6, CHEESE), (6, 7, CHEESE_TOP)]),
    "top": plain_top(CHEESE_TOP, [((236, 176, 96), 0.15)]),
    "cut": layers([(0, 1, GRAHAM), (1, 6, CHEESE), (6, 7, CHEESE_TOP)]), "base": base_under(GRAHAM)})


def _chiffon_hole(t):
    d = math.hypot(t.x, t.z)
    if d < 1.6:
        return MATCHA[0]
    if d < 2.4:
        return MATCHA[1]
    return None


dessert("matcha_chiffon", 9, {
    "side": frosted_side(9, MATCHA_TOP, MATCHA, 1),
    "top": piped_top(MATCHA_TOP, MATCHA_TOP, centre=_chiffon_hole),
    "cut": layers([(0, 9, MATCHA)]), "base": base_under(MATCHA_TOP), "dollop": dollop_of(CREAM)},
    deco=lambda k, h: [topper(k, 3.5, 3.5, h, 2, 1, "dollop")])


# --------------------------------------------------------------------------------------------- pies
def crimped_top(inner):
    """Pie top: crimped crust edge (alternating light / shadow pinches) around `inner`."""
    @painter
    def p(t):
        if edge(t) < 1.5:
            return CRUST[4] if (int(math.floor(t.x + 64)) + int(math.floor(t.z + 64))) % 2 == 0 else CRUST[1]
        return inner(t)
    return p


def lattice(fill):
    def p(t):
        x, z = int(math.floor(t.x + 64)), int(math.floor(t.z + 64))
        on_x, on_z = z % 4 in (1, 2), x % 4 in (1, 2)
        if on_x and on_z:
            over = (x // 4 + z // 4) % 2 == 0
            return LATTICE[4] if over == (z % 4 == 1) else LATTICE[1]
        if on_x or on_z:
            return LATTICE[3] if (z % 4 == 1 if on_x else x % 4 == 1) else LATTICE[2]
        k = nz(t, 6)
        return fill[0] if k < 0.2 else (fill[4] if k > 0.85 else fill[2])
    return p


def quiche_fill(t):
    k = nz(t, 7)
    return (80, 150, 60) if k > 0.9 else ((200, 80, 60) if k > 0.84 else g(CUSTARD, t, 8))


def fish_lid(t):
    x, z = t.x, t.z
    if (abs(x - 4) < 0.5 or abs(x + 4) < 0.5) and abs(z) < 1.5:
        return (120, 70, 30)  # steam vents
    if (abs(z) < 0.6 and -2.5 < x < 2.5) or (abs(abs(x) - 2.5) < 0.6 and abs(z) < 1.4):
        return (240, 196, 120)  # pastry fish
    return g(CRUST, t, 9)


@painter
def fluted(t):
    return CRUST[3] if int(math.floor(t.x + t.z + 64)) % 2 == 0 else CRUST[1]


def pie(did, inner, filling):
    dessert(did, 4, {"side": fluted, "top": crimped_top(inner),
                     "cut": layers([(0, 1, CRUST_D), (1, 3.5, filling), (3.5, 4, CRUST)]), "base": base_under(CRUST_D)})


pie("apple_pie", lattice(APPLE), APPLE)
pie("blueberry_pie", lattice(BLUE), BLUE)
pie("quiche", quiche_fill, CUSTARD)
pie("fish_pie", fish_lid, FISHPIE)


def models(did):
    """({q: boxes} for q = 1..4 slices left, painters)."""
    _, build, painters = DESSERTS[did]
    return {q: build(q) for q in range(1, 5)}, painters
