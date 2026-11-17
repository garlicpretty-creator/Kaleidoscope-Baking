# 美術資源清單（給美術）

> 此檔由 `tools/gen_content.py` 自動產生，請勿手動編輯。

目前所有貼圖都是程式畫的**暫代圖**。請用**同檔名**覆蓋 `RP/textures/` 底下的 PNG 即可，
不需要改任何 JSON 或程式；之後重新執行產生器也**不會**覆蓋你放進來的檔案（除非加 `--force-art`）。

- 方塊貼圖、物品圖示目前都是 **16×16**；要做更高解析度可以，但同一類請統一尺寸。
- `pack_icon.png` 為 64×64（`BP/`、`RP/` 各一張）。

## 烤箱（3×3×3 大型方塊）

烤箱由 27 個完整方塊組成，每張貼圖是**一格的一個面**。正面（朝向放置的玩家）中央是爐門，下方中央是火口；頂面中央是煙囪。

```
正面                      頂面
┌─────┬─────┬─────┐      ┌─────┬─────┬─────┐
│brick│brick│brick│      │ top │ top │ top │
│brick│door │brick│      │ top │chimn│ top │
│brick│fire │brick│      │ top │ top │ top │
└─────┴─────┴─────┘      └─────┴─────┴─────┘
```

| 檔名 | 用途 |
|------|------|
| `textures/blocks/kb_oven_brick.png` | 外牆 |
| `textures/blocks/kb_oven_top.png` | 頂面 |
| `textures/blocks/kb_oven_chimney.png` | 煙囪 |
| `textures/blocks/kb_oven_door.png` | 爐門 |
| `textures/blocks/kb_oven_firebox.png` | 火口（熄火） |
| `textures/blocks/kb_oven_firebox_lit.png` | 火口（燃燒，會發光） |

## 站點方塊（自訂模型，每個面使用整張 16×16）

| 檔名 | 方塊 | 模型 |
|------|------|------|
| `textures/blocks/kb_mixing_bowl.png` | 攪拌盆 | `RP/models/blocks/mixing_bowl.geo.json` |
| `textures/blocks/kb_proofing_basket.png` | 發酵籃 | `RP/models/blocks/proofing_basket.geo.json` |
| `textures/blocks/kb_decorating_stand.png` | 裱花台 | `RP/models/blocks/decorating_stand.geo.json` |
| `textures/blocks/kb_espresso_machine.png` | 咖啡機 | `RP/models/blocks/espresso_machine.geo.json` |
| `textures/blocks/kb_pour_over_stand.png` | 手沖架 | `RP/models/blocks/pour_over_stand.geo.json` |
| `textures/blocks/kb_drink_shaker.png` | 雪克杯 | `RP/models/blocks/drink_shaker.geo.json` |
| `textures/blocks/kb_herb_planter.png` | 香草盆栽 | `RP/models/blocks/herb_planter.geo.json` |
| `textures/blocks/kb_planter_soil.png` | 香草盆栽的土面 | |

## 作物 / 灌木（每個生長階段一張，交叉十字模型）

| 植物 | 檔名 |
|------|------|
| 迷迭香 | `textures/blocks/kb_rosemary_bush_stage_0..3.png` |
| 百里香 | `textures/blocks/kb_thyme_bush_stage_0..3.png` |
| 薰衣草 | `textures/blocks/kb_lavender_bush_stage_0..3.png` |
| 薄荷 | `textures/blocks/kb_mint_bush_stage_0..3.png` |
| 香草蘭 | `textures/blocks/kb_vanilla_vine_stage_0..3.png` |
| 芝麻 | `textures/blocks/kb_sesame_crop_stage_0..7.png` |
| 甜菊 | `textures/blocks/kb_stevia_crop_stage_0..7.png` |
| 樹薯 | `textures/blocks/kb_cassava_crop_stage_0..7.png` |
| 咖啡樹 | `textures/blocks/kb_coffee_bush_stage_0..3.png` |
| 草莓 | `textures/blocks/kb_strawberry_bush_stage_0..3.png` |
| 藍莓 | `textures/blocks/kb_blueberry_bush_stage_0..3.png` |
| 覆盆子 | `textures/blocks/kb_raspberry_bush_stage_0..3.png` |

