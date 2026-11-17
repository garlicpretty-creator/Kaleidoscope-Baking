# 森羅物語：烘焙（Kaleidoscope Baking）企劃書

> 版本：草案 v0.1　｜　日期：2026-11-17
> 對應本體：森羅物語：廚房（Kaleidoscope Cookery）Bedrock 版 v1.6.6
> 命名空間：`kaleidoscope_baking`（腳本簡寫 `kb`）

---

## 1. 專案概述

**森羅物語：烘焙** 是森羅物語系列的擴充模組，在「廚房」本體上加入完整的烘焙玩法：揉麵、發酵、烤製、裝飾與擺盤，並帶來一系列烘焙廚具與甜點、麵包。

本企劃有三個核心目標：

| # | 目標 | 說明 |
|---|------|------|
| 1 | **依賴廚房本體** | 以廚房為宿主（HOST），沿用其熱源、麵粉、麵團、食譜書、擺放食物等系統，不重造輪子。 |
| 2 | **開放 API** | 烘焙本身也成為「烘焙宿主」，讓其他模組能註冊烤箱食譜、模具、配料、裝飾等，且不需修改烘焙原始碼。 |
| 3 | **系列互通** | 與 **漁歌**、**豐收**、**草本** 三個模組的所有食材與成品雙向互通——他們的東西能進烘焙，烘焙的成品也能進他們的系統。 |

### 1.1 設計原則（沿用廚房 ARCHITECTURE.md 的公開門規則）

1. **宿主不寫死附加模組 ID**：烘焙核心程式碼不得出現 `漁歌/豐收/草本` 的物品 ID；相容資料一律放在獨立的 `compat/` 資料檔。
2. **只走公開門**：與廚房溝通只用 Script Event API 與物品標籤，**絕不 import 廚房的 `scripts/` 私有檔案**。
3. **冪等註冊、不持久化**：所有註冊每次載入世界重送；移除某模組後，其內容於下次載入自動消失。
4. **能力檢查優先於版本號**：依 `api_ready` 回傳的 `capabilities` 決定要啟用哪些整合。
5. **不默默刪除玩家物品**：所有站點的拆除、重裝、遺失恢復都要保證物品不消失。

---

## 2. 依賴與相容版本

### 2.1 manifest 依賴

使用者要求**硬依賴**廚房本體，因此 BP manifest 加入廚房的包 UUID（沒有廚房時遊戲會拒絕啟用烘焙）：

```jsonc
// Kaleidoscope Baking [BP]/manifest.json（節錄）
"dependencies": [
  { "uuid": "9944f731-cc4c-4299-bdd5-f8799c1d832e", "version": [1, 6, 6] }, // 廚房 BP
  { "uuid": "<烘焙 RP UUID>", "version": [1, 0, 0] },
  { "module_name": "@minecraft/server",    "version": "2.7.0" },
  { "module_name": "@minecraft/server-ui", "version": "2.0.0" }
]
// min_engine_version: [1, 26, 1]（與廚房一致）
```

> 廚房 RP UUID 為 `1bf09f60-7e0f-450c-9e09-81850b40db4d`；烘焙 RP 可選擇依賴它以共用貼圖（例如麵粉、麵團圖示）。

**注意**：廚房官方文件建議相容包「不要」硬依賴 UUID，以免廚房改 UUID 後失效。烘焙因為大量使用廚房物品（麵粉、麵團、油、熱源方塊），硬依賴是合理的；但**執行期仍完全走 Script Event API**，所以即使廚房日後改 UUID，只需改 manifest 一行即可。

### 2.2 會用到的廚房能力（capabilities）

