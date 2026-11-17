"""Kaleidoscope Baking content table — the single source of truth for items & simple blocks.

tools/gen_content.py turns this into:
  BP/items/*.json, BP/blocks/*.json (except the oven, see gen_oven_block.mjs), loot tables,
  features / feature_rules, crafting recipes, item catalog, RP texture tables, geometry,
  language files, placeholder art and BP/scripts/data/generated/content.js.

Names: (zh_TW, en_US). zh_CN is converted from zh_TW automatically (see gen_content.ZH_CN).
art:   (shape, primary color, secondary color) for the placeholder painter.
"""

NS = "kaleidoscope_baking"
G_STATIONS, G_TOOLS, G_ING, G_PLANTS, G_FOOD, G_DRINK = (
    f"{NS}:itemGroup.name.stations", f"{NS}:itemGroup.name.tools", f"{NS}:itemGroup.name.ingredients",
    f"{NS}:itemGroup.name.plants", f"{NS}:itemGroup.name.foods", f"{NS}:itemGroup.name.drinks")
GROUP_NAMES = {
    G_STATIONS: ("烘焙廚具", "Baking Stations"), G_TOOLS: ("烘焙工具", "Baking Tools"),
    G_ING: ("烘焙材料", "Baking Ingredients"), G_PLANTS: ("烘焙植物", "Baking Plants"),
    G_FOOD: ("烘焙美食", "Baked Goods"), G_DRINK: ("咖啡館飲品", "Café Drinks"),
}
GROUP_CATEGORY = {G_STATIONS: "equipment", G_TOOLS: "equipment", G_ING: "items", G_PLANTS: "nature", G_FOOD: "items", G_DRINK: "items"}

# Colors
C = dict(cream=(250, 236, 200), dough=(240, 214, 160), crust=(196, 128, 60), choc=(110, 70, 45), white=(250, 250, 245),
         butter=(250, 220, 90), red=(220, 40, 60), pink=(245, 160, 180), green=(90, 160, 70), dkgreen=(50, 110, 50),
         matcha=(150, 190, 90), purple=(150, 110, 200), blue=(70, 90, 190), yellow=(250, 230, 70), brown=(140, 90, 50),
         dkbrown=(80, 50, 30), tan=(210, 170, 110), iron=(184, 188, 194), grey=(120, 124, 132), black=(40, 36, 34),
         tea=(170, 90, 40), milk=(245, 240, 230), coffee=(90, 55, 35), latte=(190, 150, 110), orange=(240, 150, 40),
         caramel=(200, 130, 50), lemon=(250, 235, 90), bean_g=(150, 170, 90), cinnamon=(170, 95, 55), sesame=(240, 225, 190))

ITEMS = []      # dicts, see item()
CROPS = []      # plant blocks, see crop()
DESSERTS = []   # placeable whole desserts
STATIONS = []   # simple station blocks (not the oven)


def item(iid, zh, en, group, art, stack=64, tags=(), food=None, place=None, **extra):
    ITEMS.append(dict(id=iid, zh=zh, en=en, group=group, art=art, stack=stack, tags=list(tags), food=food, place=place, extra=extra))


def food(n, sat, dur=1.6, anim="eat", converts=None, always=False):
    return dict(n=n, sat=sat, dur=dur, anim=anim, converts=converts, always=always)


def drink(n, sat, cup, dur=1.6):
    return food(n, sat, dur, "drink", f"{NS}:{cup}", True)


# ---------------------------------------------------------------------------
# Stations (block items). geometry: list of cubes (origin, size) in block pixels.
# ---------------------------------------------------------------------------
def station(iid, zh, en, art, cubes, tex_color, stack=64, sound="wood"):
    STATIONS.append(dict(id=iid, cubes=cubes, tex=tex_color, sound=sound))
    item(iid, zh, en, G_STATIONS, art, stack, place=iid)


item("oven", "烤箱", "Oven", G_STATIONS, ("oven", C["crust"], C["grey"]), 16, place="oven")
station("mixing_bowl", "攪拌盆", "Mixing Bowl", ("bowl", C["iron"], C["grey"]),
        [([-5, 0, -5], [10, 1, 10]), ([-5, 1, -5], [10, 5, 1]), ([-5, 1, 4], [10, 5, 1]), ([-5, 1, -4], [1, 5, 8]), ([4, 1, -4], [1, 5, 8])], C["iron"], sound="metal")
station("proofing_basket", "發酵籃", "Proofing Basket", ("basket", C["tan"], C["brown"]),
        [([-6, 0, -6], [12, 1, 12]), ([-6, 1, -6], [12, 4, 1]), ([-6, 1, 5], [12, 4, 1]), ([-6, 1, -5], [1, 4, 10]), ([5, 1, -5], [1, 4, 10])], C["tan"])
station("decorating_stand", "裱花台", "Decorating Stand", ("stand", C["white"], C["pink"]),
        [([-5, 0, -5], [10, 1, 10]), ([-1, 1, -1], [2, 5, 2]), ([-7, 6, -7], [14, 1, 14])], C["white"], sound="stone")
station("espresso_machine", "咖啡機", "Espresso Machine", ("machine", C["iron"], C["black"]),
        [([-6, 0, -5], [12, 2, 10]), ([-6, 2, 1], [12, 12, 4]), ([-6, 10, -5], [12, 4, 6]), ([-1, 7, -4], [2, 3, 2])], C["iron"], sound="metal")
station("pour_over_stand", "手沖架", "Pour-Over Stand", ("dripper", C["white"], C["brown"]),
        [([-5, 0, -5], [10, 1, 10]), ([-1, 1, 3], [2, 10, 2]), ([-4, 8, -4], [8, 4, 8])], C["white"], sound="stone")
station("drink_shaker", "雪克杯", "Drink Shaker", ("shaker", C["iron"], C["white"]),
        [([-3, 0, -3], [6, 10, 6]), ([-2, 10, -2], [4, 3, 4])], C["iron"], sound="metal")

