# Retro Diffusion 圖示生成指南

使用 [Retro Diffusion](https://retrodiffusion.ai/app) 產生本模組的物品欄圖示（16×16 像素）。

> 💡 `https://retrodiffusion.ai/app/balance` 是 **點數餘額 / 儲值頁面**。
> 每次生成都會扣點，建議先用便宜的模型與小尺寸試 prompt，滿意後再用高品質模型出正式圖。

---

## 1. 建議生成設定

| 設定 | 建議值 | 說明 |
|---|---|---|
| 尺寸 | **32×32**（或 64×64）生成 → 縮成 16×16 | 直接生 16×16 細節常會糊；用本 repo 的腳本縮圖 |
| 風格 | 選「item / game asset / icon」類風格 | 讓物件置中、單一物體 |
| 背景 | 勾選 **Remove background / Transparent** | 若沒有此選項，prompt 寫 `plain white background`，再用腳本去背 |
| 調色盤 | 上傳本模組調色盤（見第 3 節） | 保持所有圖示色調統一 |
| Seed | 同一系列固定 seed | 例如所有蛋糕用同一 seed，換口味只改 prompt |
| 數量 | 一次 4 張挑最好的 | 比反覆單張省點數 |

## 2. Prompt 範本

```
<物品英文名>, minecraft style item icon, cute, soft rounded shapes,
3/4 top-down view, centered, single object, clean dark outline,
limited palette, <主要顏色描述>
```

- Retro Diffusion 對 **英文** prompt 效果最好。
- 保持短而具體：形狀 + 顏色 + 視角。
- 不要寫 `text`, `logo`, `multiple objects`。

### 本模組圖示清單（可直接複製）

#### 甜點 Desserts
| ID | 中文 | Prompt 主體 |
|---|---|---|
| `strawberry_cake_slice` | 草莓蛋糕切片 | `slice of strawberry shortcake, white cream layers, red strawberry on top` |
| `chocolate_cake_slice` | 巧克力蛋糕切片 | `slice of chocolate cake, dark brown layers, glossy ganache top` |
| `cookie` | 奶油餅乾 | `round butter cookie, golden brown, chocolate chips` |
| `croissant` | 可頌 | `golden flaky croissant, crescent shape, shiny glaze` |
| `egg_tart` | 蛋塔 | `portuguese egg tart, yellow custard with caramelized brown spots, flaky crust` |
| `macaron` | 馬卡龍 | `pink macaron, cream filling, side view` |
| `pudding` | 布丁 | `caramel custard pudding, wobbly yellow, brown caramel on top, on small plate` |
| `cream_puff` | 泡芙 | `cream puff choux pastry, powdered sugar dusting` |
| `cinnamon_roll` | 肉桂捲 | `cinnamon roll spiral, white icing drizzle` |
| `toast_bread` | 吐司 | `loaf of white bread, golden crust, square top` |

#### 食材 Ingredients
| ID | 中文 | Prompt 主體 |
|---|---|---|
| `flour` | 麵粉 | `small cloth sack of flour, white powder spilling` |
| `butter` | 奶油 | `block of butter, pale yellow, wrapped paper half open` |
| `whipped_cream` | 鮮奶油 | `bowl of whipped cream, white swirl peak` |
| `dough` | 麵團 | `ball of bread dough, soft beige, slightly floury` |
| `powdered_sugar` | 糖粉 | `small jar of powdered sugar, white` |
| `chocolate_bar` | 巧克力磚 | `chocolate bar, partially unwrapped, brown squares` |
| `yeast` | 酵母 | `small packet of yeast, beige paper` |

#### 廚具 Kitchenware（物品欄用）
| ID | 中文 | Prompt 主體 |
|---|---|---|
| `rolling_pin` | 擀麵棍 | `wooden rolling pin, diagonal, light wood` |
| `whisk` | 打蛋器 | `metal balloon whisk, diagonal, silver wires, wooden handle` |
| `piping_bag` | 擠花袋 | `piping bag with metal nozzle, white cream` |
| `mixing_bowl` | 攪拌碗 | `ceramic mixing bowl, light blue` |
| `baking_tray` | 烤盤 | `metal baking tray, dark grey, rectangular` |
| `cake_mold` | 蛋糕模 | `round metal cake pan, silver` |

> 3D 廚具方塊若已在 Blockbench 做好，也可以直接用 Blockbench 的 GUI Display 當圖示，
> 不一定要另外生成；生成圖示主要給「純物品」用。

## 3. 統一調色盤（建議）

在 Retro Diffusion 上傳一張調色盤 PNG（每色 1px 一列即可），或在 prompt 描述主色。
建議暖色烘焙系：

| 用途 | 色碼 |
|---|---|
| 外框 | `#3b2a26` |
| 麵包深 | `#8a4b2a` |
| 麵包中 | `#c9803f` |
| 麵包亮 | `#f0c27a` |
| 奶油 | `#fff4dc` |
| 草莓 | `#d9415a` |
| 巧克力 | `#5a3326` |
| 金屬 | `#9aa4b0` |

## 4. 後製流程

生成後把原圖放到 `art/raw/`，執行：

```bash
pip install pillow
python tools/process_icons.py art/raw src/main/resources/assets/kaleidoscope_baking/textures/item --size 16
```

腳本會：
1. 去除近白/純色背景（若原圖不透明）
2. 裁掉空白邊界並置中
3. 以 **最近鄰插值** 縮到 16×16（保持像素銳利）
4. 移除半透明像素（Minecraft 物品材質建議只用全透明或全不透明）

縮完務必用 Aseprite / Blockbench 開來 **手修 1～2 分鐘**：補外框、清掉雜點。AI 圖幾乎都需要這一步。
