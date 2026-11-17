"""Starter geometry for the kitchenware blocks (used once by tools/make_bbmodel.py).

After the .bbmodel files exist in bedrock/models/, Blockbench is the source of truth:
edit the models there. This file only seeds new/reset models.

Coordinates use Bedrock block space: x/z from -8..8, y from 0..16 (1 unit = 1 pixel).
`mat` names an atlas material painted into the block's main texture.
`tex` puts the whole cube on a separate named texture instead; in game that texture
becomes a *material instance* the scripts swap per block state:
    glass  - see-through oven door (blend)
    food   - the dessert visible inside the oven (raw -> half -> done -> burnt)
    fire   - the firebox (lit / out)
    batter - contents of the mixing bowl (lumpy / mixed)
`bone` groups cubes into a Blockbench group (= geometry bone) so they can be shown/hidden.
"""

ALL = ("north", "south", "east", "west", "up", "down")


def cube(name, origin, size, mat=None, tex=None, bone="body", **faces):
    return {
        "name": name, "origin": origin, "size": size, "bone": bone, "tex": tex,
        "faces": {f: faces.get(f, mat) for f in ALL},
    }


BLOCKS = {
    "oven": {
        "cubes": [
            cube("leg_fl", [-7, 0, -6], [2, 2, 2], "iron_dark", bone="legs"),
            cube("leg_fr", [5, 0, -6], [2, 2, 2], "iron_dark", bone="legs"),
            cube("leg_bl", [-7, 0, 5], [2, 2, 2], "iron_dark", bone="legs"),
            cube("leg_br", [5, 0, 5], [2, 2, 2], "iron_dark", bone="legs"),
            cube("base", [-8, 2, -7], [16, 1, 15], "brick"),
            # firebox (y 3..5)
            cube("firebox_left", [-8, 3, -7], [2, 2, 15], "brick", east="oven_inner"),
            cube("firebox_right", [6, 3, -7], [2, 2, 15], "brick", west="oven_inner"),
            cube("firebox_back", [-6, 3, 5], [12, 2, 2], "brick", north="oven_inner"),
            cube("fire", [-6, 3, -3], [12, 2, 0], tex="fire", bone="fire"),
            cube("firebox_grate", [-6, 3, -7], [12, 2, 0], "grate"),
            cube("shelf", [-8, 5, -7], [16, 1, 15], "brick", up="oven_inner"),
            # baking chamber (y 6..14)
            cube("wall_left", [-8, 6, -7], [2, 8, 15], "brick", east="oven_inner"),
            cube("wall_right", [6, 6, -7], [2, 8, 15], "brick", west="oven_inner"),
            cube("wall_back", [-6, 6, 5], [12, 8, 2], "brick", north="oven_inner"),
            cube("top", [-8, 14, -7], [16, 1, 15], "oven_top", down="oven_inner"),
            cube("rack", [-5, 6, -5], [10, 1, 9], "iron_dark", bone="inside"),
            cube("food", [-3.5, 7, -2], [7, 7, 0], tex="food", bone="inside"),
            cube("glass", [-6, 6, -7], [12, 8, 0], tex="glass", bone="door"),
            cube("handle", [-4, 12, -8], [8, 1, 1], "iron", bone="door"),
            cube("chimney", [3, 15, 2], [3, 1, 3], "iron_dark"),
        ],
    },
    "mixing_bowl": {
        "cubes": [
            cube("foot", [-3, 0, -3], [6, 1, 6], "ceramic_dark"),
            cube("bottom", [-4, 1, -4], [8, 1, 8], "ceramic"),
            cube("wall_n", [-5, 1, -5], [10, 5, 1], "ceramic", up="ceramic_rim", south="ceramic_inner"),
            cube("wall_s", [-5, 1, 4], [10, 5, 1], "ceramic", up="ceramic_rim", north="ceramic_inner"),
            cube("wall_w", [-5, 1, -4], [1, 5, 8], "ceramic", up="ceramic_rim", east="ceramic_inner"),
            cube("wall_e", [4, 1, -4], [1, 5, 8], "ceramic", up="ceramic_rim", west="ceramic_inner"),
            cube("batter1", [-4, 2, -4], [8, 1, 8], tex="batter", bone="fill1"),
            cube("batter2", [-4, 3, -4], [8, 1, 8], tex="batter", bone="fill2"),
            cube("batter3", [-4, 4, -4], [8, 1, 8], tex="batter", bone="fill3"),
            cube("batter4", [-4, 5, -4], [8, 1, 8], tex="batter", bone="fill4"),
            cube("spoon_handle", [1, 3, 1], [1, 7, 1], "wood", bone="spoon"),
            cube("spoon_head", [0, 2, 0], [3, 1, 3], "wood", bone="spoon"),
        ],
    },
    "baking_tray": {
        "cubes": [
            cube("plate", [-7, 0, -6], [14, 1, 12], "iron"),
            cube("rim_n", [-7, 1, -6], [14, 1, 1], "iron_dark"),
            cube("rim_s", [-7, 1, 5], [14, 1, 1], "iron_dark"),
            cube("rim_w", [-7, 1, -5], [1, 1, 10], "iron_dark"),
            cube("rim_e", [6, 1, -5], [1, 1, 10], "iron_dark"),
            cube("cookie1", [-5, 1, -4], [3, 1, 3], "cookie", bone="cookies"),
            cube("cookie2", [1, 1, -4], [3, 1, 3], "cookie", bone="cookies"),
            cube("cookie3", [-5, 1, 1], [3, 1, 3], "cookie", bone="cookies"),
            cube("cookie4", [1, 1, 1], [3, 1, 3], "cookie", bone="cookies"),
        ],
    },
}