# ---------------------------------------------------------------------------
# Tools & containers
# ---------------------------------------------------------------------------
item("whisk", "打蛋器", "Whisk", G_TOOLS, ("whisk", C["iron"], C["crust"]), 1, [f"{NS}:whisk"], hand=True)
item("milk_frother", "奶泡器", "Milk Frother", G_TOOLS, ("frother", C["iron"], C["black"]), 1, [f"{NS}:frother"], hand=True)
item("rolling_pin", "擀麵棍", "Rolling Pin", G_TOOLS, ("pin", C["tan"], C["brown"]), 1, hand=True)
item("bread_knife", "麵包刀", "Bread Knife", G_TOOLS, ("knife", C["iron"], C["brown"]), 1,
     ["kaleidoscope_cookery:kitchen_knife"], hand=True, durability=250)
for mid, zh, en, shape in [("cake_mold", "蛋糕模", "Cake Mold", "mold_round"), ("loaf_pan", "吐司模", "Loaf Pan", "mold_loaf"),
                           ("baking_tray", "烤盤", "Baking Tray", "tray"), ("pie_tin", "派盤", "Pie Tin", "mold_pie"),
                           ("muffin_tin", "瑪芬烤盤", "Muffin Tin", "mold_muffin"), ("taiyaki_mold", "鯛魚燒模", "Taiyaki Mold", "mold_fish")]:
    item(mid, zh, en, G_TOOLS, (shape, C["iron"], C["grey"]), 16, [f"{NS}:mold"])
item("coffee_mug", "馬克杯", "Coffee Mug", G_TOOLS, ("mug", C["white"], None), 64, [f"{NS}:cup"])
item("takeaway_cup", "外帶杯", "Takeaway Cup", G_TOOLS, ("takeaway", C["white"], None), 64, [f"{NS}:cup"])
item("birthday_candle", "生日蠟燭", "Birthday Candle", G_TOOLS, ("candle", C["pink"], C["yellow"]), 64)

# ---------------------------------------------------------------------------
# Ingredients
# ---------------------------------------------------------------------------
def ing(iid, zh, en, art, tags=(), stack=64, **kw):
    item(iid, zh, en, G_ING, art, stack, tags, **kw)


ing("butter", "奶油", "Butter", ("butter", C["butter"], None), ["kaleidoscope:dairy", "kaleidoscope:butter"])
ing("whipped_cream", "鮮奶油", "Whipped Cream", ("bowl_fill", C["white"], None), ["kaleidoscope:dairy", "kaleidoscope:cream"])
ing("cream_cheese", "奶油起司", "Cream Cheese", ("butter", C["cream"], None), ["kaleidoscope:dairy", "kaleidoscope:cheese"])
ing("frothed_milk", "奶泡", "Frothed Milk", ("bowl_fill", C["milk"], C["white"]), ["kaleidoscope:dairy"])
ing("milk_foam_cap", "奶蓋", "Milk Foam Cap", ("bowl_fill", C["white"], C["cream"]), ["kaleidoscope:dairy"])
ing("yeast", "酵母", "Yeast", ("powder", C["tan"], None), ["kaleidoscope:yeast"])
ing("cocoa_powder", "可可粉", "Cocoa Powder", ("powder", C["choc"], None), ["kaleidoscope:cocoa"])
ing("brown_sugar", "黑糖", "Brown Sugar", ("powder", C["dkbrown"], None), ["kaleidoscope:sugar", "kaleidoscope:sweetener"])
ing("brown_sugar_syrup", "黑糖糖漿", "Brown Sugar Syrup", ("bottle", C["dkbrown"], None), ["kaleidoscope:sweetener", "kaleidoscope:sauce"], 16)
ing("caramel", "焦糖", "Caramel", ("bowl_fill", C["caramel"], None), ["kaleidoscope:sauce"])
ing("custard", "卡士達", "Custard", ("bowl_fill", C["butter"], None), ["kaleidoscope:custard"])
ing("chocolate_sauce", "巧克力醬", "Chocolate Sauce", ("bowl_fill", C["choc"], None), ["kaleidoscope:sauce"])
ing("strawberry_jam", "草莓果醬", "Strawberry Jam", ("jar", C["red"], None), ["kaleidoscope:jam"], 16)
ing("blueberry_jam", "藍莓果醬", "Blueberry Jam", ("jar", C["blue"], None), ["kaleidoscope:jam"], 16)
ing("vanilla_extract", "香草精", "Vanilla Extract", ("bottle", C["brown"], None), ["kaleidoscope:spice"], 16)
ing("cinnamon_powder", "肉桂粉", "Cinnamon Powder", ("powder", C["cinnamon"], None), ["kaleidoscope:spice"])
ing("sesame_paste", "芝麻醬", "Sesame Paste", ("bowl_fill", C["tan"], None), ["kaleidoscope:sauce"])
ing("lavender_sugar", "薰衣草糖", "Lavender Sugar", ("powder", C["purple"], None), ["kaleidoscope:sugar", "kaleidoscope:sweetener"])
ing("stevia_sugar", "甜菊糖", "Stevia Sugar", ("powder", C["white"], C["green"]), ["kaleidoscope:sweetener"])
ing("matcha_powder", "抹茶粉", "Matcha Powder", ("powder", C["matcha"], None), ["kaleidoscope:tea_leaf", "kaleidoscope:spice"])
ing("poppy_seeds", "罌粟籽", "Poppy Seeds", ("seeds", C["black"], None), ["kaleidoscope:spice"])
ing("crushed_ice", "碎冰", "Crushed Ice", ("ice", (200, 230, 250), None), ["kaleidoscope:ice"])
ing("tapioca_starch", "樹薯粉", "Tapioca Starch", ("powder", C["white"], None), ["kaleidoscope:starch"])
ing("raw_tapioca_pearls", "生粉圓", "Raw Tapioca Pearls", ("pearls", C["tan"], None))
ing("tapioca_pearls", "珍珠", "Tapioca Pearls", ("pearls", C["black"], None), ["kaleidoscope:drink_topping"])
ing("black_tea_base", "紅茶湯底", "Black Tea Base", ("bottle", C["tea"], None), ["kaleidoscope:tea_base"], 16)
ing("green_tea_base", "綠茶湯底", "Green Tea Base", ("bottle", C["matcha"], None), ["kaleidoscope:tea_base"], 16)
ing("oolong_tea_base", "烏龍茶湯底", "Oolong Tea Base", ("bottle", C["caramel"], None), ["kaleidoscope:tea_base"], 16)
# Coffee chain
ing("coffee_cherry", "咖啡果", "Coffee Cherry", ("berry", C["red"], None), ["kaleidoscope:fruit"])
ing("green_coffee_beans", "咖啡生豆", "Green Coffee Beans", ("bean", C["bean_g"], None), ["kaleidoscope:coffee_bean"], place="coffee_bush", place_on="soil")
for r, zh, col in [("light", "淺焙", C["tan"]), ("medium", "中焙", C["brown"]), ("dark", "深焙", C["dkbrown"])]:
    ing(f"roasted_coffee_beans_{r}", f"{zh}咖啡豆", f"{r.capitalize()} Roast Coffee Beans", ("bean", col, None), ["kaleidoscope:coffee_bean"])
    ing(f"ground_coffee_{r}", f"{zh}咖啡粉", f"{r.capitalize()} Roast Ground Coffee", ("powder", col, None), ["kaleidoscope:ground_coffee"])
