"""3D block models (Bedrock geometry) for the kitchenware blocks.

Coordinates use Bedrock block space: x/z from -8..8, y from 0..16 (1 unit = 1 pixel).
Each cube lists its origin, size and a material per face (or one material for all faces).
build.py packs every face into a texture atlas automatically and paints it, so the
resulting .geo.json + .png open directly in Blockbench (Bedrock Block project) for
further hand-editing.
"""

ALL = ("north", "south", "east", "west", "up", "down")


def cube(origin, size, mat, **faces):
    """mat = default material; faces = per-face override, e.g. north='oven_front'."""
    return {"origin": origin, "size": size, "faces": {f: faces.get(f, mat) for f in ALL}}


BLOCKS = {
    "oven": {
        "display": ("Oven", "烤箱"),
        "full_block": True,
        "rotatable": True,
        "station": True,
        "cubes": [
            cube([-8, 2, -7], [16, 13, 15], "brick", north="oven_front", up="oven_top"),
            cube([-7, 0, -6], [2, 2, 2], "iron_dark"),
            cube([5, 0, -6], [2, 2, 2], "iron_dark"),
            cube([-7, 0, 5], [2, 2, 2], "iron_dark"),
            cube([5, 0, 5], [2, 2, 2], "iron_dark"),
            cube([-5, 11, -8], [10, 1, 1], "iron"),  # door handle
            cube([3, 15, 2], [3, 1, 3], "iron_dark"),  # chimney
        ],
        "collision": ([-8, 0, -8], [16, 16, 16]),
    },
    "mixing_bowl": {
        "display": ("Mixing Bowl", "攪拌碗"),
        "full_block": False,
        "rotatable": False,
        "station": True,
        "cubes": [
            cube([-3, 0, -3], [6, 1, 6], "ceramic_dark"),
            cube([-4, 1, -4], [8, 1, 8], "ceramic"),
            cube([-5, 1, -5], [10, 5, 1], "ceramic", up="ceramic_rim"),
            cube([-5, 1, 4], [10, 5, 1], "ceramic", up="ceramic_rim"),
            cube([-5, 1, -4], [1, 5, 8], "ceramic", up="ceramic_rim"),
            cube([4, 1, -4], [1, 5, 8], "ceramic", up="ceramic_rim"),
            cube([-4, 2, -4], [8, 2, 8], "batter"),
            cube([-1, 3, -2], [1, 6, 1], "wood"),  # spoon handle
        ],
        "collision": ([-5, 0, -5], [10, 6, 10]),
    },
    "baking_tray": {
        "display": ("Baking Tray", "烤盤"),
        "full_block": False,
        "rotatable": True,
        "station": False,
        "cubes": [
            cube([-7, 0, -6], [14, 1, 12], "iron"),
            cube([-7, 1, -6], [14, 1, 1], "iron_dark"),
            cube([-7, 1, 5], [14, 1, 1], "iron_dark"),
            cube([-7, 1, -5], [1, 1, 10], "iron_dark"),
            cube([6, 1, -5], [1, 1, 10], "iron_dark"),
            cube([-5, 1, -4], [3, 1, 3], "cookie"),
            cube([1, 1, -4], [3, 1, 3], "cookie"),
            cube([-5, 1, 1], [3, 1, 3], "cookie"),
            cube([1, 1, 1], [3, 1, 3], "cookie"),
        ],
        "collision": ([-7, 0, -6], [14, 2, 12]),
    },
}
