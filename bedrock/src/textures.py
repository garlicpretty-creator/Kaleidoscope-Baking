"""Procedural pixel textures shared by make_bbmodel.py and build.py."""
from PIL import Image


def hexrgb(h, a=255):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (a,)


def noise(x, y, seed=0):
    n = (x * 374761393 + y * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return (n ^ (n >> 16)) / 0xFFFFFFFF


def shade(rgb, f):
    return tuple(max(0, min(255, int(c * f))) for c in rgb[:3]) + (255,)


# ------------------------------------------------------------ atlas materials
def mat_color(mat, x, y, w, h, seed):
    r = noise(x, y, seed)
    if mat == "brick":
        row = y // 3
        off = 2 if row % 2 else 0
        if y % 3 == 2 or (x + off) % 6 == 5:
            return hexrgb("#d8c2a2")
        return shade(hexrgb("#b4553d"), 0.88 + 0.2 * r)
    if mat == "oven_inner":
        return shade(hexrgb("#3a2a26"), 0.85 + 0.3 * r)
    if mat == "oven_top":
        return shade(hexrgb("#5b616a"), 0.9 + 0.2 * r)
    if mat == "grate":  # iron bars with gaps so the fire shows through
        return shade(hexrgb("#4a4f57"), 0.9 + 0.2 * r) if x % 3 == 0 or y == 0 else (0, 0, 0, 0)
    if mat == "iron":
        return shade(hexrgb("#c3cbd3"), 0.9 + 0.15 * r)
    if mat == "iron_dark":
        return shade(hexrgb("#6b7580"), 0.9 + 0.15 * r)
    if mat == "ceramic":
        return shade(hexrgb("#86bce0"), 0.95 + 0.1 * r)
    if mat == "ceramic_inner":
        return shade(hexrgb("#e9f2f8"), 0.95 + 0.08 * r)
    if mat == "ceramic_rim":
        return hexrgb("#f4f8fb")
    if mat == "ceramic_dark":
        return shade(hexrgb("#4f7fa8"), 0.95 + 0.1 * r)
    if mat == "wood":
        return shade(hexrgb("#c08a55"), 0.85 + 0.2 * r)
    if mat == "cookie":
        return hexrgb("#5a3326") if r > 0.85 else shade(hexrgb("#e3a55a"), 0.9 + 0.15 * r)
    raise ValueError(f"unknown material {mat}")


# ------------------------------------------------------------ material-instance textures (16x16)
def glass():
    img = Image.new("RGBA", (16, 16))
    for y in range(16):
        for x in range(16):
            streak = (x + y) in (5, 6, 18) or (x + y) == 20 and x > 8
            if x in (0, 15) or y in (0, 15):
                img.putpixel((x, y), (200, 220, 230, 70))  # faint edge
            else:
                img.putpixel((x, y), (240, 250, 255, 85) if streak else (200, 230, 250, 22))
    return img


def fire(lit):
    img = Image.new("RGBA", (16, 16))
    for y in range(16):
        for x in range(16):
            r = noise(x, y, 7 if lit else 3)
            if lit:
                # flames: hotter (yellow) near the bottom, flickering tips at the top
                height = 6 + int(8 * noise(x, 0, 11))
                if 16 - y <= height:
                    t = (16 - y) / height
                    col = "#fff2a8" if t < 0.35 else "#ffb43c" if t < 0.7 else "#e8562a"
                    img.putpixel((x, y), shade(hexrgb(col), 0.9 + 0.2 * r))
                else:
                    img.putpixel((x, y), shade(hexrgb("#2a1a14"), 0.8 + 0.4 * r))
            else:
                col = "#55504c" if r > 0.7 else "#2a2522" if r > 0.3 else "#1a1614"
                img.putpixel((x, y), hexrgb(col))
    return img


def batter(rgb=None):
    """rgb=None -> lumpy unmixed ingredients; otherwise smooth batter of that colour."""
    img = Image.new("RGBA", (16, 16))
    lumps = ["#ffffff", "#f7d154", "#fbe38c", "#efe6d2", "#d9c7a0"]
    for y in range(16):
        for x in range(16):
            r = noise(x // 2, y // 2, 5)
            if rgb is None:
                img.putpixel((x, y), shade(hexrgb(lumps[int(r * len(lumps)) % len(lumps)]), 0.9 + 0.1 * noise(x, y)))
            else:
                swirl = 1.06 if (x * 3 + y * 2) % 9 == 0 else 1.0
                img.putpixel((x, y), shade(rgb, (0.94 + 0.08 * noise(x, y, 9)) * swirl))
    return img


def average_color(img):
    px = [p for p in img.getdata() if p[3] > 0]
    n = max(1, len(px))
    return tuple(sum(p[i] for p in px) // n for i in range(3)) + (255,)


def blank():
    return Image.new("RGBA", (16, 16), (0, 0, 0, 0))


def food_stage(raw, done, stage):
    """stage: 0 raw, 1 half-baked, 2 done, 3 burnt."""
    if stage == 0:  # pale, doughy
        out = Image.new("RGBA", (16, 16))
        dough = (246, 232, 204)
        for y in range(16):
            for x in range(16):
                p = raw.getpixel((x, y))
                if p[3]:
                    out.putpixel((x, y), tuple(int(p[i] * 0.55 + dough[i] * 0.45) for i in range(3)) + (255,))
        return out
    if stage == 2:
        return done.copy()
    out = Image.new("RGBA", (16, 16))
    for y in range(16):
        for x in range(16):
            a, b = raw.getpixel((x, y)), done.getpixel((x, y))
            if stage == 1:  # baked shape, colour halfway between pale dough and golden
                if b[3]:
                    out.putpixel((x, y), tuple(int(b[i] * 0.7 + (246, 232, 204)[i] * 0.3) for i in range(3)) + (255,))
            else:  # burnt
                if b[3]:
                    k = 0.28 + 0.12 * noise(x, y, 13)
                    out.putpixel((x, y), (int(b[0] * k) + 20, int(b[1] * k) + 12, int(b[2] * k) + 8, 255))
    return out