# Batters / doughs
for iid, zh, en, col in [
    ("cake_batter", "蛋糕麵糊", "Cake Batter", C["cream"]), ("chocolate_cake_batter", "巧克力蛋糕麵糊", "Chocolate Cake Batter", C["choc"]),
    ("castella_batter", "蜂蜜蛋糕麵糊", "Castella Batter", C["butter"]), ("matcha_batter", "抹茶麵糊", "Matcha Batter", C["matcha"]),
    ("lemon_poppy_batter", "檸檬罌粟籽麵糊", "Lemon Poppy Batter", C["lemon"]), ("cheesecake_batter", "起司蛋糕糊", "Cheesecake Batter", C["cream"]),
    ("muffin_batter", "藍莓瑪芬麵糊", "Blueberry Muffin Batter", C["cream"]), ("taiyaki_batter", "鯛魚燒麵糊", "Taiyaki Batter", C["dough"]),
    ("savory_taiyaki_batter", "鹹味鯛魚燒麵糊", "Savory Taiyaki Batter", C["tan"]), ("fa_gao_batter", "發糕粉漿", "Fa Gao Batter", C["caramel"])]:
    ing(iid, zh, en, ("bowl_fill", col, None), ["kaleidoscope:batter"], 16)
for iid, zh, en, col in [
    ("bread_dough", "吐司麵團", "Bread Dough", C["dough"]), ("croissant_dough", "可頌麵團", "Croissant Dough", C["butter"]),
    ("cinnamon_roll_dough", "肉桂捲麵團", "Cinnamon Roll Dough", C["tan"]), ("baguette_dough", "法棍麵團", "Baguette Dough", C["dough"]),
    ("focaccia_dough", "迷迭香佛卡夏麵團", "Focaccia Dough", C["dough"]), ("donut_dough", "甜甜圈麵團", "Donut Dough", C["dough"])]:
    ing(iid, zh, en, ("ball", col, None), ["kaleidoscope:dough"], 16)
    ing(f"proofed_{iid}", f"發酵{zh}", f"Proofed {en}", ("ball_big", col, None), ["kaleidoscope:dough"], 16)
for iid, zh, en, col, chips in [
    ("pineapple_bun_dough", "菠蘿麵包麵團", "Pineapple Bun Dough", C["butter"], None), ("bagel_dough", "罌粟籽貝果麵團", "Bagel Dough", C["dough"], C["black"]),
    ("cookie_dough", "餅乾麵團", "Cookie Dough", C["dough"], None), ("chocolate_cookie_dough", "巧克力餅乾麵團", "Chocolate Cookie Dough", C["dough"], C["choc"]),
    ("lavender_cookie_dough", "薰衣草餅乾麵團", "Lavender Cookie Dough", C["dough"], C["purple"]), ("scone_dough", "司康麵團", "Scone Dough", C["cream"], None),
    ("pie_dough", "派皮麵團", "Pie Dough", C["dough"], None), ("sesame_ball_dough", "芝麻球麵團", "Sesame Ball Dough", C["white"], C["black"]),
    ("mooncake_dough", "月餅生胚", "Mooncake Dough", C["tan"], C["dkbrown"])]:
    ing(iid, zh, en, ("ball", col, chips), ["kaleidoscope:dough"], 16)
ing("pie_crust", "派皮", "Pie Crust", ("mold_pie", C["dough"], C["tan"]), ["kaleidoscope:dough"], 16)
for iid, zh, en, col in [("raw_apple_pie", "蘋果派生胚", "Raw Apple Pie", C["red"]), ("raw_blueberry_pie", "藍莓派生胚", "Raw Blueberry Pie", C["blue"]),
                         ("raw_quiche", "鹹派生胚", "Raw Quiche", C["yellow"]), ("raw_fish_pie", "魚肉鹹派生胚", "Raw Fish Pie", C["pink"]),
                         ("raw_egg_tart", "蛋塔生胚", "Raw Egg Tart", C["butter"])]:
    ing(iid, zh, en, ("pie", C["dough"], col), ["kaleidoscope:dough"], 16)