## 樹

| 檔名 | 用途 |
|------|------|
| `textures/blocks/kb_cinnamon_sapling_block_stage_0..2.png` | 肉桂樹苗 |
| `textures/blocks/kb_cinnamon_log_side / _stripped / _top.png` | 肉桂原木（側面 / 剝皮 / 頂面） |
| `textures/blocks/kb_cinnamon_leaves_*.png` | 肉桂樹葉 |
| `textures/blocks/kb_lemon_sapling_block_stage_0..2.png` | 檸檬樹苗 |
| `textures/blocks/kb_lemon_leaves_*.png` | 檸檬樹葉（0–3 結果階段） |

## 可擺放甜點（頂面 + 側面；模型會隨吃掉的片數改變）

| 甜點 | 檔名 |
|------|------|
| 海綿蛋糕 | `textures/blocks/kb_sponge_cake_top.png`、`_side.png` |
| 巧克力蛋糕 | `textures/blocks/kb_chocolate_cake_top.png`、`_side.png` |
| 草莓鮮奶油蛋糕 | `textures/blocks/kb_strawberry_cream_cake_top.png`、`_side.png` |
| 生日蛋糕 | `textures/blocks/kb_birthday_cake_top.png`、`_side.png` |
| 薄荷巧克力蛋糕 | `textures/blocks/kb_mint_chocolate_cake_top.png`、`_side.png` |
| 起司蛋糕 | `textures/blocks/kb_cheesecake_top.png`、`_side.png` |
| 抹茶戚風蛋糕 | `textures/blocks/kb_matcha_chiffon_top.png`、`_side.png` |
| 蘋果派 | `textures/blocks/kb_apple_pie_top.png`、`_side.png` |
| 藍莓派 | `textures/blocks/kb_blueberry_pie_top.png`、`_side.png` |
| 鹹派 | `textures/blocks/kb_quiche_top.png`、`_side.png` |
| 魚肉鹹派 | `textures/blocks/kb_fish_pie_top.png`、`_side.png` |

## 物品圖示 `RP/textures/items/`

### 烘焙廚具

| 檔名 | 物品 |
|------|------|
| `kb_oven.png` | 烤箱 |
| `kb_mixing_bowl.png` | 攪拌盆 |
| `kb_proofing_basket.png` | 發酵籃 |
| `kb_decorating_stand.png` | 裱花台 |
| `kb_espresso_machine.png` | 咖啡機 |
| `kb_pour_over_stand.png` | 手沖架 |
| `kb_drink_shaker.png` | 雪克杯 |
| `kb_herb_planter.png` | 香草盆栽 |

### 烘焙工具

| 檔名 | 物品 |
|------|------|
| `kb_whisk.png` | 打蛋器 |
| `kb_milk_frother.png` | 奶泡器 |
| `kb_rolling_pin.png` | 擀麵棍 |
| `kb_bread_knife.png` | 麵包刀 |
| `kb_cake_mold.png` | 蛋糕模 |
| `kb_loaf_pan.png` | 吐司模 |
| `kb_baking_tray.png` | 烤盤 |
| `kb_pie_tin.png` | 派盤 |
| `kb_muffin_tin.png` | 瑪芬烤盤 |
| `kb_taiyaki_mold.png` | 鯛魚燒模 |
| `kb_coffee_mug.png` | 馬克杯 |
| `kb_takeaway_cup.png` | 外帶杯 |
| `kb_birthday_candle.png` | 生日蠟燭 |

### 烘焙材料

