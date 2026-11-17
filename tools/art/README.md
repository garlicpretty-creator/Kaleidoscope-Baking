# tools/art — 方塊模型、方塊貼圖與物品圖示

```sh
python tools/art/build_models.py     # 站點 / 甜點 / 植物 / 烤箱：寫 RP/models/blocks 與 RP/textures/blocks，並跑 z-fight 稽核
python tools/art/check_refs.py       # 每個方塊的 geometry、貼圖都找得到，所有 UV 都在貼圖範圍內
python tools/art/rd_icons.py apply   # 把選定的 Retro Diffusion 圖示寫進 RP/textures/items
```

`tools/gen_content.py` 會先執行 `build_models.py`，稽核失敗就停止；它不會用暫代圖蓋掉這裡畫的檔案。

| 檔案 | 內容 |
|------|------|
| `kit.py` | 共用工具：材質圖集、方塊（世界座標投影 UV，相鄰方塊紋理無縫）、圓盤分層、被貼住的面自動不畫、z-fight 稽核 |
| `stations.py` | 攪拌盆、發酵籃、裱花台、咖啡機、手沖架、雪克杯、香草盆栽 |
| `drinks.py` | 放在地上的馬克杯咖啡：1–4 杯的擺法（共用模型）與每種咖啡的杯面 |
| `desserts.py` | 11 種可擺放甜點 × 4 種剩餘片數；切面依高度畫出內層，奶油擠花、派皮捏邊，裝飾跟著所在那片一起被吃掉 |
| `plants.py`, `paint_lib.py` | 作物 / 灌木各生長階段、樹苗、樹葉、肉桂原木（`paint_lib.py` 取自豐收的植物繪製工具） |
| `oven.py` | 烤箱 3×3×3 的六種面貼圖 |
| `rd_icons.py`, `icon_prompts.json` | 物品圖示（Retro Diffusion，金鑰只從環境變數讀） |

## 不閃爍的規則

- 所有方塊材質用 `alpha_test_single_sided`：每個面只從正面畫，平面的兩面、互相貼住的兩個面不會互搶深度。
  （原本的 `alpha_test` 是雙面的；交叉植物模型同一平面上的 north / south 兩面因此會閃。）
- 同一層的圓形由不重疊的矩形拼成；被另一個方塊完全貼住的面直接不輸出。
- `kit.audit()` 檢查所有可見面：同方向、同一平面（或相距 < 0.06 像素）又互相重疊就算錯誤。
- 玻璃（手沖壺）只用全透明 / 全不透明像素，不用 `blend`，避免半透明排序閃爍。

## 在 Blockbench 檢視

Blockbench 預設把面畫成雙面，看起來會比遊戲多出背面；檢視時把材質設為單面（`THREE.FrontSide`）才和遊戲一致。
預覽圖：`art/previews/stations.png`、`art/previews/desserts.png`、`art/previews/drinks.png`（Blockbench 單面渲染）、`art/previews/plants.png`、`art/previews/oven.png`。

## Bedrock 的 x 軸鏡像

方塊 geometry 的 x 軸與世界相反（世界 x = −json x），所以 json 裡的 `east` 面位於方塊 json-x 較小的一側。
`kit.py` 的 `NORMAL` 與 UV 方向都依此設定；Blockbench 匯入時也是這樣顯示的。