# ---------------------------------------------------------------------------
# Plants: items + crop blocks
# crop(): block id, stages, how it grows/harvests. place_on: "farmland" | "soil" | "jungle"
#   kind "annual":    harvest by breaking when mature (loot), seeds back
#   kind "perennial": interact when mature -> harvest, reset to stage `reset`
# ---------------------------------------------------------------------------
SOIL = ["minecraft:grass_block", "minecraft:dirt", "minecraft:podzol", "minecraft:coarse_dirt", "minecraft:farmland", "minecraft:moss_block", "minecraft:dirt_with_roots"]
FARMLAND = ["minecraft:farmland"]
JUNGLE = ["minecraft:jungle_log", "minecraft:grass_block", "minecraft:podzol", "minecraft:dirt"]
PLACE_ON = {"soil": SOIL, "farmland": FARMLAND, "jungle": JUNGLE}


def crop(bid, zh, en, kind, seed, harvest, stages=4, place_on="soil", leaf=C["green"], fruit=None, chance=12,
         reset=1, bonus=None, spread=False, wild=None, extra_drops=()):
    CROPS.append(dict(id=bid, zh=zh, en=en, kind=kind, seed=seed, harvest=harvest, stages=stages, place_on=place_on,
                      leaf=leaf, fruit=fruit, chance=chance, reset=reset, bonus=bonus, spread=spread, wild=wild,
                      extra_drops=list(extra_drops)))


def plant_item(iid, zh, en, art, tags=(), **kw):
    item(iid, zh, en, G_PLANTS, art, 64, tags, **kw)


# Herbs (草本 leads when installed)
for h, zh, en, col, biomes in [("rosemary", "迷迭香", "Rosemary", C["dkgreen"], ["plains", "forest"]),
                               ("thyme", "百里香", "Thyme", C["green"], ["plains", "extreme_hills"]),
                               ("lavender", "薰衣草", "Lavender", C["purple"], ["forest", "birch", "flower_forest"]),
                               ("mint", "薄荷", "Mint", (90, 200, 120), ["river", "swamp"])]:
    leaf_id = "mint_leaves" if h == "mint" else h
    plant_item(leaf_id, zh if h != "mint" else "薄荷葉", en if h != "mint" else "Mint Leaves", ("herb", col, None),
               ["kaleidoscope:herb"] + (["kaleidoscope:flower_edible"] if h == "lavender" else []))
    plant_item(f"{h}_cutting", f"{zh}插枝", f"{en} Cutting", ("cutting", col, C["brown"]), ["kaleidoscope:seed"],
               place=f"{h}_bush", place_on="soil")
    crop(f"{h}_bush", zh, en, "perennial", f"{h}_cutting", (leaf_id, 1, 3), 4, "soil", col,
         fruit=C["purple"] if h == "lavender" else None, spread=(h == "mint"), wild=biomes)
plant_item("dried_rosemary", "乾燥迷迭香", "Dried Rosemary", ("herb", C["tan"], None), ["kaleidoscope:herb", "kaleidoscope:spice"])
plant_item("dried_thyme", "乾燥百里香", "Dried Thyme", ("herb", C["tan"], C["green"]), ["kaleidoscope:herb", "kaleidoscope:spice"])
# Vanilla orchid
plant_item("green_vanilla_pod", "青香草莢", "Green Vanilla Pod", ("pod", C["green"], None))
plant_item("vanilla_pod", "香草莢", "Vanilla Pod", ("pod", C["dkbrown"], None), ["kaleidoscope:spice"])
plant_item("vanilla_cutting", "香草蘭插枝", "Vanilla Cutting", ("cutting", C["green"], C["white"]), ["kaleidoscope:seed"], place="vanilla_vine", place_on="jungle")
crop("vanilla_vine", "香草蘭", "Vanilla Orchid", "perennial", "vanilla_cutting", ("green_vanilla_pod", 1, 2), 4, "jungle",
     C["green"], fruit=C["white"], chance=8, wild=["jungle", "bamboo"])
# Cinnamon (tree; see TREES)
plant_item("cinnamon_sapling", "肉桂樹苗", "Cinnamon Sapling", ("sapling", C["dkgreen"], C["cinnamon"]), ["kaleidoscope:seed"], place="cinnamon_sapling_block", place_on="soil")
plant_item("cinnamon_bark", "肉桂樹皮", "Cinnamon Bark", ("stick", C["cinnamon"], C["brown"]), ["kaleidoscope:spice"])
plant_item("cinnamon_stick", "肉桂棒", "Cinnamon Stick", ("stick", C["cinnamon"], C["tan"]), ["kaleidoscope:spice"])
# Sesame / stevia / cassava / coffee (annual / perennial crops)
plant_item("sesame_seeds", "白芝麻", "Sesame Seeds", ("seeds", C["sesame"], None), ["kaleidoscope:seed", "kaleidoscope:nut"], place="sesame_crop", place_on="farmland")
plant_item("black_sesame_seeds", "黑芝麻", "Black Sesame Seeds", ("seeds", C["black"], None), ["kaleidoscope:nut"])
crop("sesame_crop", "芝麻", "Sesame", "annual", "sesame_seeds", ("sesame_seeds", 2, 4), 8, "farmland", C["green"], C["sesame"],
     bonus=("black_sesame_seeds", 0.1), wild=["savanna", "desert"])
plant_item("stevia_seeds", "甜菊種子", "Stevia Seeds", ("seeds", C["green"], None), ["kaleidoscope:seed"], place="stevia_crop", place_on="farmland")
plant_item("stevia_leaf", "甜菊葉", "Stevia Leaf", ("leaf", C["green"], None), ["kaleidoscope:herb"])
plant_item("dried_stevia", "乾燥甜菊葉", "Dried Stevia", ("leaf", C["tan"], None), ["kaleidoscope:herb"])
crop("stevia_crop", "甜菊", "Stevia", "annual", "stevia_seeds", ("stevia_leaf", 2, 4), 8, "farmland", C["green"], C["white"], wild=["jungle"])
plant_item("cassava", "樹薯", "Cassava", ("root", C["brown"], C["white"]), ["kaleidoscope:root_vegetable", "kaleidoscope:vegetable"])
plant_item("cassava_cutting", "樹薯莖段", "Cassava Cutting", ("cutting", C["brown"], C["green"]), ["kaleidoscope:seed"], place="cassava_crop", place_on="farmland")
crop("cassava_crop", "樹薯", "Cassava", "annual", "cassava_cutting", ("cassava", 1, 3), 8, "farmland", C["dkgreen"], C["brown"], wild=["savanna", "jungle"])
crop("coffee_bush", "咖啡樹", "Coffee Bush", "perennial", "green_coffee_beans", ("coffee_cherry", 2, 4), 4, "soil", C["dkgreen"], C["red"],
     chance=8, reset=2, wild=["jungle", "bamboo"])
