"""Placed mug drinks, Cookery style: each mug is a saucer, a body and a handle (3 boxes), painted.

geometry.kaleidoscope_baking.mug_<1..4> is shared by every mug drink, and every drink's texture
textures/blocks/kb_drink_<id>.png uses the same layout; only the painted drink surface differs.
"""
import math

from kit import Box, noise, painter, ramp

CERAMIC = ramp((238, 232, 220), lo=0.8, hi=1.06)
ROSE = ramp((196, 92, 110))
SAUCER = ramp((226, 218, 204), lo=0.8, hi=1.08)
CLEAR = (0, 0, 0, 0)

# mug centres (json x, z) for 1..4 mugs (mugs are 4 wide, centred on whole pixels)
LAYOUT = {1: [(0, 0)],
          2: [(-4, 2), (4, -2)],
          3: [(-4, -4), (4, -4), (0, 4)],
          4: [(-4, -4), (4, -4), (-4, 4), (4, 4)]}


@painter
def mug_side(t):
    if t.y >= 4.5:
        return CERAMIC[4]          # glazed lip
    if 1.5 <= t.y < 2.2:
        return ROSE[2]             # rose band, the series colour
    return CERAMIC[3] if noise(t.u, t.v, 3) > 0.85 else CERAMIC[2]


@painter
def handle(t):
    """Handle seen from the side: a loop with a hole; from the front / top a plain bar."""
    if t.face in ("north", "south") and t.w >= 2 and t.h >= 3 and 0 < t.v < t.h - 1 and t.u < t.w - 1:
        return CLEAR
    return CERAMIC[3]


@painter
def saucer(t):
    if not t.side and 1 <= t.u < t.w - 1 and 1 <= t.v < t.h - 1:
        return SAUCER[2] if (t.u + t.v) % 5 else SAUCER[1]
    return SAUCER[3]


def surface(base, rows, colours):
    """Top of the mug: the whole 4 x 4 face is the drink (the glazed lip is on the sides), drawn from `rows`,
    four strings of four keys into `colours`; "." is the drink itself with a little noise."""
    @painter
    def p(t):
        k = rows[min(t.v, 3)][min(t.u, 3)]
        if k != ".":
            return colours[k]
        return base[3] if noise(t.u, t.v, 7) > 0.8 else base[2]
    p.shade = False
    return p


COFFEE = ramp((52, 30, 18))
CREMA = ramp((190, 124, 62))
FOAM = (246, 240, 228)
LATTE = ramp((196, 150, 104))
MOCHA = ramp((92, 54, 34))
CARAMEL = (214, 140, 50)
CINNAMON = (122, 64, 32)
DUST = (150, 98, 64)
FOAMY = ramp(FOAM, lo=0.9, hi=1.02)
C = {"W": FOAM, "c": CARAMEL, "k": CINNAMON, "d": DUST, "m": MOCHA[2], "s": (92, 52, 30), "h": (226, 160, 100)}

# every drink reads differently from above: espresso is all crema, americano plain black, latte a white heart,
# cappuccino a foam dome dusted with cocoa, mocha whipped cream with chocolate drizzle, caramel macchiato a
# caramel crosshatch on foam, cinnamon latte a cinnamon stick; pour-overs are clear coffee of three roasts.
DRINKS = {
    "espresso": surface(CREMA, ["s...", "....", "..s.", "...."], C),
    "americano": surface(COFFEE, ["h...", "....", "....", "...."], {"h": (96, 62, 40)}),
    "latte": surface(LATTE, ["W.W.", "WWW.", ".W..", "...."], C),
    "cappuccino": surface(FOAMY, ["....", ".d..", "..d.", "...."], C),
    "mocha": surface(MOCHA, [".WW.", "WmWW", "WWmW", ".WW."], C),
    "caramel_macchiato": surface(FOAMY, ["c.c.", ".c.c", "c.c.", ".c.c"], C),
    "cinnamon_latte": surface(LATTE, ["k...", ".k.d", "d.k.", "...k"], C),
    "pour_over_light": surface(ramp((168, 92, 40)), ["h...", "....", "....", "...."], {"h": (224, 164, 104)}),
    "pour_over_medium": surface(ramp((108, 58, 28)), ["h...", "....", "....", "...."], {"h": (168, 110, 66)}),
    "pour_over_dark": surface(ramp((40, 24, 16)), ["h...", "....", "....", "...."], {"h": (92, 62, 44)}),
}


def painters_for(drink):
    return {"mug": mug_side, "top": DRINKS[drink], "handle": handle, "saucer": saucer}


def mug(cx, cz):
    return [Box(cx - 3, 0, cz - 3, cx + 3, 0.5, cz + 3, "saucer"),
            Box(cx - 2, 0.5, cz - 2, cx + 2, 5, cz + 2, {"*": "mug", "top": "top"}),
            Box(cx + 2, 1.5, cz - 0.5, cx + 3.5, 4.5, cz + 0.5, "handle")]


def models():
    return {n: [b for c in LAYOUT[n] for b in mug(*c)] for n in range(1, 5)}
