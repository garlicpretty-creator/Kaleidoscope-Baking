# 萬花筒烘焙 Kaleidoscope Baking — 基岩版附加包

## 安裝
下載 `dist/Kaleidoscope_Baking.mcaddon`，雙擊即可匯入 Minecraft 基岩版（需 1.21.40 以上）。
建立世界時在「行為包」啟用 **萬花筒烘焙 行為包**（資源包會自動一起套用）。

## 內容

### 方塊（3D 模型）
| 方塊 | 功能 | 合成（工作台） |
|---|---|---|
| 烤箱 `kb:oven` | 烘焙工作站：右鍵打開，烤出所有甜點 | 磚塊×5 + 熔爐 + 鐵錠×3（`BBB / BFB / III`） |
| 攪拌碗 `kb:mixing_bowl` | 調理工作站：做麵團、鮮奶油、巧克力 | 黏土球×3（`C C / _C_`） |
| 烤盤 `kb:baking_tray` | 裝飾 | 鐵粒×5（`N N / NNN`） |

### 配方
| 工作站 | 材料 | 產物 |
|---|---|---|
| 工作台 | 小麥 | 麵粉 |
| 工作台 | 牛奶桶 | 奶油 ×2 |
| 攪拌碗 | 麵粉×2 + 雞蛋 | 麵團 ×2 |
| 攪拌碗 | 麵粉×2 + 糖 + 雞蛋 + 奶油 | 甜麵團 ×2 |
| 攪拌碗 | 牛奶桶 + 糖 | 打發鮮奶油 ×3 |
| 攪拌碗 | 可可豆×2 + 糖 + 奶油 | 巧克力磚 ×2 |
| 烤箱 | 麵團 | 吐司 ×2 |
| 烤箱 | 甜麵團 + 奶油 | 奶油餅乾 ×6 |
| 烤箱 | 麵團 + 奶油 | 可頌 ×2 |
| 烤箱 | 甜麵團 + 雞蛋 + 糖 | 蛋塔 ×3 |
| 烤箱 | 甜麵團 + 雞蛋 + 甜莓 | 馬卡龍 ×4 |
| 烤箱 | 雞蛋 + 牛奶桶 + 糖 + 碗 | 焦糖布丁（吃完還碗） |
| 烤箱 | 麵團 + 鮮奶油 + 雞蛋 | 泡芙 ×3 |
| 烤箱 | 甜麵團 + 糖 + 奶油 | 肉桂捲 ×3 |
| 烤箱 | 甜麵團 + 鮮奶油 + 甜莓×2 | 莓果蛋糕切片 ×4 |
| 烤箱 | 甜麵團 + 鮮奶油 + 巧克力磚 | 巧克力蛋糕切片 ×4 |

## 專案結構
```
bedrock/
├─ build.py                  # 一鍵產生所有 JSON / 材質 / 模型並打包 .mcaddon
├─ src/item_art.py           # 手繪備用圖示（16×16 字元格）+ 食物數值
├─ src/block_models.py       # 3D 方塊模型定義（cube 清單）
├─ tools/rd_generate.py      # 用 Retro Diffusion API 生成圖示
├─ art/rd/                   # Retro Diffusion 生成的候選圖（每個物品 2 張）
├─ art/icons/                # 選定使用的圖示（build.py 優先使用這裡）
├─ KaleidoscopeBaking_BP/    # 行為包（自動產生）
├─ KaleidoscopeBaking_RP/    # 資源包（自動產生）
└─ dist/Kaleidoscope_Baking.mcaddon
```

## 修改流程
- **改配方 / 名稱**：編輯 `build.py` 的 `RECIPES` / `ITEM_NAMES`，執行 `python bedrock/build.py`
- **換圖示**：
  ```bash
  RD_API_KEY=rdpk-xxxx python bedrock/tools/rd_generate.py macaron --n 4 --seed 99
  cp bedrock/art/rd/macaron_3.png bedrock/art/icons/macaron.png
  python bedrock/build.py
  ```
  使用 `rd_plus__mc_item`（MC Item）風格，16×16、自動去背；Studio 方案會從方案額度扣，不扣 balance。
- **在 Blockbench 精修 3D 模型**：`File > Open Model` 開啟
  `KaleidoscopeBaking_RP/models/blocks/oven.geo.json`，材質選 `textures/blocks/oven.png`。
  手動修改後若不想被 `build.py` 覆蓋，把該方塊從 `src/block_models.py` 移除，改為直接維護 Blockbench 匯出的檔案。

## 尚待遊戲內確認
本包僅以腳本產生，尚未在遊戲中實測，以下項目請進遊戲確認：
- 烤箱放置後正面是否朝向玩家（若相反，把 `build.py` 的 `y_rotation_offset` 改成 0）
- 自訂工作站的標題是否顯示中文名稱