| 廚房能力 | 烘焙用途 |
|---------|---------|
| `millstone` | 研磨：可可豆→可可粉、糖→糖粉、堅果→堅果粉、燕麥→燕麥粉 |
| `chopping_board` / `chopping_board_tool` | 切蛋糕、切麵包片；用 **擀麵棍** 當工具擀派皮 |
| `steamer` | 中式糕點：發糕、馬拉糕、蒸蛋糕 |
| `stockpot_exact` / `stockpot_flex` | 熬煮卡士達、焦糖、果醬、巧克力醬 |
| `wok` | 法式吐司、可麗餅（平底）、煎餅 |
| `teapot` | 下午茶搭配：奶茶麵包用茶湯、花草茶 |
| `bamboo_tray` | 曬果乾（葡萄乾、蔓越莓乾）、乾燥香草 |
| `oil_containers` | 奶油罐 / 酥油罐註冊為油源，可供炒鍋使用 |
| `stockpot_base_containers` | 牛奶桶、鮮奶油桶作為湯鍋基底 |
| `display_rules` | 蛋糕、麵包在餐桌 / 果籃上的顯示模式 |
| `placeable_food_tag` | 蛋糕、派、麵包籃加入「潛行才能放置食物」設定 |
| `kitchen_knife_tag` | 烘焙用的蛋糕刀、麵包刀被廚房砧板認可 |
| `guidebook_extensions` | 在廚房食譜書加入「烘焙」分頁 |
| 熱源標籤 `kaleidoscope_cookery:heat_sources` | 烤箱底下可放廚房爐灶等熱源；烘焙自己的熱源方塊也打上此標籤 |

---

## 3. 核心玩法

### 3.1 烘焙流程

```
  [研磨]        [混合]          [發酵]          [塑形]          [烘烤]         [裝飾/擺盤]
 石磨(廚房) → 攪拌盆(烘焙) → 發酵籃(烘焙) → 砧板+擀麵棍 → 烤箱(烘焙) → 裱花台(烘焙)
  麵粉/糖粉    麵團/麵糊      時間+溫度       切模/模具       火候控制      奶油/水果/糖霜
```

- **攪拌盆（Mixing Bowl）**：放入最多 9 種材料，手持打蛋器右鍵攪拌 N 次，產出麵團／麵糊／奶油霜。可接受「食材標籤」（見第 5 節），例如任一「`kaleidoscope:fruit`」。
- **發酵籃（Proofing Basket）**：麵團需靜置一段時間；溫暖生態域或旁邊有熱源時加速，寒冷時減慢。
- **烤箱（Oven）**：
  - 下方需熱源（共用廚房熱源規則），或使用烘焙自己的「磚窯烤爐」自帶燃料槽。
  - **火候三段**：未熟 → 完美 → 焦黑；在完美區間取出得到正常成品，焦黑得到「焦糊麵包」（類似廚房的黑暗料理）。
  - 支援 **模具（Mold）**：蛋糕模、吐司模、派盤、瑪德蓮模、鯛魚燒模，模具決定成品外形；模具可被其他模組註冊。
- **裱花台（Decorating Stand）**：把烤好的蛋糕胚放上去，依序加奶油霜、水果、糖霜，完成可擺放的整顆蛋糕。
- **可擺放食物**：整顆蛋糕、派、麵包籃可放在地上 / 餐桌，多次食用（沿用廚房的 placeable food 規則：剩餘容器以掉落物方式生成在方塊位置）。

### 3.2 新增方塊 / 工具（第一版）

| 類別 | 名稱 | ID 草案 |
|------|------|---------|
| 站點 | 烤箱、磚窯烤爐 | `kaleidoscope_baking:oven`、`:brick_oven` |
| 站點 | 攪拌盆 | `:mixing_bowl` |
| 站點 | 發酵籃 | `:proofing_basket` |
| 站點 | 裱花台 / 蛋糕架 | `:decorating_stand`、`:cake_stand` |
| 工具 | 打蛋器、擀麵棍、麵包刀、蛋糕刀、擠花袋 | `:whisk`、`:rolling_pin`、`:bread_knife`、`:cake_knife`、`:piping_bag` |
| 模具 | 蛋糕模、吐司模、派盤、瑪德蓮模、鯛魚燒模、餅乾切模 | `:mold/cake` 等 |
| 容器 | 烤盤、奶油罐、鮮奶油桶 | `:baking_tray`、`:butter_jar`、`:cream_bucket` |
| 裝飾 | 麵包展示櫃、甜點櫥窗 | `:bread_display`、`:pastry_case` |

