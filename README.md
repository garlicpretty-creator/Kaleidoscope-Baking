# Kaleidoscope-Baking
A Kaleidoscope series add-on introducing custom baking mechanics, new kitchenware, and delicious desserts

森羅物語：烘焙 —— 森羅物語：廚房（Kaleidoscope Cookery）的擴充模組。

## 文件

- [企劃書（繁體中文）](docs/PROPOSAL.zh-TW.md)
- [擴充 API（給其他模組作者）](BP/documentation/KB_EXTENSION_API.md)
- [美術資源清單（給美術）](docs/ART_ASSETS.md)
- [腳本架構](BP/scripts/ARCHITECTURE.md)

## 目前內容（v0.1.0）

- **烤箱**：3×3×3 大型方塊，4 個烘烤格、燃料火口、完美 / 烤焦火候、模具
- **攪拌盆**：最多 9 種材料，用打蛋器攪拌；支援 `#kaleidoscope:*` 食材標籤
- 工具：打蛋器、蛋糕模、吐司模、烤盤
- 材料：奶油、蛋糕麵糊、吐司麵團、餅乾麵團
- 成品：海綿蛋糕、吐司、吐司片（用廚房砧板切）、奶油餅乾
- 與廚房互通：使用廚房麵粉 / 麵團；向廚房註冊砧板食譜與餐桌顯示規則
- 烘焙 API v1：其他模組可註冊烤箱 / 攪拌盆食譜、食材標籤、燃料

美術目前為暫代圖，正式美術完成後直接覆蓋 `RP/textures/` 即可。

## 開發

需要 Node.js 22+ 與 Python 3（含 Pillow）。

```sh
npm test                  # 單元測試 + 以模擬 @minecraft/server 執行實際方塊腳本
python3 tools/validate.py # 檢查 JSON、貼圖、語系、物品 ID、腳本語法
python3 tools/build.py    # 打包成 dist/Kaleidoscope-Baking-v<版本>.mcaddon
node tools/gen_oven_block.mjs        # 修改烤箱結構後重新產生 BP/blocks/oven.json
python3 tools/gen_placeholder_art.py # 補上缺少的暫代圖
```

安裝：開啟 `.mcaddon` 匯入後，在世界中同時啟用 **森羅物語：廚房 v1.6.6** 與 **森羅物語：烘焙**，不需要開啟 Beta API（只使用穩定版 `@minecraft/server` 2.7.0）。