| 檔名 | 物品 |
|------|------|
| `kb_butter.png` | 奶油 |
| `kb_whipped_cream.png` | 鮮奶油 |
| `kb_cream_cheese.png` | 奶油起司 |
| `kb_frothed_milk.png` | 奶泡 |
| `kb_milk_foam_cap.png` | 奶蓋 |
| `kb_yeast.png` | 酵母 |
| `kb_cocoa_powder.png` | 可可粉 |
| `kb_brown_sugar.png` | 黑糖 |
| `kb_brown_sugar_syrup.png` | 黑糖糖漿 |
| `kb_caramel.png` | 焦糖 |
| `kb_custard.png` | 卡士達 |
| `kb_chocolate_sauce.png` | 巧克力醬 |
| `kb_strawberry_jam.png` | 草莓果醬 |
| `kb_blueberry_jam.png` | 藍莓果醬 |
| `kb_vanilla_extract.png` | 香草精 |
| `kb_cinnamon_powder.png` | 肉桂粉 |
| `kb_sesame_paste.png` | 芝麻醬 |
| `kb_lavender_sugar.png` | 薰衣草糖 |
| `kb_stevia_sugar.png` | 甜菊糖 |
| `kb_matcha_powder.png` | 抹茶粉 |
| `kb_poppy_seeds.png` | 罌粟籽 |
| `kb_crushed_ice.png` | 碎冰 |
| `kb_tapioca_starch.png` | 樹薯粉 |
| `kb_raw_tapioca_pearls.png` | 生粉圓 |
| `kb_tapioca_pearls.png` | 珍珠 |
| `kb_black_tea_base.png` | 紅茶湯底 |
| `kb_green_tea_base.png` | 綠茶湯底 |
| `kb_oolong_tea_base.png` | 烏龍茶湯底 |
| `kb_coffee_cherry.png` | 咖啡果 |
| `kb_green_coffee_beans.png` | 咖啡生豆 |
| `kb_roasted_coffee_beans_light.png` | 淺焙咖啡豆 |
| `kb_ground_coffee_light.png` | 淺焙咖啡粉 |
| `kb_roasted_coffee_beans_medium.png` | 中焙咖啡豆 |
| `kb_ground_coffee_medium.png` | 中焙咖啡粉 |
| `kb_roasted_coffee_beans_dark.png` | 深焙咖啡豆 |
| `kb_ground_coffee_dark.png` | 深焙咖啡粉 |
| `kb_cake_batter.png` | 蛋糕麵糊 |
| `kb_chocolate_cake_batter.png` | 巧克力蛋糕麵糊 |
| `kb_castella_batter.png` | 蜂蜜蛋糕麵糊 |
| `kb_matcha_batter.png` | 抹茶麵糊 |
| `kb_lemon_poppy_batter.png` | 檸檬罌粟籽麵糊 |
| `kb_cheesecake_batter.png` | 起司蛋糕糊 |
| `kb_muffin_batter.png` | 藍莓瑪芬麵糊 |
| `kb_taiyaki_batter.png` | 鯛魚燒麵糊 |
| `kb_savory_taiyaki_batter.png` | 鹹味鯛魚燒麵糊 |
| `kb_fa_gao_batter.png` | 發糕粉漿 |
| `kb_bread_dough.png` | 吐司麵團 |
| `kb_proofed_bread_dough.png` | 發酵吐司麵團 |
| `kb_croissant_dough.png` | 可頌麵團 |
| `kb_proofed_croissant_dough.png` | 發酵可頌麵團 |
| `kb_cinnamon_roll_dough.png` | 肉桂捲麵團 |
| `kb_proofed_cinnamon_roll_dough.png` | 發酵肉桂捲麵團 |
| `kb_baguette_dough.png` | 法棍麵團 |
| `kb_proofed_baguette_dough.png` | 發酵法棍麵團 |
| `kb_focaccia_dough.png` | 迷迭香佛卡夏麵團 |
| `kb_proofed_focaccia_dough.png` | 發酵迷迭香佛卡夏麵團 |
| `kb_donut_dough.png` | 甜甜圈麵團 |
| `kb_proofed_donut_dough.png` | 發酵甜甜圈麵團 |
| `kb_pineapple_bun_dough.png` | 菠蘿麵包麵團 |
| `kb_bagel_dough.png` | 罌粟籽貝果麵團 |
| `kb_cookie_dough.png` | 餅乾麵團 |
| `kb_chocolate_cookie_dough.png` | 巧克力餅乾麵團 |
| `kb_lavender_cookie_dough.png` | 薰衣草餅乾麵團 |
| `kb_scone_dough.png` | 司康麵團 |
| `kb_pie_dough.png` | 派皮麵團 |
| `kb_sesame_ball_dough.png` | 芝麻球麵團 |
| `kb_mooncake_dough.png` | 月餅生胚 |
| `kb_pie_crust.png` | 派皮 |
| `kb_raw_apple_pie.png` | 蘋果派生胚 |
| `kb_raw_blueberry_pie.png` | 藍莓派生胚 |
| `kb_raw_quiche.png` | 鹹派生胚 |
| `kb_raw_fish_pie.png` | 魚肉鹹派生胚 |
| `kb_raw_egg_tart.png` | 蛋塔生胚 |