麵包刀、蛋糕刀打上 `kaleidoscope_cookery:kitchen_knife` 標籤，可直接在廚房砧板使用。

### 3.3 食材與成品（第一版約 40 道）

- **基礎材料**：奶油、鮮奶油、起司、糖粉、可可粉、酵母、泡打粉、派皮、千層酥皮、卡士達、焦糖、果醬。
- **麵包**：吐司、法棍、可頌、菠蘿麵包、奶油餐包、肉桂捲、佛卡夏。
- **蛋糕**：海綿蛋糕、巧克力蛋糕、草莓鮮奶油蛋糕、起司蛋糕、蜂蜜蛋糕、生日蛋糕（可插蠟燭）。
- **派 / 塔**：蘋果派、南瓜派、甜莓塔、蛋塔、鹹派。
- **小點心**：餅乾（可自訂糖霜顏色）、瑪德蓮、司康、甜甜圈、鯛魚燒。
- **中式糕點（與廚房呼應）**：月餅、蛋黃酥、鳳梨酥、發糕（蒸籠）。

所有可擺放成品加上 `kaleidoscope_cookery:placeable_food` 標籤；所有成品加上第 5 節的通用食材標籤，讓其他模組能把它們當原料。

---

## 4. 烘焙開放 API（Kaleidoscope Baking API v1）

烘焙採用與廚房相同的 **Script Event 訊息匯流排** 設計，讓其他模組能在不 import、不改原始碼、不硬依賴烘焙的情況下擴充烘焙。

### 4.1 事件一覽

| 事件 ID | 方向 | 用途 |
|---------|------|------|
| `kaleidoscope_baking:api_ping` | 外部 → 烘焙 | 要求烘焙回送 ready |
| `kaleidoscope_baking:api_ready` | 烘焙 → 外部 | `{api:1, capabilities:[...], ingredientApi:1}` |
| `kaleidoscope_baking:register_recipe` | 外部 → 烘焙 | 註冊烘焙站食譜（一則訊息一個食譜） |
| `kaleidoscope_baking:register_mold` | 外部 → 烘焙 | 註冊新模具 |
| `kaleidoscope_baking:register_topping` | 外部 → 烘焙 | 註冊裱花台可用的配料 / 裝飾 |
| `kaleidoscope_baking:register_ingredient` | 外部 → 烘焙 | 為**無法加標籤的物品**（原版、他人物品）註冊食材分類 |
| `kaleidoscope_baking:register_fuel` | 外部 → 烘焙 | 磚窯烤爐燃料（燃燒時間、溫度） |
| `kaleidoscope_baking:query_ingredient` | 外部 → 烘焙 | 查詢某物品屬於哪些食材分類 |
| `kaleidoscope_baking:ingredient_info` | 烘焙 → 外部 | `query_ingredient` 的回覆 |
| `kaleidoscope_baking:bulk_begin` / `bulk_chunk` / `bulk_end` | 外部 → 烘焙 | 大量資料分塊傳送（Script Event 單則上限 2048 字元） |

### 4.2 食譜種類（`kind`）

| kind | 站點 | 主要欄位 |
|------|------|---------|
| `mixing_bowl` | 攪拌盆 | `ingredients`（最多 9 槽，每槽可為 ID / 陣列 / `#標籤`）、`whisks`、`result`、`count` |
| `proofing` | 發酵籃 | `input`、`result`、`time`、`warmBonus` |
| `oven` | 烤箱 | `input`（或 `ingredients`）、`mold`、`result`、`time`、`perfectWindow`、`burntResult` |
| `decorating` | 裱花台 | `base`、`layers`（配料序列）、`result` |
| `oven_tray` | 烤盤（一次多份小點心） | `input`、`result`、`perTray`、`time` |

