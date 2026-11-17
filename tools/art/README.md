# tools/art — 方塊模型、方塊貼圖與物品圖示

```sh
python tools/art/build_models.py     # 站點 / 甜點 / 植物 / 烤箱：寫 RP/models/blocks 與 RP/textures/blocks，並跑 z-fight 稽核
python tools/art/check_refs.py       # 每個方塊的 geometry、貼圖都找得到，所有 UV 都在貼圖範圍內
python tools/art/rd_icons.py apply   # 把選定的 Retro Diffusion 圖示寫進 RP/textures/items
```

`tools/gen_content.py` 會先執行 `build_models.py`，稽核失敗就停止；它不會用暫代圖蓋掉這裡畫的檔案。

| 檔案 | 內容 |
|------|------|
| `kit.py` | 共用工具：每面獨立貼圖區域的繪製模型（`Painted`）、被貼住的面自動不畫、z-fight 稽核 |
| `stations.py` | 攪拌盆、發酵籃、裱花台、咖啡機、手沖架、雪克杯、香草盆栽 |
| `drinks.py` | 放在地上的馬克杯咖啡：1–4 杯的擺法（共用模型）與每種咖啡的杯面 |
| `desserts.py` | 11 種可擺放甜點 × 4 種剩餘片數；每片一個方塊，切面內層、擠花、捏邊都是畫的，草莓 / 蠟燭跟著那片一起被吃掉 |
| `plants.py`, `paint_lib.py` | 作物 / 灌木各生長階段、樹苗、樹葉、肉桂原木（`paint_lib.py` 取自豐收的植物繪製工具） |
| `oven.py` | 烤箱 3×3×3 的六種面貼圖 |
| `rd_icons.py`, `icon_prompts.json` | 物品圖示（Retro Diffusion，金鑰只從環境變數讀） |

## 美術標準：少面數、貼圖精緻（對齊森羅廚房）

- 形狀用少量方塊，細節畫在貼圖上。參考森羅廚房：一般模型中位數 8 個方塊，九成不超過 15 個；四杯茶組 13–21 個。
- 目前：站點 5–15 個方塊（香草盆栽 5、咖啡機 15）；甜點每片 1 個方塊，整顆 4–12 個；四杯馬克杯 12 個（每杯碟子、杯身、把手）。
  `python tools/art/build_models.py` 會列出每個模型的方塊數與面數。
- 貼圖是每個面一塊獨立區域（`kit.Painted`），一個模型像素對一個貼圖像素；畫筆依世界座標上色，邊緣自動加亮 / 加暗，
  所以奶油擠花、派皮捏邊、格子派皮、切面內層、玻璃壺、藤編紋路都是畫的，不是方塊。
- 同一甜點的 4 種片數、同一套馬克杯的 1–4 杯共用一張貼圖。

## 沉浸式動畫（`visuals.py` + `BP/scripts/utils/visuals.js`）

做法同森羅廚房的石磨：每個站點上有一個沒有碰撞的視覺實體 `kaleidoscope_baking:station_visual`，腳本設定實體屬性，
客戶端播放動畫。不顯示文字，看得到裡面有什麼、正在做什麼：

| 站點 | 看得到 | 動作 |
|---|---|---|
| 攪拌盆 | 麵糊隨加入的材料升高，顏色跟著材料（可可→巧克力、抹茶→綠…） | 打蛋時打蛋器繞圈、麵糊旋轉 |
| 發酵籃 | 麵團 | 發酵中慢慢膨脹、微微起伏 |
| 裱花台 | 蛋糕一層層疊高 | 在轉台上慢慢轉 |
| 咖啡機 | 完成時杯裡出現咖啡油脂 | 萃取時咖啡從沖煮頭流下、冒蒸氣 |
| 手沖架 | 玻璃壺裡的咖啡 | 沖水後咖啡從濾杯滴下、壺內水位上升 |
| 雪克杯 | 雪克杯本身 | 每搖一次就晃動 |
| 烤箱 | 爐門（中間前面那格）；門後是爐口：暗處的暖光與烤盤 | 放入 / 取出時爐門打開再關上；烘烤中門上小窗發光閃動；烤好時冒蒸氣 |

方塊本身：烤箱燃燒中的火口是 4 格動態貼圖（`flipbook_textures.json`），放在地上的馬克杯咖啡會不時冒蒸氣（`kaleidoscope_baking:steam`）。
實體屬性：`kind`（站點種類，7 = 烤箱爐門）、`fill`（0 隱藏內容物）、`tint`（內容物顏色 0–7）、`progress`（發酵 / 萃取進度；爐門為是否在烤）、`active`（動作播放中；爐門為打開）、`pop`（加入材料時內容物彈一下）。

其他：加材料進攪拌盆、發酵籃、裱花台時內容物會彈一下；吃或切蛋糕 / 派時會噴出該甜點顏色的碎屑（`kaleidoscope_baking:crumbs`）。

## 不閃爍的規則

- 所有方塊材質用 `alpha_test_single_sided`：每個面只從正面畫，平面的兩面、互相貼住的兩個面不會互搶深度。
  （原本的 `alpha_test` 是雙面的；交叉植物模型同一平面上的 north / south 兩面因此會閃。）
- 被另一個方塊完全貼住的面直接不輸出。
- `kit.audit()` 檢查所有可見面：同方向、同一平面（或相距 < 0.06 像素）又互相重疊就算錯誤。
- 玻璃（手沖壺）只用全透明 / 全不透明像素，不用 `blend`，避免半透明排序閃爍。

## 在 Blockbench 檢視

Blockbench 預設把面畫成雙面，看起來會比遊戲多出背面；檢視時把材質設為單面（`THREE.FrontSide`）才和遊戲一致。
預覽圖：`art/previews/stations.png`、`art/previews/desserts.png`、`art/previews/drinks.png`（Blockbench 單面渲染）、`art/previews/plants.png`、`art/previews/oven.png`。

## Bedrock 的 x 軸鏡像

方塊 geometry 的 x 軸與世界相反（世界 x = −json x），所以 json 裡的 `east` 面位於方塊 json-x 較小的一側。
`kit.py` 的 `NORMAL` 與 UV 方向都依此設定；Blockbench 匯入時也是這樣顯示的。