### 烘焙植物

| 檔名 | 物品 |
|------|------|
| `kb_rosemary.png` | 迷迭香 |
| `kb_rosemary_cutting.png` | 迷迭香插枝 |
| `kb_thyme.png` | 百里香 |
| `kb_thyme_cutting.png` | 百里香插枝 |
| `kb_lavender.png` | 薰衣草 |
| `kb_lavender_cutting.png` | 薰衣草插枝 |
| `kb_mint_leaves.png` | 薄荷葉 |
| `kb_mint_cutting.png` | 薄荷插枝 |
| `kb_dried_rosemary.png` | 乾燥迷迭香 |
| `kb_dried_thyme.png` | 乾燥百里香 |
| `kb_green_vanilla_pod.png` | 青香草莢 |
| `kb_vanilla_pod.png` | 香草莢 |
| `kb_vanilla_cutting.png` | 香草蘭插枝 |
| `kb_cinnamon_sapling.png` | 肉桂樹苗 |
| `kb_cinnamon_bark.png` | 肉桂樹皮 |
| `kb_cinnamon_stick.png` | 肉桂棒 |
| `kb_sesame_seeds.png` | 白芝麻 |
| `kb_black_sesame_seeds.png` | 黑芝麻 |
| `kb_stevia_seeds.png` | 甜菊種子 |
| `kb_stevia_leaf.png` | 甜菊葉 |
| `kb_dried_stevia.png` | 乾燥甜菊葉 |
| `kb_cassava.png` | 樹薯 |
| `kb_cassava_cutting.png` | 樹薯莖段 |
| `kb_strawberry.png` | 草莓 |
| `kb_blueberry.png` | 藍莓 |
| `kb_raspberry.png` | 覆盆子 |
| `kb_dried_blueberry.png` | 藍莓乾 |
| `kb_lemon_sapling.png` | 檸檬樹苗 |
| `kb_lemon.png` | 檸檬 |
| `kb_lemon_slice.png` | 檸檬片 |

### 烘焙美食

