"""Baking plant textures: every crop / bush stage, saplings, cinnamon & lemon leaves and the cinnamon log.

Drawing helpers come from paint_lib (vendored from Harvest). Bushes have 4 stages; the annual crops have 8 block
states drawn as 4 visual stages (state // 2). Writes RP/textures/blocks/kb_<name>.png and returns the images for
the preview sheet.
"""
import math
import os
import random
import zlib

from PIL import Image

import paint_lib as P
from paint_lib import (B, BLUE, BRONZE, BROWN, FLW, G, GD, GL, LEMON, PINK, PODS, RED, SAGE, TAN, UNRIPE, VIOLET,
                       WOOD, YFLW, YG, Canvas, ellipse, fruit_key, leaf, line, path, sprout, stamp)

LILAC = [(110, 90, 150), (146, 124, 186), (182, 162, 214), (212, 198, 236), (238, 230, 250)]
CANE = [(70, 32, 30), (100, 48, 40), (130, 66, 50), (160, 92, 66), (190, 124, 92)]
RASP = [(110, 14, 40), (160, 24, 56), (206, 46, 78), (232, 92, 116), (248, 150, 168)]
CINN_BARK = [(70, 36, 24), (98, 52, 34), (126, 70, 44), (152, 92, 58), (178, 118, 78)]
CINN_IN = [(150, 76, 36), (182, 100, 50), (206, 126, 66), (226, 152, 90), (240, 180, 122)]
CHERRY_UNRIPE = UNRIPE
VINE = [(40, 84, 36), (58, 110, 46), (80, 138, 56), (104, 164, 70), (140, 192, 96)]


# --------------------------------------------------------------------------------------------- herbs
def rosemary(c, s):
    if s == 0:
        return sprout(c, SAGE, 3.5, h=3, width=1.6, shape='lance')
    stems = {1: [(90, 6), (70, 5), (112, 5)],
             2: [(90, 10), (72, 9), (108, 9), (58, 7), (122, 7)],
             3: [(90, 13), (74, 12), (106, 12), (60, 10), (120, 10), (48, 7), (132, 7)]}[s]
    for a, l in stems:
        ex, ey = leaf(c, *B, a, l, 1, BROWN, shape='tube', mat='stem')
        # needles along the stem
        r = math.radians(a)
        for i in range(2, int(l), 1):
            x = B[0] + math.cos(r) * i
            y = B[1] - math.sin(r) * i
            for side in (-1, 1):
                leaf(c, x, y, a + side * 55, 1.6, 0.8, SAGE, shape='strap', lvl=2 + (i % 2))
        if s == 3 and l > 9:
            for k in (0, 2):
                c.put(ex + (k - 1), ey + k, LILAC, 3, 'flower', c.new(), True)


def thyme(c, s):
    if s == 0:
        return sprout(c, G, 2.2, h=2, width=1.8)
    rng = random.Random(7 + s)
    top = {1: 10, 2: 7, 3: 5}[s]
    stems = {1: 4, 2: 6, 3: 8}[s]
    for i in range(stems):
        x = 2 + (12 * (i + 0.5) / stems)
        line(c, B[0], 15, x, top + abs(x - 8) * 0.6 + 1, BROWN, 2, 'stem')
    for i in range({1: 14, 2: 26, 3: 34}[s]):
        x = rng.uniform(2, 14)
        y = rng.uniform(top + abs(x - 8) * 0.6, 14)
        leaf(c, x, y, rng.choice((30, 60, 120, 150)), 1.6, 1.4, G if i % 3 == 0 else GL, shape='oval', spine=False)
    if s == 3:
        for i in range(10):
            x = rng.randrange(3, 13)
            y = int(top + abs(x - 8) * 0.6) + rng.randrange(-1, 2)
            c.put(x, y, PINK, 3, 'flower', c.new(), True)


