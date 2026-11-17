# 美術資源清單（給美術）

目前所有貼圖都是 `tools/gen_placeholder_art.py` 自動畫的**暫代圖**。
請直接用**同檔名**覆蓋 `RP/textures/` 底下的 PNG 即可，不需要改任何 JSON 或程式。

- 暫代圖產生器只會補「缺少的檔案」，不會覆蓋你放進來的正式圖（除非加 `--force`）。
- 方塊貼圖、物品圖示目前都是 **16×16**；要做更高解析度（例如 32×32）可以，但同一類請統一尺寸。
- `pack_icon.png` 為 64×64（BP、RP 各一張，可用同一張）。

## 方塊貼圖 `RP/textures/blocks/`

### 烤箱（3×3×3 大型方塊）

烤箱由 27 個方塊組成，每格都是一般的完整方塊，所以每張貼圖都是**一格的一個面**。
正面（面向放置烤箱的玩家）中間一排是爐門，最下排中間是火口。

```
正面（9 格）            頂面（9 格）
┌──────┬──────┬──────┐   ┌──────┬──────┬──────┐
│ brick│ brick│ brick│   │ top  │ top  │ top  │
├──────┼──────┼──────┤   ├──────┼──────┼──────┤
│ brick│ door │ brick│   │ top  │chimny│ top  │
├──────┼──────┼──────┤   ├──────┼──────┼──────┤
│ brick│firebx│ brick│   │ top  │ top  │ top  │
└──────┴──────┴──────┘   └──────┴──────┴──────┘
```

| 檔名 | 用途 |
|------|------|
| `kb_oven_brick.png` | 烤箱外牆（側面、背面、正面四角） |
| `kb_oven_top.png` | 烤箱頂面 |
| `kb_oven_chimney.png` | 頂面正中央的煙囪口 |
| `kb_oven_door.png` | 正面中央：爐門（可帶玻璃窗） |
| `kb_oven_firebox.png` | 正面下方：火口（熄火） |
| `kb_oven_firebox_lit.png` | 正面下方：火口（燃燒中，會發光） |

> 日後若想要「一整張大圖」或立體模型（例如圓頂麵包窯），需要改成實體模型或拆分幾何，請先和程式討論。

### 攪拌盆

| 檔名 | 用途 |
|------|------|
| `kb_mixing_bowl.png` | 攪拌盆模型貼圖（模型：`RP/models/blocks/mixing_bowl.geo.json`，每個面都使用整張 16×16） |

## 物品圖示 `RP/textures/items/`

| 檔名 | 物品 |
|------|------|
| `kb_oven.png` | 烤箱 |
| `kb_mixing_bowl.png` | 攪拌盆 |
| `kb_whisk.png` | 打蛋器 |
| `kb_cake_mold.png` | 蛋糕模 |
| `kb_loaf_pan.png` | 吐司模 |
| `kb_baking_tray.png` | 烤盤 |
| `kb_butter.png` | 奶油 |
| `kb_cake_batter.png` | 蛋糕麵糊 |
| `kb_bread_dough.png` | 吐司麵團 |
| `kb_cookie_dough.png` | 餅乾麵團 |
| `kb_sponge_cake.png` | 海綿蛋糕 |
| `kb_toast_loaf.png` | 吐司（整條） |
| `kb_toast_slice.png` | 吐司片 |
| `kb_butter_cookie.png` | 奶油餅乾 |
| `kb_burnt_food.png` | 焦黑的烘焙物 |