| 檔名 | 物品 |
|------|------|
| `kb_sponge_cake.png` | 海綿蛋糕 |
| `kb_chocolate_cake.png` | 巧克力蛋糕 |
| `kb_strawberry_cream_cake.png` | 草莓鮮奶油蛋糕 |
| `kb_birthday_cake.png` | 生日蛋糕 |
| `kb_mint_chocolate_cake.png` | 薄荷巧克力蛋糕 |
| `kb_cheesecake.png` | 起司蛋糕 |
| `kb_matcha_chiffon.png` | 抹茶戚風蛋糕 |
| `kb_apple_pie.png` | 蘋果派 |
| `kb_blueberry_pie.png` | 藍莓派 |
| `kb_quiche.png` | 鹹派 |
| `kb_fish_pie.png` | 魚肉鹹派 |
| `kb_cake_slice.png` | 蛋糕切片 |
| `kb_honey_castella.png` | 蜂蜜蛋糕 |
| `kb_lemon_poppy_cake.png` | 檸檬罌粟籽蛋糕 |
| `kb_blueberry_muffin.png` | 藍莓瑪芬 |
| `kb_taiyaki.png` | 鯛魚燒 |
| `kb_savory_taiyaki.png` | 鹹味鯛魚燒 |
| `kb_toast_loaf.png` | 吐司 |
| `kb_toast_slice.png` | 吐司片 |
| `kb_french_toast.png` | 法式吐司 |
| `kb_baguette.png` | 法棍 |
| `kb_croissant.png` | 可頌 |
| `kb_cinnamon_roll.png` | 肉桂捲 |
| `kb_rosemary_focaccia.png` | 迷迭香佛卡夏 |
| `kb_pineapple_bun.png` | 菠蘿麵包 |
| `kb_poppy_seed_bagel.png` | 罌粟籽貝果 |
| `kb_donut.png` | 甜甜圈 |
| `kb_pancakes.png` | 鬆餅 |
| `kb_tart_shell.png` | 塔殼 |
| `kb_strawberry_tart.png` | 草莓塔 |
| `kb_lemon_tart.png` | 檸檬塔 |
| `kb_egg_tart.png` | 蛋塔 |
| `kb_butter_cookie.png` | 奶油餅乾 |
| `kb_chocolate_cookie.png` | 巧克力餅乾 |
| `kb_lavender_cookie.png` | 薰衣草餅乾 |
| `kb_scone.png` | 司康 |
| `kb_fa_gao.png` | 發糕 |
| `kb_sesame_ball.png` | 芝麻球 |
| `kb_sesame_mooncake.png` | 芝麻月餅 |
| `kb_burnt_food.png` | 焦黑的烘焙物 |

### 咖啡館飲品

| 檔名 | 物品 |
|------|------|
| `kb_espresso.png` | 濃縮咖啡 |
| `kb_americano.png` | 美式咖啡 |
| `kb_latte.png` | 拿鐵 |
| `kb_cappuccino.png` | 卡布奇諾 |
| `kb_mocha.png` | 摩卡 |
| `kb_caramel_macchiato.png` | 焦糖瑪奇朵 |
| `kb_cinnamon_latte.png` | 肉桂拿鐵 |
| `kb_pour_over_light.png` | 手沖咖啡（淺焙） |
| `kb_pour_over_medium.png` | 手沖咖啡（中焙） |
| `kb_pour_over_dark.png` | 手沖咖啡（深焙） |
| `kb_hot_cocoa.png` | 熱可可 |
| `kb_bubble_milk_tea.png` | 珍珠奶茶 |
| `kb_brown_sugar_pearl_milk.png` | 黑糖珍珠鮮奶 |
| `kb_pearl_black_tea_latte.png` | 珍珠紅茶拿鐵 |
| `kb_oolong_milk_foam.png` | 奶蓋烏龍 |
| `kb_lavender_milk_tea.png` | 薰衣草奶茶 |
| `kb_yuanyang.png` | 鴛鴦 |
| `kb_lemon_green_tea.png` | 檸檬綠茶 |
| `kb_lemon_black_tea.png` | 檸檬紅茶 |
| `kb_matcha_latte.png` | 抹茶拿鐵 |
| `kb_mint_mocha.png` | 薄荷摩卡 |
| `kb_iced_coffee.png` | 冰咖啡 |
| `kb_vanilla_milkshake.png` | 香草奶昔 |
| `kb_lemonade.png` | 檸檬水 |
| `kb_strawberry_milk.png` | 草莓牛奶 |