範例：

```js
system.sendScriptEvent("kaleidoscope_baking:register_recipe", JSON.stringify({
  api: 1,
  source: "my_addon",
  kind: "oven",
  recipe: {
    id: "my_addon:oven/herb_focaccia",
    ingredients: ["kaleidoscope_baking:raw_focaccia_dough", "#kaleidoscope:herb"],
    mold: "kaleidoscope_baking:baking_tray",
    result: "my_addon:herb_focaccia",
    count: 1,
    time: 400,             // ticks
    perfectWindow: 120,    // 完美火候持續 ticks
    burntResult: "kaleidoscope_baking:burnt_bread"
  }
}));
```

### 4.3 契約規則

- **API 版本** `1`；破壞性改動必須升版，不靜默修改 v1。
- **內建優先**：烘焙內建食譜永遠優先於擴充食譜；擴充食譜存在獨立 Map，不會改寫內建資料。
- **冪等**：以 `kind + source + recipe.id` 為鍵，重送即覆蓋。
- **排序決定性**：多個模組的食譜依註冊鍵排序，不受載入順序影響。
- **不持久化**：每次世界載入重新註冊。
- **驗證失敗即拒絕**：ID 必須為 `namespace:id` 格式；不合法時寫一行 content log 警告，不影響其他資料。
- **快取合併**：同一 tick 的大量註冊只在下一 tick 重建一次查找快取（沿用廚房避免 watchdog 的做法）。
- **食譜書**：擴充食譜可附帶 `guide` 欄位，烘焙會自動轉送到廚房食譜書的「烘焙」分頁，擴充模組不需自己處理食譜書分塊協定。

### 4.4 API 文件交付

- `documentation/KB_EXTENSION_API.md`（事件與 schema）
- `documentation/KB_INGREDIENT_TAGS.md`（通用食材標籤表）
- `documentation/examples/minimal_compat_addon/`（可直接複製的最小相容包）

---

## 5. 系列互通設計：漁歌、豐收、草本

### 5.1 問題

Bedrock 的世界 / 實體動態屬性是**以內容包為範圍**，不能跨包共享；腳本也不該互相 import。若每兩個模組都要寫一份對接程式，四個模組就需要 6 組雙向對接，日後再加模組會越來越難維護。

### 5.2 解法：共用「森羅食材標籤」＋ 每個模組各自當宿主

採 **「中立標籤命名空間 + 各自開門」** 的兩層架構：

**第一層：通用食材標籤（宣告式、零程式碼）**

定義一組系列共用、不屬於任何單一模組的物品標籤命名空間 `kaleidoscope:`。每個模組在自己物品的 `minecraft:tags` 中宣告分類，其他模組只認標籤、不認 ID：

| 標籤 | 意義 | 主要提供者 |
|------|------|-----------|
| `kaleidoscope:flour` | 各種麵粉 | 廚房、豐收、烘焙 |
| `kaleidoscope:grain` | 穀物 | 廚房、豐收 |
| `kaleidoscope:sugar` / `:sweetener` | 糖、蜂蜜、糖漿 | 烘焙、豐收 |
| `kaleidoscope:dairy` / `:milk` / `:butter` / `:cheese` | 乳製品 | 烘焙 |
| `kaleidoscope:egg` | 蛋類 | 廚房、原版（經註冊） |
| `kaleidoscope:fruit` / `:berry` / `:citrus` | 水果 | 豐收 |
| `kaleidoscope:vegetable` / `:root_vegetable` / `:pumpkin` | 蔬菜 | 豐收、廚房 |
| `kaleidoscope:nut` | 堅果 | 豐收 |
| `kaleidoscope:herb` / `:spice` / `:flower_edible` | 香草、香料、可食用花 | 草本 |
| `kaleidoscope:tea_leaf` | 茶葉 | 廚房、草本 |
| `kaleidoscope:fish` / `:raw_fish` / `:cooked_fish` / `:shellfish` / `:seaweed` | 魚與海產 | 漁歌 |
| `kaleidoscope:meat` / `:raw_meat` / `:cooked_meat` | 肉類 | 廚房 |
| `kaleidoscope:bread` / `:cake` / `:pastry` / `:dough` | 烘焙成品與半成品 | 烘焙 |
| `kaleidoscope:sauce` / `:jam` / `:oil` | 醬料、果醬、油脂 | 各模組 |

