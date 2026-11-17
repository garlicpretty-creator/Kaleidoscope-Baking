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


def surface(base, art):
    """Top of the mug: ceramic lip around a 2 x 2 drink, `art` = {(u, v): colour} inside the drink."""
    @painter
    def p(t):
        if t.u in (0, t.w - 1) or t.v in (0, t.h - 1):
            return CERAMIC[4]
        key = (t.u - 1, t.v - 1)
        if key in art:
            return art[key]
        return base[3] if noise(t.u, t.v, 7) > 0.8 else base[2]
    p.shade = False
    return p


COFFEE = ramp((70, 40, 22))
CREMA = (196, 134, 70)
FOAM = (244, 236, 222)
LATTE = ramp((196, 150, 104))
MOCHA = ramp((104, 62, 40))
CARAMEL = (214, 140, 50)
CINNAMON = (150, 84, 44)
FOAMY = ramp(FOAM, lo=0.9, hi=1.02)

DRINKS = {
    "espresso": surface(COFFEE, {(0, 0): CREMA, (1, 1): CREMA}),
    "americano": surface(COFFEE, {(0, 0): (110, 70, 40)}),
    "latte": surface(LATTE, {(0, 0): FOAM, (1, 1): FOAM}),
    "cappuccino": surface(FOAMY, {(1, 0): CINNAMON}),
    "mocha": surface(MOCHA, {(0, 0): FOAM}),
    "caramel_macchiato": surface(FOAMY, {(0, 0): CARAMEL, (1, 1): CARAMEL}),
    "cinnamon_latte": surface(LATTE, {(1, 0): CINNAMON, (0, 1): CINNAMON}),
    "pour_over_light": surface(ramp((150, 86, 40)), {(0, 0): (200, 140, 90)}),
    "pour_over_medium": surface(ramp((104, 58, 30)), {(0, 0): (160, 104, 64)}),
    "pour_over_dark": surface(ramp((56, 32, 20)), {(0, 0): (110, 70, 44)}),
}


def painters_for(drink):
    return {"mug": mug_side, "top": DRINKS[drink], "handle": handle, "saucer": saucer}


def mug(cx, cz):
    return [Box(cx - 3, 0, cz - 3, cx + 3, 0.5, cz + 3, "saucer"),
            Box(cx - 2, 0.5, cz - 2, cx + 2, 5, cz + 2, {"*": "mug", "top": "top"}),
            Box(cx + 2, 1.5, cz - 0.5, cx + 3.5, 4.5, cz + 0.5, "handle")]


def models():
    return {n: [b for c in LAYOUT[n] for b in mug(*c)] for n in range(1, 5)}