# Fruits (豐收 leads when installed)
for f, zh, en, col, biomes, tags in [("strawberry", "草莓", "Strawberry", C["red"], ["plains", "flower_forest"], ["kaleidoscope:fruit", "kaleidoscope:berry"]),
                                     ("blueberry", "藍莓", "Blueberry", C["blue"], ["taiga"], ["kaleidoscope:fruit", "kaleidoscope:berry"]),
                                     ("raspberry", "覆盆子", "Raspberry", C["pink"], ["forest", "birch"], ["kaleidoscope:fruit", "kaleidoscope:berry"])]:
    plant_item(f, zh, en, ("berry", col, None), tags, food=food(2, 0.3, 1.0), place=f"{f}_bush", place_on="soil")
    crop(f"{f}_bush", zh, en, "perennial", f, (f, 2, 4), 4, "soil", C["green"], col, wild=biomes)
plant_item("dried_blueberry", "藍莓乾", "Dried Blueberries", ("berry", (60, 50, 110), None), ["kaleidoscope:fruit"], food=food(2, 0.4, 1.0))
plant_item("lemon_sapling", "檸檬樹苗", "Lemon Sapling", ("sapling", C["green"], C["lemon"]), ["kaleidoscope:seed"], place="lemon_sapling_block", place_on="soil")
plant_item("lemon", "檸檬", "Lemon", ("lemon", C["lemon"], C["green"]), ["kaleidoscope:fruit", "kaleidoscope:citrus"])
plant_item("lemon_slice", "檸檬片", "Lemon Slice", ("lemon_slice", C["lemon"], C["white"]), ["kaleidoscope:fruit", "kaleidoscope:citrus"])

# Trees: sapling block grows into trunk + leaves
TREES = [
    dict(id="cinnamon", sapling="cinnamon_sapling_block", sapling_item="cinnamon_sapling", log="cinnamon_log", leaves="cinnamon_leaves",
         bark="cinnamon_bark", leaf=C["dkgreen"], trunk=C["cinnamon"], wild=["jungle"], zh="肉桂樹", en="Cinnamon Tree"),
    dict(id="lemon", sapling="lemon_sapling_block", sapling_item="lemon_sapling", log="minecraft:oak_log", leaves="lemon_leaves",
         fruit="lemon", leaf=C["green"], trunk=C["brown"], wild=["savanna", "beach"], zh="檸檬樹", en="Lemon Tree"),
]