> 也同步加上社群常用的 `c:` 標籤（例如 `c:foods/bread`），提升與系列外模組的相容性；廚房本身已承認 `c:heat_sources`。

**第二層：無法加標籤的物品 → 執行期註冊**

原版物品（`minecraft:wheat`、`minecraft:egg`、`minecraft:cod`…）或未加標籤的舊版物品，透過 `kaleidoscope_baking:register_ingredient` 在執行期分類：

```js
{ api: 1, source: "kaleidoscope_fishing", id: "minecraft:cod", tags: ["kaleidoscope:fish", "kaleidoscope:raw_fish"] }
```

烘焙的配方匹配器統一使用 `#kaleidoscope:fish` 這類寫法，一次比對「物品標籤 ∪ 執行期註冊」。

**第三層：各模組自己的 API（每個模組都是宿主）**

| 方向 | 做法 |
|------|------|
| 漁歌 / 豐收 / 草本 → 烘焙 | 他們呼叫 `kaleidoscope_baking:register_recipe` 註冊自己的烘焙食譜（如：漁歌註冊鯛魚燒餡料變化） |
| 烘焙 → 漁歌 / 豐收 / 草本 | 烘焙在收到對方的 `*:api_ready` 後，用對方 API 註冊烘焙成品的用途（如：麵包屑當漁歌魚餌、果渣當豐收堆肥） |
| 全部 → 廚房 | 各自直接使用廚房 API（廚房是共同的基礎宿主） |

建議四個模組統一 `api_ping / api_ready / register_*` 的事件命名與 JSON 慣例，讓開發者學一次即可對接全部。

### 5.3 相容層的程式位置

烘焙核心邏輯只看標籤，**不含任何漁歌 / 豐收 / 草本的 ID**。具體對應寫在：

```
scripts/compat/
  index.js                 // 偵測對方 api_ready 或 ItemTypes.get() 存在才啟用
  fishing.data.js          // 漁歌相容資料（ID→標籤、跨模組食譜）
  harvest.data.js          // 豐收相容資料
  herbal.data.js           // 草本相容資料
```

- 對方模組不存在 → 對應檔案完全不啟動，不產生任何警告或空物品。
- 若對方日後自行加上 `kaleidoscope:` 標籤，相容資料可逐步刪減，不需改核心。

### 5.4 互通食譜範例（第一版目標）