def lavender(c, s):
    base = {0: 3.5, 1: 6, 2: 7, 3: 7}[s]
    for a in (50, 65, 80, 100, 115, 130)[: 3 + s]:
        leaf(c, *B, a, base + (1.5 if 75 < a < 105 else 0), 1.6, SAGE, shape='strap', droop=0.8)
    if s >= 2:
        for x, top in ((4, 2), (7, 0), (10, 1), (12, 4), (2, 5)):
            line(c, x + (B[0] - x) * 0.3, 14, x, top + 5, GD, 2, 'stem')
            ramp = VIOLET if s == 3 else LILAC
            for y in range(top, top + (5 if s == 3 else 3)):
                c.put(x, y, ramp, 2 + (y % 2), 'flower', c.new(), True)
                if s == 3 and y % 2 == 0:
                    c.put(x + 1, y, ramp, 1, 'flower', c.new(), True)


def mint(c, s):
    if s == 0:
        return sprout(c, GL, 2.6, h=2)
    stems = {1: [(7, 9)], 2: [(7, 5), (4, 9), (11, 8)], 3: [(7, 2), (3, 6), (12, 5), (5, 9), (10, 10)]}[s]
    for x, top in stems:
        line(c, B[0], 15, x, top, G, 2, 'stem')
        for y in range(14, top - 1, -3):
            t = (14 - y) / max(1, 14 - top)
            xx = B[0] + (x - B[0]) * t
            leaf(c, xx, y, 25, 2.8, 2.4, GL, shape='oval', rib=(GL, 3))
            leaf(c, xx, y, 155, 2.8, 2.4, GL, shape='oval', rib=(GL, 3))
        if s == 3:
            for y in range(top - 2, top + 1):
                c.put(x, y, LILAC if y % 2 else FLW, 3, 'flower', c.new(), True)


def stevia(c, s):
    if s == 0:
        return sprout(c, GL, 2.5, h=2, shape='lance')
    top = {1: 9, 2: 4, 3: 1}[s]
    line(c, 7, 15, 7, top, G, 2, 'stem')
    for i, y in enumerate(range(13, top, -2)):
        l = 3.5 if y > top + 2 else 2.4
        leaf(c, 7.5, y + .5, 25 + (i % 2) * 10, l, 1.8, GL, shape='lance', droop=0.3)
        leaf(c, 7.5, y + .5, 155 - (i % 2) * 10, l, 1.8, GL, shape='lance', droop=0.3)
    if s == 3:
        for x, y in ((6, 0), (8, 0), (5, 2), (9, 1), (7, 1)):
            c.put(x, y, FLW, 4, 'flower', c.new(), True)


def cassava(c, s):
    if s == 0:
        return sprout(c, G, 2.6, h=2)
    top = {1: 9, 2: 5, 3: 2}[s]
    o = c.new()
    for y in range(top, 16):
        c.put(7, y, TAN if y % 3 else BROWN, 2, 'stem', o)  # knobbly cane
    heads = {1: [(7, top)], 2: [(7, top), (7, top + 5)], 3: [(7, top), (7, top + 4), (7, top + 8)]}[s]
    for hx, hy in heads:
        for a in (20, 55, 90, 125, 160):
            line(c, hx, hy, hx + math.cos(math.radians(a)) * 1.5, hy - math.sin(math.radians(a)) * 1.5, RED, 2, 'stem')
            leaf(c, hx + .5, hy + .5, a, 4 if s == 3 else 3.2, 1.3, G, shape='lance', droop=0.4)


# --------------------------------------------------------------------------------------------- shrubs
def vanilla_vine(c, s):
    pts = {0: [(7, 15), (8, 12)], 1: [(7, 15), (8, 11), (6, 7)], 2: [(7, 15), (9, 11), (6, 6), (8, 2)],
           3: [(7, 15), (9, 11), (6, 6), (8, 1)]}[s]
    path(c, pts, VINE, 2)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        leaf(c, mx + .5, my + .5, 20, 4, 2.2, GD, shape='oblong', rib=(GD, 3))
        leaf(c, mx + .5, my + 2.5, 160, 4, 2.2, GD, shape='oblong', rib=(GD, 3))
    if s == 2:
        k = {'y': (YFLW, 3, 'flower', True), 'w': (FLW, 3, 'flower', True), 'g': (UNRIPE, 3, 'flower', True)}
        for x, y in ((10, 4), (3, 8)):
            stamp(c, x, y, ['ww.', 'wyg', '.gg'], k)
    if s == 3:
        k = {'x': (PODS, 2, 'fruit', False), 'h': (UNRIPE, 3, 'fruit', True)}
        for x, y in ((10, 4), (11, 4), (3, 8), (4, 9)):
            stamp(c, x, y, ['h', 'x', 'x', 'x', 'x', 'x'], k)