# ---------------------------------------------------------------------------
# Foods
# ---------------------------------------------------------------------------
def dessert(iid, zh, en, art, n, sat, top, side, height, tags=("kaleidoscope:cake", "kaleidoscope:pastry")):
    """Placeable whole dessert: eaten in 4 slices where it stands."""
    DESSERTS.append(dict(id=iid, top=top, side=side, height=height, n=n, sat=sat))
    item(iid, zh, en, G_FOOD, art, 16, list(tags) + ["kaleidoscope_cookery:placeable_food"],
         food=food(n * 4 // 2, sat), place=iid)


def bake(iid, zh, en, art, n, sat, tags=(), stack=64, dur=1.6):
    item(iid, zh, en, G_FOOD, art, stack, tags, food=food(n, sat, dur))


BREAD, PASTRY, CAKE, COOKIE = ["kaleidoscope:bread", "c:foods/bread"], ["kaleidoscope:pastry"], ["kaleidoscope:cake", "kaleidoscope:pastry"], ["kaleidoscope:cookie", "kaleidoscope:pastry"]
dessert("sponge_cake", "海綿蛋糕", "Sponge Cake", ("cake", C["cream"], C["white"]), 3, 0.5, C["white"], C["cream"], 8)
dessert("chocolate_cake", "巧克力蛋糕", "Chocolate Cake", ("cake", C["choc"], C["dkbrown"]), 3, 0.6, C["dkbrown"], C["choc"], 8)
dessert("strawberry_cream_cake", "草莓鮮奶油蛋糕", "Strawberry Cream Cake", ("cake", C["cream"], C["red"]), 4, 0.7, C["pink"], C["white"], 9)
dessert("birthday_cake", "生日蛋糕", "Birthday Cake", ("cake_candle", C["white"], C["red"]), 4, 0.8, C["pink"], C["white"], 9)
dessert("mint_chocolate_cake", "薄荷巧克力蛋糕", "Mint Chocolate Cake", ("cake", C["choc"], (120, 210, 160)), 4, 0.7, (120, 210, 160), C["choc"], 9)
dessert("cheesecake", "起司蛋糕", "Cheesecake", ("cake", C["cream"], C["butter"]), 4, 0.7, C["butter"], C["cream"], 7)
dessert("matcha_chiffon", "抹茶戚風蛋糕", "Matcha Chiffon", ("cake", C["matcha"], C["white"]), 3, 0.6, C["matcha"], C["matcha"], 9)
dessert("apple_pie", "蘋果派", "Apple Pie", ("pie", C["crust"], C["red"]), 3, 0.6, C["crust"], C["crust"], 4, ["kaleidoscope:pie", "kaleidoscope:pastry"])
dessert("blueberry_pie", "藍莓派", "Blueberry Pie", ("pie", C["crust"], C["blue"]), 3, 0.6, C["blue"], C["crust"], 4, ["kaleidoscope:pie", "kaleidoscope:pastry"])
dessert("quiche", "鹹派", "Quiche", ("pie", C["crust"], C["yellow"]), 4, 0.7, C["yellow"], C["crust"], 4, ["kaleidoscope:pie"])
dessert("fish_pie", "魚肉鹹派", "Fish Pie", ("pie", C["crust"], C["pink"]), 4, 0.7, C["pink"], C["crust"], 4, ["kaleidoscope:pie"])
bake("cake_slice", "蛋糕切片", "Cake Slice", ("slice_cake", C["cream"], C["white"]), 3, 0.5, CAKE)
bake("honey_castella", "蜂蜜蛋糕", "Honey Castella", ("loaf", C["butter"], C["crust"]), 6, 0.6, CAKE, 16)
bake("lemon_poppy_cake", "檸檬罌粟籽蛋糕", "Lemon Poppy Seed Cake", ("loaf", C["lemon"], C["black"]), 6, 0.6, CAKE, 16)
bake("blueberry_muffin", "藍莓瑪芬", "Blueberry Muffin", ("muffin", C["tan"], C["blue"]), 4, 0.5, PASTRY)
bake("taiyaki", "鯛魚燒", "Taiyaki", ("fish", C["crust"], C["butter"]), 4, 0.6, PASTRY)
bake("savory_taiyaki", "鹹味鯛魚燒", "Savory Taiyaki", ("fish", C["crust"], C["pink"]), 5, 0.6, ["kaleidoscope:pastry"])
bake("toast_loaf", "吐司", "Toast Loaf", ("loaf", C["crust"], C["dough"]), 8, 0.6, BREAD, 16, 2.0)
bake("toast_slice", "吐司片", "Toast Slice", ("slice", C["crust"], C["cream"]), 3, 0.6, BREAD, 64, 1.0)
bake("french_toast", "法式吐司", "French Toast", ("slice", C["crust"], C["butter"]), 6, 0.8, BREAD)
bake("baguette", "法棍", "Baguette", ("baguette", C["crust"], None), 6, 0.6, BREAD, 16)
bake("croissant", "可頌", "Croissant", ("croissant", C["caramel"], None), 4, 0.6, PASTRY)
bake("cinnamon_roll", "肉桂捲", "Cinnamon Roll", ("roll", C["tan"], C["cinnamon"]), 5, 0.6, PASTRY)
bake("rosemary_focaccia", "迷迭香佛卡夏", "Rosemary Focaccia", ("flatbread", C["tan"], C["dkgreen"]), 7, 0.7, BREAD, 16)
bake("pineapple_bun", "菠蘿麵包", "Pineapple Bun", ("bun", C["butter"], C["caramel"]), 5, 0.6, BREAD)
bake("poppy_seed_bagel", "罌粟籽貝果", "Poppy Seed Bagel", ("bagel", C["tan"], C["black"]), 5, 0.6, BREAD)
bake("donut", "甜甜圈", "Donut", ("donut", C["tan"], C["pink"]), 4, 0.5, PASTRY)
bake("pancakes", "鬆餅", "Pancakes", ("pancakes", C["tan"], C["butter"]), 6, 0.6, PASTRY)
bake("tart_shell", "塔殼", "Tart Shell", ("tart", C["crust"], C["dough"]), 1, 0.2, PASTRY)
bake("strawberry_tart", "草莓塔", "Strawberry Tart", ("tart", C["crust"], C["red"]), 5, 0.7, PASTRY)
bake("lemon_tart", "檸檬塔", "Lemon Tart", ("tart", C["crust"], C["lemon"]), 5, 0.7, PASTRY)
bake("egg_tart", "蛋塔", "Egg Tart", ("tart", C["crust"], C["yellow"]), 4, 0.6, PASTRY)
bake("butter_cookie", "奶油餅乾", "Butter Cookie", ("cookie", C["tan"], C["crust"]), 2, 0.3, COOKIE, 64, 0.8)
bake("chocolate_cookie", "巧克力餅乾", "Chocolate Cookie", ("cookie", C["choc"], C["dkbrown"]), 2, 0.3, COOKIE, 64, 0.8)
bake("lavender_cookie", "薰衣草餅乾", "Lavender Cookie", ("cookie", C["tan"], C["purple"]), 2, 0.3, COOKIE, 64, 0.8)
bake("scone", "司康", "Scone", ("bun", C["tan"], C["crust"]), 4, 0.5, PASTRY)
bake("fa_gao", "發糕", "Fa Gao", ("fagao", C["caramel"], C["pink"]), 5, 0.6, PASTRY)
bake("sesame_ball", "芝麻球", "Sesame Ball", ("ball", C["caramel"], C["sesame"]), 3, 0.5, PASTRY)
bake("sesame_mooncake", "芝麻月餅", "Sesame Mooncake", ("mooncake", C["crust"], C["dkbrown"]), 6, 0.7, PASTRY, 16)
bake("burnt_food", "焦黑的烘焙物", "Burnt Bake", ("burnt", C["black"], None), 1, 0.1, ["kaleidoscope:burnt"])

# ---------------------------------------------------------------------------
# Drinks
# ---------------------------------------------------------------------------
DRINK_BLOCKS = []  # mug drinks that can be set down, up to 4 mugs on one block (like Cookery's teacups)


def coffee_drink(iid, zh, en, col, n=1, sat=0.3, cup="coffee_mug", stack=16, extra_tags=()):
    # Mug drinks with no per-item data (stack > 1) can be placed; shaken drinks keep sweetness / ice on the item.
    placeable = cup == "coffee_mug" and stack > 1
    if placeable:
        DRINK_BLOCKS.append(iid)
    item(iid, zh, en, G_DRINK, ("mug" if cup == "coffee_mug" else "takeaway", C["white"], col), stack,
         ["kaleidoscope:drink", "kaleidoscope:hot_drink" if cup == "coffee_mug" else "kaleidoscope:cold_drink", *extra_tags],
         food=drink(n, sat, cup), place=iid if placeable else None)


coffee_drink("espresso", "濃縮咖啡", "Espresso", C["coffee"], extra_tags=["kaleidoscope:coffee"])
for iid, zh, en, col in [("americano", "美式咖啡", "Americano", C["coffee"]), ("latte", "拿鐵", "Latte", C["latte"]),
                         ("cappuccino", "卡布奇諾", "Cappuccino", C["latte"]), ("mocha", "摩卡", "Mocha", C["choc"]),
                         ("caramel_macchiato", "焦糖瑪奇朵", "Caramel Macchiato", C["caramel"]), ("cinnamon_latte", "肉桂拿鐵", "Cinnamon Latte", C["cinnamon"]),
                         ("pour_over_light", "手沖咖啡（淺焙）", "Pour-Over Coffee (Light)", C["tea"]),
                         ("pour_over_medium", "手沖咖啡（中焙）", "Pour-Over Coffee (Medium)", C["coffee"]),
                         ("pour_over_dark", "手沖咖啡（深焙）", "Pour-Over Coffee (Dark)", C["dkbrown"])]:
    coffee_drink(iid, zh, en, col, 2, 0.3, extra_tags=["kaleidoscope:coffee"])
coffee_drink("hot_cocoa", "熱可可", "Hot Cocoa", C["choc"], 3, 0.5, stack=1)
# Hand-shaken (stack 1: sweetness / ice are stored on the item)
for iid, zh, en, col, coffee in [
        ("bubble_milk_tea", "珍珠奶茶", "Bubble Milk Tea", C["latte"], False), ("brown_sugar_pearl_milk", "黑糖珍珠鮮奶", "Brown Sugar Pearl Milk", C["caramel"], False),
        ("pearl_black_tea_latte", "珍珠紅茶拿鐵", "Pearl Black Tea Latte", C["latte"], False), ("oolong_milk_foam", "奶蓋烏龍", "Oolong with Milk Foam", C["caramel"], False),
        ("lavender_milk_tea", "薰衣草奶茶", "Lavender Milk Tea", (200, 170, 220), False), ("yuanyang", "鴛鴦", "Yuanyang", C["coffee"], True),
        ("lemon_green_tea", "檸檬綠茶", "Lemon Green Tea", C["matcha"], False), ("lemon_black_tea", "檸檬紅茶", "Lemon Black Tea", C["tea"], False),
        ("matcha_latte", "抹茶拿鐵", "Matcha Latte", C["matcha"], True), ("mint_mocha", "薄荷摩卡", "Mint Mocha", C["choc"], True),
        ("iced_coffee", "冰咖啡", "Iced Coffee", C["coffee"], True), ("vanilla_milkshake", "香草奶昔", "Vanilla Milkshake", C["cream"], False),
        ("lemonade", "檸檬水", "Lemonade", C["lemon"], False), ("strawberry_milk", "草莓牛奶", "Strawberry Milk", C["pink"], False)]:
    coffee_drink(iid, zh, en, col, 3, 0.4, "takeaway_cup", 1, ["kaleidoscope:coffee"] if coffee else [])

# ---------------------------------------------------------------------------
# Crafting (shaped). key letters -> item ids
# ---------------------------------------------------------------------------
CRAFTING = [
    ("oven", ["BBB", "BFB", "BBB"], {"B": "minecraft:brick_block", "F": "minecraft:furnace"}, 1),
    ("mixing_bowl", ["I I", " W "], {"I": "minecraft:iron_ingot", "W": "minecraft:bowl"}, 1),
    ("proofing_basket", ["S S", "SSS"], {"S": "minecraft:wheat"}, 1),
    ("decorating_stand", [" P ", " S ", "SSS"], {"P": "minecraft:heavy_weighted_pressure_plate", "S": "minecraft:smooth_stone_slab"}, 1),
    ("espresso_machine", ["III", "IRI", "IBI"], {"I": "minecraft:iron_ingot", "R": "minecraft:redstone", "B": "minecraft:bucket"}, 1),
    ("pour_over_stand", [" P ", " S ", "SSS"], {"P": "minecraft:paper", "S": "minecraft:stick"}, 1),
    ("drink_shaker", [" N ", "I I", " I "], {"N": "minecraft:iron_nugget", "I": "minecraft:iron_ingot"}, 1),
    ("herb_planter", ["T T", "TDT"], {"T": "minecraft:hardened_clay", "D": "minecraft:dirt"}, 1),
    ("whisk", [" N ", "NNN", " S "], {"N": "minecraft:iron_nugget", "S": "minecraft:stick"}, 1),
    ("milk_frother", [" N ", " N ", " S "], {"N": "minecraft:iron_nugget", "S": "minecraft:stick"}, 1),
    ("rolling_pin", ["SPS"], {"S": "minecraft:stick", "P": "minecraft:oak_planks"}, 1),
    ("bread_knife", ["  I", " I ", "S  "], {"I": "minecraft:iron_ingot", "S": "minecraft:stick"}, 1),
    ("cake_mold", ["IPI", "III"], {"I": "minecraft:iron_ingot", "P": "minecraft:paper"}, 1),  # not the minecart shape
    ("loaf_pan", ["N N", "N N", "NNN"], {"N": "minecraft:iron_nugget"}, 1),
    ("baking_tray", ["III"], {"I": "minecraft:iron_ingot"}, 1),
    ("pie_tin", ["N N", " N "], {"N": "minecraft:iron_nugget"}, 1),  # nuggets: the ingot shape is the bucket
    ("muffin_tin", ["NNN", "III"], {"N": "minecraft:iron_nugget", "I": "minecraft:iron_ingot"}, 1),
    ("taiyaki_mold", ["INI", "INI"], {"I": "minecraft:iron_ingot", "N": "minecraft:iron_nugget"}, 1),  # not iron boots
    ("coffee_mug", ["C C", "CCC"], {"C": "minecraft:clay_ball"}, 4),
    ("takeaway_cup", ["P P", " P "], {"P": "minecraft:paper"}, 4),
    ("birthday_candle", ["S", "H", "D"], {"S": "minecraft:string", "H": "minecraft:honeycomb", "D": "minecraft:pink_dye"}, 4),  # not the candle
]
STATIONS.append(dict(id="herb_planter", cubes=None, tex=(180, 100, 70), sound="stone"))
item("herb_planter", "香草盆栽", "Herb Planter", G_STATIONS, ("planter", (180, 100, 70), C["green"]), 64, place="herb_planter")
PLANTER_PLANTS = ["rosemary", "thyme", "lavender", "mint", "strawberry"]

# --- Biomes O' Plenty (Bedrock port) handshake ------------------------------------
# BOP biome id -> the vanilla tags/biome names it stands in for (its `bop_like_*` tags).
# Derived from BOP_BR docs/handshake.json v1.2.0; refresh by re-copying that file's `like` lists.
# Lets `wild` biome tags also match BOP biomes (feature rules + grass drops); inert when BOP is absent.
BOP_LIKE = {
    "bop:auroral_garden": ["grove", "mountains", "snowy_slopes"],
    "bop:bayou": ["swamp", "swamp_water_huge_mushroom", "swampland"],
    "bop:bog": ["mangrove_swamp"],
    "bop:cold_desert": ["ice", "ice_plains", "ice_plains_spikes"],
    "bop:coniferous_forest": ["forest", "taiga"],
    "bop:crag": ["extreme_hills", "jagged_peaks", "mountains"],
    "bop:crystalline_chasm": ["warped_forest"],
    "bop:dead_forest": ["cold_taiga_mutated", "forest", "taiga"],
    "bop:dryland": ["savanna"],
    "bop:dune_beach": ["beach"],
    "bop:erupting_inferno": ["basalt_deltas"],
    "bop:field": ["plains"],
    "bop:fir_clearing": ["forest", "taiga", "taiga_mutated"],
    "bop:floodplain": ["swamp", "swamp_water_huge_mushroom", "swampland_mutated"],
    "bop:forested_field": ["plains", "sunflower_plains"],
    "bop:fungal_jungle": ["lush_caves"],
    "bop:glowing_grotto": ["lush_caves"],
    "bop:gravel_beach": ["beach", "cold_beach", "stone", "stone_beach"],
    "bop:highland": ["extreme_hills", "extreme_hills_mutated"],
    "bop:hot_springs": ["meadow", "mountains"],
    "bop:jade_cliffs": ["mountains", "stony_peaks"],
    "bop:lavender_field": ["plains", "sunflower_plains"],
    "bop:lush_desert": ["desert"],
    "bop:lush_savanna": ["plateau", "savanna", "savanna_plateau"],
    "bop:maple_woods": ["forest", "taiga"],
    "bop:marsh": ["swamp", "swamp_water_huge_mushroom", "swampland"],
    "bop:mediterranean_forest": ["plateau", "savanna", "savanna_plateau", "savanna_plateau_mutated"],
    "bop:moor": ["meadow", "mountains"],
    "bop:muskeg": ["swamp", "swamp_water_huge_mushroom", "swampland_mutated"],
    "bop:mystic_grove": ["flower_forest"],
    "bop:old_growth_dead_forest": ["forest", "mega", "mega_taiga", "taiga"],
    "bop:old_growth_woodland": ["forest", "roofed", "roofed_forest", "roofed_forest_mutated"],
    "bop:ominous_woods": ["forest", "pale_garden", "roofed", "roofed_forest"],
    "bop:orchard": ["forest", "oak_forest"],
    "bop:origin_valley": ["forest", "oak_forest"],
    "bop:overgrown_greens": ["jungle", "jungle_mutated"],
    "bop:pasture": ["plains"],
    "bop:prairie": ["plains"],
    "bop:pumpkin_patch": ["forest", "oak_forest"],
    "bop:rainforest": ["jungle"],
    "bop:redwood_forest": ["forest", "mega", "mega_taiga", "redwood_taiga_mutated", "taiga"],
    "bop:rocky_rainforest": ["bamboo", "bamboo_jungle", "jungle"],
    "bop:rocky_shrubland": ["extreme_hills", "extreme_hills_edge", "extreme_hills_plus_trees", "forest", "mountain"],
    "bop:scrubland": ["savanna"],
    "bop:seasonal_forest": ["birch", "birch_forest", "birch_forest_mutated", "forest"],
    "bop:shrubland": ["plains"],
    "bop:snowblossom_grove": ["cherry_grove", "mountains"],
    "bop:snowy_coniferous_forest": ["cold_taiga", "forest", "taiga"],
    "bop:snowy_fir_clearing": ["cold_taiga", "forest", "taiga"],
    "bop:snowy_maple_woods": ["cold_taiga", "forest", "taiga"],
    "bop:spider_nest": ["dripstone_caves"],
    "bop:subtropics": ["jungle", "jungle_edge", "jungle_edge_mutated"],
    "bop:tropics": ["beach"],
    "bop:tundra": ["ice", "ice_plains"],
    "bop:undergrowth": ["crimson_forest"],
    "bop:visceral_heap": ["hell"],
    "bop:volcanic_plains": ["mesa", "mesa_bryce", "savanna", "savanna_mutated", "surface_mineshaft"],
    "bop:volcano": ["frozen_peaks", "mountains", "stony_peaks"],
    "bop:wasteland": ["desert", "desert_mutated"],
    "bop:wasteland_steppe": ["desert"],
    "bop:wetland": ["mangrove_swamp"],
    "bop:wintry_origin_valley": ["ice", "ice_plains"],
    "bop:withered_abyss": ["soulsand_valley"],
    "bop:woodland": ["forest", "oak_forest"],
}