| 來源模組 | 烘焙成品 | 使用站點 | 說明 |
|---------|---------|---------|------|
| 漁歌 | 鯛魚燒（紅豆 / 卡士達 / 魚肉餡） | 烤箱 + 鯛魚燒模 | 鹹味版以 `#kaleidoscope:cooked_fish` 為餡 |
| 漁歌 | 鮭魚鹹派、仰望星空派（Stargazy Pie） | 烤箱 + 派盤 | 呼應廚房既有的仰望星空派食譜頁 |
| 漁歌 | 海苔肉鬆麵包 | 攪拌盆 + 烤箱 | `#kaleidoscope:seaweed` |
| 漁歌 ← 烘焙 | 麵包屑 → 魚餌 / 炸魚裹粉 | 砧板（麵包刀） | 透過漁歌 API 註冊 |
| 豐收 | 水果塔、南瓜派、玉米麵包、堅果派 | 烤箱 | `#kaleidoscope:fruit` / `:pumpkin` / `:nut` |
| 豐收 | 果乾 → 葡萄乾吐司 | 廚房竹篩（曬乾）→ 攪拌盆 | 跨三個模組的流程 |
| 豐收 ← 烘焙 | 果渣、焦糊麵包 → 堆肥 / 飼料 | — | 透過豐收 API 註冊 |
| 草本 | 香草佛卡夏、迷迭香餐包、薰衣草餅乾、薄荷巧克力蛋糕 | 攪拌盆 + 烤箱 | `#kaleidoscope:herb` / `:flower_edible` |
| 草本 | 抹茶 / 花茶戚風 | 石磨（茶葉→茶粉）+ 烤箱 | `#kaleidoscope:tea_leaf` |
| 草本 ← 烘焙 | 下午茶組合（茶 + 點心）提供草本藥效加成 | 廚房茶壺 | 透過草本 API 註冊 |
| 廚房 | 蛋黃酥、月餅（使用廚房鹹蛋 / 肉餡） | 烤箱 | 直接使用廚房物品 |

### 5.5 互通相容矩陣（目標）

| | 廚房 | 烘焙 | 漁歌 | 豐收 | 草本 |
|---|:---:|:---:|:---:|:---:|:---:|
| 食材標籤 `kaleidoscope:*` | 透過註冊 | ✅ 提供＋讀取 | ✅ | ✅ | ✅ |
| 熱源標籤 | ✅ 宿主 | ✅ | ✅ | — | ✅（藥爐） |
| 廚刀標籤 | ✅ 宿主 | ✅ | ✅（魚刀） | ✅（鐮刀類） | ✅（藥鍘） |
| 食譜書分頁 | ✅ 宿主 | ✅ | ✅ | ✅ | ✅ |
| 烘焙食譜 API | — | ✅ 宿主 | 註冊者 | 註冊者 | 註冊者 |

---

## 6. 技術架構

### 6.1 目錄結構（遵循廚房的標準資料夾）

```
Kaleidoscope Baking [BP]/
  manifest.json
  blocks/ items/ recipes/ loot_tables/ item_catalog/ features/
  documentation/              // KB_EXTENSION_API.md 等
  scripts/
    ARCHITECTURE.md           // Role: HOST + ADDON（對廚房是附加、對外是宿主）
    main.js                   // 只負責啟動
    api/                      // 烘焙公開 API：recipe / mold / topping / ingredient / fuel
    integrations/cookery/     // 對廚房的註冊（石磨、砧板、蒸籠、竹篩、食譜書、顯示規則…）
    compat/                   // 漁歌 / 豐收 / 草本 相容資料（可選啟動）
    custom_components/        // 烤箱、攪拌盆、發酵籃、裱花台等方塊元件
    data/                     // 內建食譜、食材標籤預設、語系、調校數值
    events/
    utils/                    // ingredientMatcher（ID / 陣列 / #標籤）、chunkedEvent、itemSafety
Kaleidoscope Baking [RP]/
  manifest.json  textures/ models/ entity/ texts/（zh_TW、zh_CN、en_US 優先）
```

### 6.2 關鍵技術點

| 項目 | 做法 |
|------|------|
| 站點狀態 | 方塊狀態 + 動態屬性雙軌；仿廚房砧板的「恢復 token」機制，重裝包後能還原站上物品 |
| 物品顯示 | 站上物品用展示實體；擴充模組可註冊自己的顯示實體（同廚房 board display 模式） |
| 標籤匹配 | `ItemStack.hasTag()` ∪ 執行期註冊表；結果快取，註冊爆量時合併成一次重建 |
| 訊息長度 | 大型註冊（食譜書、批量食材）用 begin/chunk/end 分塊，每塊 ≤ 1600 字元 |
| 物品安全 | 序列化保留 type、count、名稱、lore、耐久、附魔、動態屬性 |
| 效能 | 不做持續性全世界掃描；計時用方塊 tick 或 `system.runInterval` 只追蹤已啟動的站點 |
| 多語系 | 至少 zh_TW、zh_CN、en_US；食譜書文字經廚房食譜書語言設定顯示 |