def coffee_bush(c, s):
    if s == 0:
        line(c, 7, 15, 7, 12, BROWN)
        leaf(c, 7.5, 12.5, 150, 3, 2.2, GD, shape='oval', rib=(GD, 3))
        leaf(c, 7.5, 12.5, 30, 3, 2.2, GD, shape='oval', rib=(GD, 3))
        return
    br = {1: [[(7, 15), (7, 8)], [(7, 12), (3, 10)], [(7, 11), (11, 9)]],
          2: [[(7, 15), (7, 3)], [(7, 13), (2, 10)], [(7, 11), (12, 8)], [(7, 8), (3, 5)], [(7, 6), (11, 3)]],
          3: [[(7, 15), (7, 1)], [(7, 13), (1, 10)], [(7, 11), (13, 8)], [(7, 8), (2, 5)], [(7, 6), (12, 3)]]}[s]
    for b in br:
        path(c, b, BROWN, 2)
    for b in br[1:]:
        (x0, y0), (x1, y1) = b
        for t in (0.5, 1.0):
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            leaf(c, x + .5, y, 70, 2.8, 2.2, GD, shape='oval', rib=(GD, 3))
            leaf(c, x + .5, y + 1, 250, 2.6, 2.2, GD, shape='oval', rib=(GD, 3))
    leaf(c, 7.5, br[0][1][1] + .5, 90, 2.5, 2, GD, shape='oval')
    if s == 2:
        for b in br[1:]:
            x, y = b[0][0] + (b[1][0] - b[0][0]) * 0.75, b[0][1] + (b[1][1] - b[0][1]) * 0.75
            stamp(c, int(x), int(y) + 1, ['w.w', '.w.'], {'w': (FLW, 4, 'flower', True)})
    if s == 3:
        k = fruit_key(RED, GD)
        ku = fruit_key(CHERRY_UNRIPE, GD)
        for i, b in enumerate(br[1:]):
            x, y = b[0][0] + (b[1][0] - b[0][0]) * 0.7, b[0][1] + (b[1][1] - b[0][1]) * 0.7
            stamp(c, int(x), int(y) + 1, ['hx', 'xd'], ku if i == 2 else k)


def raspberry(c, s):
    if s == 0:
        return sprout(c, G, 2.6, h=2)
    canes = {1: [[(7, 15), (6, 8), (4, 7)]],
             2: [[(7, 15), (6, 6), (3, 4)], [(8, 15), (10, 7), (13, 7)]],
             3: [[(7, 15), (6, 5), (2, 3)], [(8, 15), (10, 6), (14, 6)], [(7, 15), (8, 9), (11, 11)]]}[s]
    for cn in canes:
        path(c, cn, CANE, 2)
        for (x0, y0), (x1, y1) in zip(cn, cn[1:]):
            for t in (0.4, 0.9):
                x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
                P.trifol(c, x + .5, y, 70, 2.6, G)
    if s == 2:
        for cn in canes:
            x, y = cn[-1]
            stamp(c, x - 1, y, ['.w.', 'wyw'], {'w': (FLW, 3, 'flower', True), 'y': (YFLW, 3, 'flower', True)})
    if s == 3:
        k = fruit_key(RASP, G)
        for cn in canes:
            x, y = cn[-1]
            stamp(c, x - 1, y, ['.cc', 'hxl', 'xdx', '.d.'], k)
        stamp(c, 5, 10, ['.cc', 'hxl', 'xdx', '.d.'], k)


