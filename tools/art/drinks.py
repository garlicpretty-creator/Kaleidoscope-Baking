"""Placed mug drinks: 1-4 mugs on saucers (geometry.kaleidoscope_baking.mug_<n>, shared by every mug drink) and one
atlas per drink (textures/blocks/kb_drink_<id>.png) whose `drink` swatch is the surface seen in the mug.

Every drink atlas has the same swatch layout, so the shared geometry's UVs fit all of them.
"""
import math

from kit import Atlas, Box, Swatch, flat, noise, ramp

CERAMIC = ramp((238, 232, 220), lo=0.8, hi=1.06)
ROSE = ramp((196, 92, 110))
SAUCER = ramp((226, 218, 204), lo=0.8, hi=1.08)

# mug centres (json x, z) for 1..4 mugs; odd widths sit on half pixels
LAYOUT = {1: [(0.5, 0.5)],
          2: [(-3.5, 1.5), (3.5, -2.5)],
          3: [(-3.5, -3.5), (3.5, -3.5), (-0.5, 3.5)],
          4: [(-3.5, -3.5), (3.5, -3.5), (-3.5, 3.5), (3.5, 3.5)]}


def mug_side(x, v):
    wy = 15 - v  # world y of this row (mugs stand on a 0.5 saucer; rows 1..4)
    if wy == 4:
        return CERAMIC[4]  # glazed lip
    if wy == 2:
        return ROSE[2]     # rose band, the series colour
    n = noise(x, v, 3)
    return CERAMIC[3] if n > 0.85 else CERAMIC[2]


def saucer_top(x, y):
    return SAUCER[3] if (x + y) % 5 else SAUCER[2]


def surface(base, art=None, seed=0):
    """3x3 drink surface (top-left of the swatch): base ramp + optional art pixels {(x, y): colour}."""
    def p(x, y):
        if art and (x, y) in art:
            return art[(x, y)]
        n = noise(x, y, seed)
        return base[3] if n > 0.8 else base[2]
    return p


COFFEE = ramp((70, 40, 22))
CREMA = (196, 134, 70)
FOAM = (244, 236, 222)
LATTE = ramp((196, 150, 104))
MOCHA = ramp((104, 62, 40))
CARAMEL = (214, 140, 50)
CINNAMON = (150, 84, 44)

DRINKS = {
    "espresso": surface(COFFEE, {(1, 1): CREMA, (0, 1): CREMA, (1, 0): CREMA}),
    "americano": surface(COFFEE, {(0, 0): (110, 70, 40)}),
    "latte": surface(LATTE, {(0, 0): FOAM, (2, 0): FOAM, (1, 1): FOAM, (0, 1): FOAM, (2, 1): FOAM}),   # heart
    "cappuccino": surface(ramp(FOAM, lo=0.9, hi=1.02), {(1, 1): CINNAMON, (2, 2): (170, 110, 70)}),
    "mocha": surface(MOCHA, {(1, 1): FOAM, (0, 2): (60, 34, 22)}),
    "caramel_macchiato": surface(ramp(FOAM, lo=0.9, hi=1.02), {(0, 0): CARAMEL, (1, 1): CARAMEL, (2, 2): CARAMEL, (2, 0): CARAMEL}),
    "cinnamon_latte": surface(LATTE, {(0, 2): CINNAMON, (1, 0): CINNAMON, (2, 1): CINNAMON}),
    "pour_over_light": surface(ramp((150, 86, 40)), {(0, 0): (200, 140, 90)}),
    "pour_over_medium": surface(ramp((104, 58, 30)), {(0, 0): (160, 104, 64)}),
    "pour_over_dark": surface(ramp((56, 32, 20)), {(0, 0): (110, 70, 44)}),
}


def atlas_for(drink):
    return Atlas({"mug": Swatch(mug_side), "rim": Swatch(flat(CERAMIC, 5, 0.05)), "saucer": Swatch(flat(SAUCER, 7)),
                  "saucer_top": Swatch(saucer_top), "drink": Swatch(DRINKS[drink])})


def mug(cx, cz):
    """One mug on its saucer, handle toward +json x."""
    x0, x1, z0, z1 = cx - 2.5, cx + 2.5, cz - 2.5, cz + 2.5
    b = [Box(cx - 3.5, 0, cz - 3.5, cx + 3.5, 0.5, cz + 3.5, {"*": "saucer", "top": "saucer_top"})]
    # walls (a square ring 5 wide, 1 thick) and the drink inside, half a pixel below the lip
    b += [Box(x0, 0.5, z0, x1, 5, z0 + 1, {"*": "mug", "top": "rim"}), Box(x0, 0.5, z1 - 1, x1, 5, z1, {"*": "mug", "top": "rim"}),
          Box(x0, 0.5, z0 + 1, x0 + 1, 5, z1 - 1, {"*": "mug", "top": "rim"}), Box(x1 - 1, 0.5, z0 + 1, x1, 5, z1 - 1, {"*": "mug", "top": "rim"})]
    b.append(Box(x0 + 1, 0.5, z0 + 1, x1 - 1, 4.5, z1 - 1, {"*": "mug", "top": "drink"}, decal={"up": ("drink", 0, 0)}))
    # handle
    b += [Box(x1, 3.5, cz - 0.5, x1 + 1, 4.25, cz + 0.5, "rim"), Box(x1, 1.5, cz - 0.5, x1 + 1, 2.25, cz + 0.5, "rim"),
          Box(x1 + 1, 1.5, cz - 0.5, x1 + 1.75, 4.25, cz + 0.5, "rim")]
    return b


def models():
    return {n: [b for c in LAYOUT[n] for b in mug(*c)] for n in range(1, 5)}
