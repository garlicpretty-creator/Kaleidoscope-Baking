# Blockbench 3D 製作進修指南（Kaleidoscope-Baking 專用）

本指南針對 **Minecraft Java 版模組（Forge / NeoForge）** 的廚具方塊與甜點物品，
目標是做出風格與 Kaleidoscope Cookery 一致的模型（像素感、16x 材質、圓潤可愛）。

> ⚠️ Kaleidoscope Cookery 採 CC-BY-NC-SA-4.0 授權：可以「參考風格」，
> 但請不要直接複製其材質/模型檔。若真的要改作，需保留署名並同授權、非商業。

---

## 1. 先選對專案類型（最重要）

| 要做的東西 | Blockbench 專案類型 | 原因 |
|---|---|---|
| 靜態廚具方塊（攪拌碗、冷卻架、烤盤） | **Java Block/Item** | 直接輸出 `.json`，遊戲原生讀取 |
| 手持物品 3D 外觀（擀麵棍、打蛋器） | **Java Block/Item** | 同上，額外調整 Display |
| 有動畫的方塊（烤箱門開關、攪拌機旋轉） | **GeckoLib Animated Model**（需外掛）或 **Modded Entity** | Java Block 模型不支援動畫 |
| 平面甜點物品（餅乾、馬卡龍） | 不需要 3D，直接畫 16×16 PNG | 見 `icon-generation.md` |

### Java Block/Item 的硬性限制（新手最常踩雷）
- 方塊座標範圍 **-16 ～ 32**（也就是最多 3×3×3 格大）。
- 每個 cube 只能沿 **單一軸** 旋轉，角度只能是 **-45 / -22.5 / 0 / 22.5 / 45**。
- 不能有真正的圓柱：用 **多個 cube 疊出八角形/十二角形** 來假裝圓形（碗、蛋糕模都這樣做）。
- UV 預設是 16 單位；材質建議 **16×16 或 32×32**，同一模組內像素密度要一致。

---

## 2. 四週學習路線

### 第 1 週：介面與基本操作
- [ ] 安裝 Blockbench（桌面版）→ `File > Plugins` 安裝 **GeckoLib Animation Utils**（之後做烤箱動畫用）
- [ ] 熟悉快捷鍵：`Ctrl+D` 複製、`Shift` 拖曳吸附、`Numpad` 切視角、`G/R/S` 移動旋轉縮放
- [ ] 理解 **Outliner**（群組/骨架）、**Pivot Point**（旋轉中心）
- 練習：做一個 **擀麵棍**（1 根長 cube + 兩端把手），約 30 分鐘

### 第 2 週：UV 與材質繪製
- [ ] `Texture > Create Texture` 使用 **Per-face UV / Box UV** 自動排版
- [ ] 在 Blockbench 內建 Paint 模式上色；或匯出 PNG 用 Aseprite / LibreSprite 修
- [ ] 學會 **陰影規則**：頂面最亮、側面中等、底面最暗；每種材質 3～5 色即可
- 練習：做 **攪拌碗**（12 邊形碗身 + 內部空心），畫上陶瓷材質

### 第 3 週：Display 與遊戲內測試
- [ ] `Display` 分頁調整 第一人稱 / 第三人稱 / GUI / 地面 / 物品展示框 的角度與縮放
- [ ] GUI 視角是 **物品欄圖示** 的來源（若不另外畫 2D 圖示）
- [ ] 匯出 `File > Export > Export Block/Item Model` 放到：
  ```
  src/main/resources/assets/kaleidoscope_baking/models/block/<name>.json
  src/main/resources/assets/kaleidoscope_baking/textures/block/<name>.png
  ```
- [ ] 注意 json 裡的 texture 路徑要改成 `kaleidoscope_baking:block/<name>`
- 練習：做 **烤盤**，放進遊戲測試在桌上的視覺

### 第 4 週：動畫（GeckoLib）
- [ ] 新建 GeckoLib Animated Model，把烤箱門獨立成一個 bone，pivot 放在門軸
- [ ] Animate 分頁做 `open`（0.3 秒旋轉 -90°）、`close`、`baking`（火光閃爍可用材質動畫）
- [ ] 匯出 `.geo.json` + `.animation.json`
- 練習：完成 **烤箱**（本模組主角方塊）

---

## 3. 本模組建議模型清單

| 優先 | 名稱 | 類型 | 大小建議 | 備註 |
|---|---|---|---|---|
| ★★★ | 烤箱 Oven | GeckoLib 方塊 | 1×1×1 格 | 門可開關、內部發光 |
| ★★★ | 攪拌碗 Mixing Bowl | Java Block | 10×5×10 px | 內容物用另一個 cube 換材質顯示 |
| ★★☆ | 烤盤 Baking Tray | Java Block | 14×1×10 px | 上面可擺餅乾 |
| ★★☆ | 蛋糕模 Cake Mold | Java Block | 10×6×10 px | 圓形用 8～12 邊形 |
| ★★☆ | 擀麵棍 Rolling Pin | Java Item | 長 14 px | 主要調 Display |
| ★☆☆ | 打蛋器 Whisk | Java Item | — | 鋼絲用細 cube 交叉 |
| ★☆☆ | 冷卻架 Cooling Rack | Java Block | 14×2×14 px | 網格用材質透明度做 |
| ★☆☆ | 擠花袋 Piping Bag | Java Item | — | |

放置型甜點（整個蛋糕可切片）可用 **多個 blockstate 模型**：`cake_slices_0..3.json`。

---

## 4. 風格一致性檢查表
- [ ] 圓角感：邊緣用小 cube 做斜面，不要大面積硬直角
- [ ] 色票：全模組共用一份調色盤（見 `icon-generation.md` 第 3 節）
- [ ] 像素密度：16 單位 = 16 px，不要某個模型突然用 64×64 材質
- [ ] 每個 cube 都要有材質，不要留下 Blockbench 預設灰
- [ ] 檢查 `Culling`：貼地的底面可設 cullface 提升效能

## 5. 參考資源
- Blockbench 官方 Wiki：<https://www.blockbench.net/wiki>
- Blockbench Quickstart（內建 `Help > Quickstart`）
- GeckoLib Wiki：<https://github.com/bernie-g/geckolib/wiki>
- Minecraft Wiki – Model 格式：<https://minecraft.wiki/w/Tutorials/Models>
