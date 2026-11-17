"""Gameplay data shared by build.py (block states / textures) and the script (exported to data.js)."""

NS = "kb"

ITEM_NAMES = {
    # ingredients
    "flour": ("Flour", "麵粉"),
    "butter": ("Butter", "奶油"),
    "dough": ("Dough", "麵團"),
    "sweet_dough": ("Sweet Dough", "甜麵團"),
    "whipped_cream": ("Whipped Cream", "打發鮮奶油"),
    "chocolate_bar": ("Chocolate Bar", "巧克力磚"),
    # unbaked (go into the oven)
    "raw_croissant": ("Unbaked Croissant", "生可頌"),
    "raw_cookies": ("Cookie Dough Balls", "生餅乾麵團"),
    "raw_egg_tart": ("Unbaked Egg Tart", "生蛋塔"),
    "raw_macaron": ("Macaron Shells", "生馬卡龍"),
    "raw_pudding": ("Custard Ramekin", "生布丁液"),
    "raw_cream_puff": ("Choux Dough", "生泡芙麵糊"),
    "raw_cinnamon_roll": ("Unbaked Cinnamon Roll", "生肉桂捲"),
    "raw_berry_cake": ("Berry Cake Batter", "莓果蛋糕麵糊"),
    "raw_chocolate_cake": ("Chocolate Cake Batter", "巧克力蛋糕麵糊"),
    # baked
    "toast": ("Toast", "吐司"),
    "butter_cookie": ("Butter Cookie", "奶油餅乾"),
    "croissant": ("Croissant", "可頌"),
    "egg_tart": ("Egg Tart", "蛋塔"),
    "macaron": ("Macaron", "馬卡龍"),
    "pudding": ("Caramel Pudding", "焦糖布丁"),
    "cream_puff": ("Cream Puff", "泡芙"),
    "cinnamon_roll": ("Cinnamon Roll", "肉桂捲"),
    "berry_cake_slice": ("Berry Shortcake Slice", "莓果蛋糕切片"),
    "chocolate_cake_slice": ("Chocolate Cake Slice", "巧克力蛋糕切片"),
}

BLOCK_NAMES = {
    "oven": ("Oven", "烤箱"),
    "mixing_bowl": ("Mixing Bowl", "攪拌碗"),
    "baking_tray": ("Baking Tray", "烤盤"),
}

# Food stats: nutrition, saturation, container returned after eating
FOOD = {
    "toast": (5, 0.6, None),
    "butter_cookie": (2, 0.3, None),
    "croissant": (6, 0.7, None),
    "egg_tart": (5, 0.6, None),
    "macaron": (3, 0.4, None),
    "pudding": (6, 0.6, "minecraft:bowl"),
    "cream_puff": (5, 0.5, None),
    "cinnamon_roll": (7, 0.6, None),
    "berry_cake_slice": (6, 0.5, None),
    "chocolate_cake_slice": (7, 0.6, None),
}

M, K = "minecraft:", f"{NS}:"

# Mixing bowl: put ingredients in one by one, stir with an empty hand until smooth, scoop out.
# (result, count, ingredients)  -- order of ingredients does not matter
BOWL_RECIPES = [
    ("dough", 2, [K + "flour", K + "flour", M + "egg"]),
    ("sweet_dough", 2, [K + "flour", K + "flour", M + "sugar", M + "egg", K + "butter"]),
    ("whipped_cream", 3, [M + "milk_bucket", M + "sugar"]),
    ("chocolate_bar", 2, [M + "cocoa_beans", M + "cocoa_beans", M + "sugar", K + "butter"]),
    ("raw_croissant", 1, [K + "dough", K + "butter"]),
    ("raw_cookies", 1, [K + "sweet_dough", K + "chocolate_bar"]),
    ("raw_egg_tart", 1, [K + "sweet_dough", M + "egg", M + "sugar"]),
    ("raw_macaron", 1, [K + "sweet_dough", M + "egg", M + "sweet_berries"]),
    ("raw_pudding", 1, [M + "egg", M + "milk_bucket", M + "sugar", M + "bowl"]),
    ("raw_cream_puff", 1, [K + "dough", K + "whipped_cream", M + "egg"]),
    ("raw_cinnamon_roll", 1, [K + "sweet_dough", M + "sugar", K + "butter"]),
    ("raw_berry_cake", 1, [K + "sweet_dough", K + "whipped_cream", M + "sweet_berries", M + "sweet_berries"]),
    ("raw_chocolate_cake", 1, [K + "sweet_dough", K + "whipped_cream", K + "chocolate_bar"]),
]
STIRS_NEEDED = 4

# Oven: index in this list + 1 = value of block state kb:food
# (what goes in, what comes out when done, how many)
OVEN_FOODS = [
    ("dough", "toast", 2),
    ("raw_croissant", "croissant", 2),
    ("raw_cookies", "butter_cookie", 6),
    ("raw_egg_tart", "egg_tart", 3),
    ("raw_macaron", "macaron", 4),
    ("raw_pudding", "pudding", 1),
    ("raw_cream_puff", "cream_puff", 3),
    ("raw_cinnamon_roll", "cinnamon_roll", 3),
    ("raw_berry_cake", "berry_cake_slice", 4),
    ("raw_chocolate_cake", "chocolate_cake_slice", 4),
]
BURNT_RESULT = M + "charcoal"

# Oven timing. The block ticks every TICK_SECONDS; each tick with fire burns 1 fuel and
# advances kb:time by 1. kb:time -> visible stage: 0 raw, 1 half-baked, 2 done, 3 burnt.
TICK_SECONDS = 10
STAGE_OF_TIME = [0, 0, 1, 1, 2, 2, 2, 3]
MAX_TIME = len(STAGE_OF_TIME) - 1
MAX_FUEL = 8
FUELS = {M + "coal": 8, M + "charcoal": 8, M + "blaze_rod": 8, M + "stick": 1}
FUEL_SUFFIXES = {"_log": 4, "_wood": 4, "_stem": 4, "_planks": 2}

# Simple crafting-table recipes (vanilla UI is fine here; it's the normal crafting table)
CRAFTING = [
    ("flour", 1, [M + "wheat"], None, None),
    ("butter", 2, [M + "milk_bucket"], None, None),
    ("mixing_bowl", 1, None, ["C C", " C "], {"C": M + "clay_ball"}),
    ("baking_tray", 1, None, ["N N", "NNN"], {"N": M + "iron_nugget"}),
    ("oven", 1, None, ["BBB", "BGB", "III"], {"B": M + "brick", "G": M + "glass_pane", "I": M + "iron_ingot"}),
]