---

## 7. 開發里程碑

| 階段 | 內容 | 驗收標準 |
|------|------|---------|
| **M0 基礎建設**（1 週） | manifest、命名空間、目錄、ARCHITECTURE.md、與廚房 `api_ping/api_ready` 握手 | 載入世界時 content log 顯示偵測到廚房 capabilities |
| **M1 核心站點**（3 週） | 攪拌盆、發酵籃、烤箱（火候三段）、模具、基礎材料 | 能從小麥一路做出吐司，拆站不掉物品 |
| **M2 廚房整合**（2 週） | 石磨 / 砧板 / 蒸籠 / 竹篩 / 湯鍋 / 炒鍋食譜註冊、油容器、顯示規則、食譜書分頁 | 食譜書出現烘焙分頁且所有食譜可查 |
| **M3 內容填充**（3 週） | 約 40 道成品、裱花台、可擺放蛋糕與派、展示櫃 | 所有成品有貼圖、語系、食物數值 |
| **M4 烘焙 API v1**（2 週） | 公開事件、驗證、冪等、分塊、文件、最小範例包 | 範例包可註冊新烤箱食譜並在食譜書顯示 |
| **M5 系列互通**（3 週） | 食材標籤規範定稿、compat 三檔、跨模組食譜、反向註冊 | 五個模組任意組合安裝都能正常載入，缺任一模組不報錯 |
| **M6 測試與發佈**（2 週） | 單人 / 多人 / Realms 測試、效能、移除重裝測試 | 無物品遺失；註冊 500 筆食譜不觸發 watchdog |

---

## 8. 風險與對策

| 風險 | 影響 | 對策 |
|------|------|------|
| 廚房更新改動 API / UUID | 整合失效 | 只用公開 v1 事件；UUID 依賴集中在 manifest；以 capabilities 判斷功能 |
| 原版物品無法加自訂標籤 | 標籤匹配不完整 | 第二層執行期註冊表補足 |
| 漁歌 / 豐收 / 草本的 ID 或 API 尚未確定 | 相容層無法完成 | 先定標籤規範，compat 資料最後接；對方可自行加標籤免對接 |
| Script Event 2048 字元上限 | 大量資料傳不完 | 分塊協定 |
| 大量註冊造成 watchdog | 伺服器卡頓 | 註冊與快取重建分離、合併到下一 tick |
| 方塊狀態組合爆量 | 載入慢、超過上限 | 外觀變化優先用展示實體，狀態只存必要欄位 |
| 與廚房同類食物重複（如廚房已有饅頭、肉餅） | 內容重疊 | 烘焙專注「烤」與「西點／中式酥點」，蒸類只做廚房沒有的品項 |

---

## 9. 待確認事項

1. **漁歌、豐收、草本的正式命名空間與 Bedrock 包 UUID**（本文暫以 `kaleidoscope_fishing`、`kaleidoscope_harvest`、`kaleidoscope_herbal` 代稱）。
2. 這三個模組是否已有或計畫推出自己的 Script Event API？若有，請提供事件名稱以便規劃反向註冊。
3. 是否同意由烘焙主導起草「森羅食材標籤 `kaleidoscope:*`」規範，並由四個模組共同採用？
4. 烤箱是否需要獨立燃料系統，或完全沿用廚房熱源即可？
5. 第一版成品清單的優先順序（建議：吐司、蛋糕、派、餅乾、鯛魚燒先行）。
6. 授權與署名：沿用廚房的 license 與 CREDITS 格式。