# --------------------------------------------------------------------------------------------- trees
def sapling_stage(c, tree, s):
    if s == 0:
        line(c, 7, 15, 7, 12, BRONZE if tree == 'cinnamon' else BROWN, 2, 'stem')
        ramp = G if tree == 'cinnamon' else GL
        leaf(c, 7.5, 12.5, 150, 2.6, 2, ramp, shape='oval')
        leaf(c, 7.5, 12.5, 30, 2.6, 2, ramp, shape='oval')
        leaf(c, 7.5, 12, 90, 2, 1.6, BRONZE if tree == 'cinnamon' else ramp, shape='oval')
        return
    if s == 1:
        sub = Canvas()
        P.sapling(sub, tree)
        for (x, y), v in sub.p.items():  # the young sapling: lower 3/4 of the grown one, shifted down
            if y >= 4:
                c.p[(x, min(15, y + 3))] = v
        c.obj = sub.obj
        return
    P.sapling(c, tree)


def log_side(c):
    for y in range(16):
        for x in range(16):
            groove = x in (1, 5, 6, 10, 13) and P.ihash(x, y // 3, 9) % 4 != 0
            c.put(x, y, CINN_BARK, 1 if groove else 2 + (P.ihash(x, y, 4) % 3 == 0), 'bark', 0, True)
    for x, y in ((3, 3), (11, 9), (7, 13)):
        c.put(x, y, CINN_BARK, 4, 'bark', 1, True)


def log_stripped(c):
    for y in range(16):
        for x in range(16):
            lvl = 2 + (1 if (x + P.ihash(x // 2, y // 4, 3)) % 5 == 0 else 0) - (1 if x % 7 == 3 else 0)
            c.put(x, y, CINN_IN, lvl, 'wood', 0, True)


def log_top(c):
    for y in range(16):
        for x in range(16):
            if min(x, y, 15 - x, 15 - y) == 0:
                c.put(x, y, CINN_BARK, 1 + P.ihash(x, y, 5) % 2, 'bark', 0, True)
                continue
            d = math.hypot(x - 7.5, y - 7.5)
            lvl = 1 if int(d) % 3 == 0 else 3 - (int(d) % 3 == 2)
            c.put(x, y, CINN_IN, 0 if d < 1.2 else lvl, 'wood', 1, True)


# --------------------------------------------------------------------------------------------- output
BUSHES = {"rosemary_bush": rosemary, "thyme_bush": thyme, "lavender_bush": lavender, "mint_bush": mint,
          "vanilla_vine": vanilla_vine, "coffee_bush": coffee_bush, "strawberry_bush": P.strawberry,
          "blueberry_bush": P.blueberry, "raspberry_bush": raspberry}
CROPS8 = {"sesame_crop": P.sesame, "stevia_crop": stevia, "cassava_crop": cassava}


def render(fn, tile=False, seed=0):
    c = Canvas(tile=tile, seed=seed)
    fn(c)
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for (x, y), (rgb, _) in c.shaded().items():
        img.putpixel((x, y), rgb + (255,))
    return img


def build(out_dir):
    """Paints every plant texture into out_dir; returns [(name, image)] in sheet order."""
    made = []

    def put(name, img):
        img.save(os.path.join(out_dir, f"kb_{name}.png"))
        made.append((name, img))

    for bid, fn in BUSHES.items():
        for s in range(4):
            put(f"{bid}_stage_{s}", render(lambda c, s=s, fn=fn: fn(c, s), seed=zlib.crc32(bid.encode())))
    for bid, fn in CROPS8.items():
        vis = [render(lambda c, s=s, fn=fn: fn(c, s), seed=zlib.crc32(bid.encode())) for s in range(4)]
        for state in range(8):
            put(f"{bid}_stage_{state}", vis[state // 2])
    for tree in ("cinnamon", "lemon"):
        for s in range(3):
            put(f"{tree}_sapling_block_stage_{s}", render(lambda c, s=s, t=tree: sapling_stage(c, t, s)))
    put("cinnamon_leaves_0", render(lambda c: P.leaves_block(c, "cinnamon", "unripe"), tile=True, seed=3))
    for s, stage in enumerate(("bare", "blossom", "unripe", "ripe")):
        put(f"lemon_leaves_{s}", render(lambda c, st=stage: P.leaves_block(c, "lemon", st), tile=True, seed=5))
    put("cinnamon_log_side", render(log_side, tile=True))
    put("cinnamon_log_stripped", render(log_stripped, tile=True))
    put("cinnamon_log_top", render(log_top, tile=True))
    return made
