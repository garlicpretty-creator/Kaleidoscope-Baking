"""Generate all data files and placeholder art from tools/content.py.

  python3 tools/gen_content.py            # regenerate JSON/lang/JS; create MISSING art only
  python3 tools/gen_content.py --force-art  # also repaint every placeholder PNG

Generated JSON is committed. Edit tools/content.py (or tools/messages.py), not the outputs.
The oven block JSON is produced separately by tools/gen_oven_block.mjs.
"""
import json
import os
import re
import shutil
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import content as C  # noqa: E402
from messages import MSG  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "art"))
import build_models as ART  # noqa: E402  (tools/art: block models + block textures)
import stations as ART_STATIONS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP, RP = os.path.join(ROOT, "BP"), os.path.join(ROOT, "RP")
NS = C.NS
FORCE_ART = "--force-art" in sys.argv
GROWTH = f"{NS}:growth"
LANGS = ["zh_TW", "zh_CN", "en_US"]
generated = set()

# Block models and block textures are drawn by tools/art (build_models.py). It runs first; the placeholder painter
# below never overwrites a file it owns, even with --force-art.
ART_OUT = ART.build_all()
if ART_OUT["problems"]:
    sys.exit("tools/art z-fight audit failed:\n" + "\n".join(ART_OUT["problems"]))
generated.update(ART.WRITTEN)
ART_OWNED = {os.path.normcase(os.path.join("textures", "blocks", f)) for f in os.listdir(os.path.join(ROOT, "RP", "textures", "blocks"))
             if f.endswith(".png") and f != "kb_empty.png"}
MAT = "alpha_test_single_sided"  # one-sided faces: the two sides of a plane, or two touching faces, never z-fight


def kb(n):
    return n if ":" in n else f"{NS}:{n}"


def w(path, obj):
    path = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    generated.add(os.path.relpath(path, ROOT))


# ---------------------------------------------------------------------------
# zh_TW -> zh_CN (characters used by this pack's strings)
# ---------------------------------------------------------------------------
_T2S = ("語语 擴扩 廚厨 麵面 餅饼 乾干 鬆松 檸柠 藍蓝 綠绿 塊块 漿浆 醬酱 盤盘 機机 壺壶 鍋锅 籃篮 臺台 鯛鲷 魚鱼 燒烧 鹹咸 鳳凤 蘋苹 樹树 葉叶 濃浓 縮缩 鐵铁 瑪玛 沖冲 淺浅 實实 熱热 帶带 馬马 鴛鸳 鴦鸯 紅红 烏乌 龍龙 蓋盖 頌颂 捲卷 蘿萝 貝贝 發发 黃黄 國国 條条 壓压 團团 鮮鲜 莢荚 澱淀 層层 蠟蜡 燭烛 鮭鲑 風风 濾滤 掛挂 搖摇 飲饮 種种 叢丛 剝剥 製制 譜谱 時时 間间 滿满 進进 裡里 後后 還还 沒没 這这 個个 層层 開开 點点 擊击 繼继 續续 飾饰 該该 給给 讓让 慢慢 會会 溫温 較较 較较 處处 據据 單单 號号 歡欢 應应 對对 類类 雜杂 純纯 聖圣 誕诞 慶庆 節节 夠够 嗎吗 兩两 錯错 誤误 須须 號号 罐罐 腦脑 錄录 戶户 給给 驗验 選选 擇择 設设 定定 換换 動动 轉转 為为 準准 備备 時时 經经 過过 遠远 邊边 從从 與与 隻只 嚴严 稱称 計计 處处 憶忆 歷历 異异 斷断 變变 現现 寫写 聽听 說说 讀读 書书 檔档 輸输 關关 閉闭 啟启 舊旧 識识 認认 價价 錢钱 買买 賣卖 費费 員员 戲戏 圖图 畫画 傳传 統统 啡啡 鬆松 糰团 餡馅 籽籽 薑姜 蔥葱 麥麦 穀谷 釀酿 醃腌 滷卤 烤烤 炸炸 罌罂 噴喷 灑洒 汙污 淨净 潔洁 衛卫 歸归 擁拥 擠挤 灣湾 銀银 鍵键 錶表 鐘钟 鏡镜 閃闪 陽阳 陰阴 雲云 電电 響响 頁页 項项 順顺 預预 領领 頭头 題题 顏颜 願愿 類类 顯显 飯饭 飽饱 飼饲 館馆 餘余 驚惊 體体 髮发 鬥斗 鳥鸟 鴨鸭 鵝鹅 鷹鹰 麗丽 黴霉 點点 齊齐 齒齿 龜龟 蟲虫 蝦虾 蠔蚝 補补 襪袜 裝装 製制 複复 視视 覺觉 觀观 角角 訂订 計计 訊讯 記记 訪访 許许 診诊 註注 詞词 試试 詩诗 話话 該该 誠诚 誰谁 課课 調调 談谈 請请 論论 諸诸 謝谢 證证 識识 護护 讀读 變变 讓让 豐丰 貓猫 貨货 質质 購购 賽赛 趕赶 趨趋 跡迹 踐践 蹤踪 車车 軟软 輕轻 載载 較较 輔辅 輪轮 辦办 這这 連连 週周 運运 過过 達达 違违 遞递 遠远 適适 遲迟 遷迁 選选 遺遗 還还 邊边 郵邮 鄉乡 醫医 釋释 針针 鈕钮 銷销 鋼钢 錄录 鍵键 鎖锁 長长 門门 閒闲 開开 間间 閱阅 闊阔 隊队 陳陈 際际 險险 隨随 隱隐 雖虽 雙双 雞鸡 離离 難难 雪雪 電电 靜静 韓韩 頓顿 頻频 額额 風风 飛飞 養养 驅驱 騎骑 驗验 魯鲁 鮮鲜 鯨鲸 麼么 黨党 鬥斗 歲岁 盞盏 碗碗 紙纸 糧粮 終终 結结 給给 絲丝 經经 綿绵 緊紧 線线 練练 組组 縣县 總总 織织 繞绕 纖纤 罰罚 羅罗 聞闻 聯联 聲声 職职 腳脚 膠胶 臉脸 興兴 舉举 艙舱 艱艰 藥药 蘭兰 處处 號号 蟻蚁 衝冲 補补 裡里 覆覆 見见 規规 親亲")
T2S = {}
for pair in _T2S.split():
    if len(pair) == 2:
        T2S[pair[0]] = pair[1]


def zh_cn(s):
    return "".join(T2S.get(ch, ch) for ch in s)


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------
FACES = ["north", "south", "east", "west", "up", "down"]


def cube(origin, size, top=None, material=None):
    uv = {}
    for f in FACES:
        face = {"uv": [0, 0], "uv_size": [16, 16]}
        if top and f == "up":
            face["material_instance"] = top
        elif material:
            face["material_instance"] = material
        uv[f] = face
    return {"origin": origin, "size": size, "uv": uv}


def geo(gid, bones):
    return {"format_version": "1.21.60", "minecraft:geometry": [{
        "description": {"identifier": gid, "texture_width": 16, "texture_height": 16,
                        "visible_bounds_width": 2, "visible_bounds_height": 2.5, "visible_bounds_offset": [0, 0.75, 0]},
        "bones": bones}]}


def cross_cubes(material=None):
    out = []
    for rot in (45, -45):
        c = {"origin": [-8, 0, 0], "size": [16, 16, 0], "pivot": [0, 8, 0], "rotation": [0, rot, 0],
             "uv": {"north": {"uv": [0, 0], "uv_size": [16, 16]}, "south": {"uv": [16, 0], "uv_size": [-16, 16]}}}
        if material:
            for f in c["uv"].values():
                f["material_instance"] = material
        out.append(c)
    return out


# ---------------------------------------------------------------------------
# Placeholder painter
# ---------------------------------------------------------------------------
T = (0, 0, 0, 0)


def rgba(c, a=255):
    return tuple(c[:3]) + (a,)


def darker(c, k=0.7):
    return tuple(int(x * k) for x in c[:3]) + (255,)


def lighter(c, k=1.25):
    return tuple(min(255, int(x * k)) for x in c[:3]) + (255,)


def paint_item(shape, c1, c2):
    img = Image.new("RGBA", (16, 16), T)
    d = ImageDraw.Draw(img)
    a = rgba(c1)
    b = rgba(c2) if c2 else lighter(c1)
    o = darker(c1, 0.6)
    s = shape
    if s in ("ball", "ball_big"):
        r = (3, 4, 12, 13) if s == "ball" else (1, 3, 14, 14)
        d.ellipse(r, fill=a, outline=o)
        if c2:
            for p in ((5, 7), (9, 6), (7, 10), (10, 10), (6, 9)):
                d.point(p, fill=rgba(c2))
    elif s == "powder":
        d.polygon([(2, 14), (8, 5), (14, 14)], fill=a, outline=o)
        if c2:
            d.point((8, 9), fill=rgba(c2))
    elif s == "bottle":
        d.rectangle([6, 1, 9, 3], fill=(150, 110, 70, 255))
        d.rectangle([5, 4, 10, 14], fill=(220, 235, 240, 160), outline=(170, 190, 200, 255))
        d.rectangle([6, 7, 9, 13], fill=a)
    elif s == "jar":
        d.rectangle([4, 3, 11, 4], fill=(200, 200, 200, 255))
        d.rectangle([3, 5, 12, 14], fill=(220, 235, 240, 160), outline=(170, 190, 200, 255))
        d.rectangle([4, 7, 11, 13], fill=a)
    elif s == "bowl_fill":
        d.pieslice([1, 0, 14, 14], 0, 180, fill=(200, 200, 205, 255), outline=(140, 140, 150, 255))
        d.ellipse([2, 4, 13, 9], fill=a)
        if c2:
            d.ellipse([5, 5, 9, 7], fill=rgba(c2))
    elif s == "butter":
        d.polygon([(2, 8), (9, 5), (14, 8), (7, 11)], fill=lighter(c1))
        d.polygon([(2, 8), (7, 11), (7, 14), (2, 11)], fill=a)
        d.polygon([(7, 11), (14, 8), (14, 11), (7, 14)], fill=darker(c1, 0.85))
    elif s == "seeds":
        for p in ((4, 5), (8, 4), (11, 7), (6, 9), (10, 11), (4, 12), (8, 13), (12, 13)):
            d.ellipse([p[0] - 1, p[1] - 1, p[0] + 1, p[1]], fill=a)
    elif s == "ice":
        for r in ((2, 6, 7, 11), (7, 3, 12, 8), (8, 9, 13, 14), (3, 11, 7, 14)):
            d.rectangle(r, fill=(210, 235, 250, 220), outline=(150, 190, 220, 255))
    elif s == "pearls":
        d.pieslice([1, 0, 14, 14], 0, 180, fill=(200, 200, 205, 255))
        for x in (4, 7, 10):
            for y in (5, 8):
                d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=a)
    elif s == "bean":
        for p in ((5, 6), (10, 5), (7, 10), (11, 11), (4, 12)):
            d.ellipse([p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 1], fill=a, outline=o)
            d.line([p[0] - 1, p[1] - 1, p[0] + 1, p[1]], fill=o)
    elif s == "berry":
        for p in ((6, 8), (10, 9), (8, 12)):
            d.ellipse([p[0] - 3, p[1] - 3, p[0] + 2, p[1] + 2], fill=a, outline=o)
        d.line([8, 2, 8, 6], fill=(60, 120, 50, 255))
    elif s == "lemon":
        d.ellipse([2, 4, 14, 13], fill=a, outline=o)
        d.polygon([(8, 4), (11, 1), (12, 3)], fill=rgba(c2))
    elif s == "lemon_slice":
        d.ellipse([2, 2, 13, 13], fill=a)
        d.ellipse([4, 4, 11, 11], fill=rgba(c2))
        for p in ((7, 5), (10, 7), (8, 10), (5, 8)):
            d.line([7, 7, p[0], p[1]], fill=a)
    elif s == "herb":
        d.line([8, 15, 8, 3], fill=darker(c1, 0.7), width=1)
        for y in range(3, 14, 2):
            d.ellipse([4, y, 7, y + 2], fill=a)
            d.ellipse([9, y + 1, 12, y + 3], fill=a)
    elif s == "leaf":
        d.ellipse([3, 2, 13, 13], fill=a, outline=o)
        d.line([4, 13, 12, 3], fill=o)
    elif s == "cutting":
        d.line([8, 15, 8, 4], fill=rgba(c2) if c2 else o, width=2)
        d.ellipse([3, 2, 8, 6], fill=a)
        d.ellipse([8, 5, 13, 9], fill=a)
    elif s == "sapling":
        d.line([8, 15, 8, 8], fill=(110, 70, 40, 255), width=2)
        d.ellipse([2, 1, 14, 10], fill=a)
        if c2:
            d.point((5, 5), fill=rgba(c2))
            d.point((10, 4), fill=rgba(c2))
    elif s == "pod":
        d.line([3, 14, 12, 2], fill=a, width=3)
        d.line([3, 14, 12, 2], fill=o, width=1)
    elif s == "stick":
        for i, y in enumerate((5, 8, 11)):
            d.line([2 + i, y + 3, 13 - i, y - 3], fill=a if i % 2 == 0 else rgba(c2), width=2)
    elif s == "root":
        d.polygon([(3, 3), (7, 2), (13, 13), (11, 14)], fill=a, outline=o)
        d.line([5, 4, 11, 12], fill=rgba(c2))
    elif s in ("cake", "cake_candle"):
        d.rectangle([1, 6, 14, 14], fill=a)
        d.rectangle([1, 4, 14, 7], fill=rgba(c2))
        d.rectangle([1, 10, 14, 10], fill=lighter(c1, 1.3))
        if s == "cake_candle":
            d.line([8, 0, 8, 3], fill=(250, 160, 190, 255))
            d.point((8, 0), fill=(255, 220, 60, 255))
        else:
            d.ellipse([6, 1, 9, 4], fill=(220, 40, 60, 255))
    elif s == "slice_cake":
        d.polygon([(2, 13), (14, 13), (14, 6)], fill=a)
        d.polygon([(2, 13), (14, 6), (14, 4), (2, 11)], fill=rgba(c2))
    elif s == "pie":
        d.ellipse([1, 4, 14, 14], fill=a, outline=o)
        d.ellipse([3, 5, 12, 11], fill=rgba(c2))
        for x in (5, 8, 11):
            d.line([x, 5, x, 11], fill=a)
    elif s == "tart":
        d.polygon([(2, 7), (14, 7), (12, 13), (4, 13)], fill=a, outline=o)
        d.ellipse([3, 4, 13, 9], fill=rgba(c2))
    elif s == "loaf":
        d.rectangle([1, 7, 14, 14], fill=a)
        d.ellipse([1, 3, 14, 11], fill=a)
        d.ellipse([3, 5, 12, 9], fill=rgba(c2) if c2 else lighter(c1))
    elif s == "slice":
        d.rectangle([3, 6, 12, 14], fill=a)
        d.ellipse([3, 2, 12, 9], fill=a)
        d.rectangle([4, 7, 11, 13], fill=rgba(c2))
        d.ellipse([4, 3, 11, 9], fill=rgba(c2))
    elif s == "baguette":
        d.line([2, 13, 13, 2], fill=a, width=5)
        for i in range(3):
            d.line([4 + i * 3, 9 - i * 3, 6 + i * 3, 11 - i * 3], fill=lighter(c1, 1.4))
    elif s == "croissant":
        d.pieslice([1, 3, 15, 17], 200, 340, fill=a, outline=o)
        for x in (5, 8, 11):
            d.line([x, 4, x, 9], fill=o)
    elif s == "roll":
        d.ellipse([2, 2, 13, 13], fill=a, outline=o)
        d.arc([4, 4, 11, 11], 0, 300, fill=rgba(c2), width=2)
        d.ellipse([7, 7, 8, 8], fill=rgba(c2))
    elif s == "flatbread":
        d.rectangle([1, 5, 14, 12], fill=a, outline=o)
        for p in ((4, 7), (8, 9), (11, 7), (5, 10)):
            d.point(p, fill=rgba(c2))
    elif s == "bun":
        d.ellipse([2, 4, 13, 13], fill=a, outline=o)
        for x in (5, 8, 11):
            d.line([x, 5, x - 2, 10], fill=rgba(c2))
    elif s == "bagel":
        d.ellipse([1, 3, 14, 14], fill=a, outline=o)
        d.ellipse([6, 7, 9, 10], fill=T)
        for p in ((3, 6), (11, 6), (4, 11), (11, 11), (8, 4)):
            d.point(p, fill=rgba(c2))
    elif s == "donut":
        d.ellipse([1, 3, 14, 14], fill=a)
        d.ellipse([2, 3, 13, 11], fill=rgba(c2))
        d.ellipse([6, 6, 9, 9], fill=T)
    elif s == "pancakes":
        for i, y in enumerate((11, 8, 5)):
            d.ellipse([1, y, 14, y + 4], fill=a, outline=o)
        d.rectangle([6, 4, 9, 6], fill=rgba(c2))
    elif s == "cookie":
        d.ellipse([2, 2, 13, 13], fill=a, outline=o)
        for p in ((5, 5), (9, 6), (6, 9), (10, 10)):
            d.point(p, fill=rgba(c2))
    elif s == "muffin":
        d.polygon([(3, 8), (12, 8), (11, 14), (4, 14)], fill=(220, 220, 225, 255))
        d.ellipse([1, 2, 14, 10], fill=a)
        for p in ((5, 5), (9, 4), (8, 7)):
            d.point(p, fill=rgba(c2))
    elif s == "fish":
        d.ellipse([1, 4, 11, 12], fill=a, outline=o)
        d.polygon([(10, 8), (15, 4), (15, 12)], fill=a)
        d.point((4, 7), fill=(30, 30, 30, 255))
        d.line([5, 8, 9, 8], fill=rgba(c2))
    elif s == "fagao":
        d.polygon([(3, 14), (13, 14), (14, 7), (2, 7)], fill=a)
        d.ellipse([2, 3, 14, 10], fill=a)
        d.line([8, 3, 8, 8], fill=rgba(c2))
        d.line([4, 6, 12, 6], fill=rgba(c2))
    elif s == "mooncake":
        d.ellipse([1, 2, 14, 14], fill=a, outline=o)
        d.ellipse([4, 5, 11, 11], outline=rgba(c2))
        d.point((7, 8), fill=rgba(c2))
    elif s == "burnt":
        d.ellipse([2, 4, 13, 14], fill=a, outline=(20, 20, 20, 255))
        d.line([5, 3, 6, 0], fill=(120, 120, 120, 255))
        d.line([9, 3, 10, 1], fill=(120, 120, 120, 255))
    elif s == "mug":
        d.rectangle([3, 4, 11, 14], fill=a, outline=(170, 170, 170, 255))
        d.arc([9, 6, 14, 11], 270, 90, fill=(170, 170, 170, 255), width=2)
        if c2:
            d.rectangle([4, 5, 10, 7], fill=rgba(c2))
    elif s == "takeaway":
        d.polygon([(3, 3), (12, 3), (11, 15), (4, 15)], fill=(235, 240, 245, 230), outline=(170, 180, 190, 255))
        d.rectangle([3, 2, 12, 3], fill=(200, 200, 205, 255))
        d.line([9, 0, 8, 4], fill=(240, 120, 140, 255), width=1)
        if c2:
            d.polygon([(4, 6), (11, 6), (11, 14), (5, 14)], fill=rgba(c2))
            for x in (5, 7, 9):
                d.point((x, 13), fill=(30, 30, 30, 255))
    elif s == "candle":
        d.rectangle([7, 4, 8, 15], fill=a)
        d.ellipse([6, 0, 9, 4], fill=rgba(c2))
    elif s == "whisk":
        d.line([7, 9, 7, 15], fill=rgba(c2), width=2)
        d.ellipse([3, 0, 12, 10], outline=a)
        d.line([7, 0, 7, 10], fill=a)
    elif s == "frother":
        d.line([7, 4, 7, 15], fill=a, width=1)
        d.ellipse([4, 0, 10, 5], outline=a)
        d.rectangle([5, 10, 9, 15], fill=rgba(c2))
    elif s == "pin":
        d.line([1, 14, 14, 1], fill=a, width=4)
        d.line([1, 14, 3, 12], fill=rgba(c2), width=3)
        d.line([12, 3, 14, 1], fill=rgba(c2), width=3)
    elif s == "knife":
        d.polygon([(4, 11), (13, 1), (14, 3), (6, 12)], fill=a, outline=o)
        for x in range(6, 13, 2):
            d.point((x, 11 - (x - 4)), fill=o)
        d.line([1, 14, 4, 11], fill=rgba(c2), width=3)
    elif s.startswith("mold_") or s == "tray":
        if s == "mold_round":
            d.ellipse([1, 5, 14, 14], fill=darker(c1, 0.8))
            d.ellipse([1, 3, 14, 11], fill=a)
            d.ellipse([4, 5, 11, 9], fill=darker(c1, 0.8))
        elif s == "mold_loaf":
            d.polygon([(1, 5), (14, 5), (12, 13), (3, 13)], fill=a, outline=o)
        elif s == "mold_pie":
            d.ellipse([1, 5, 14, 13], fill=a, outline=o)
            d.ellipse([4, 6, 11, 11], fill=rgba(c2) if c2 else darker(c1))
        elif s == "mold_muffin":
            d.rectangle([1, 5, 14, 12], fill=a, outline=o)
            for x in (4, 8, 12):
                d.ellipse([x - 2, 6, x + 1, 10], fill=darker(c1))
        elif s == "mold_fish":
            d.rectangle([1, 3, 14, 13], fill=a, outline=o)
            d.ellipse([3, 5, 10, 11], fill=darker(c1))
            d.polygon([(9, 8), (13, 5), (13, 11)], fill=darker(c1))
        else:
            d.rectangle([0, 6, 15, 11], fill=a, outline=o)
            for x in (3, 7, 11):
                d.ellipse([x - 1, 7, x + 1, 9], fill=o)
    elif s == "oven":
        d.rectangle([1, 2, 14, 15], fill=a)
        d.rectangle([4, 5, 11, 9], fill=rgba(c2))
        d.rectangle([5, 6, 10, 8], fill=(255, 170, 70, 255))
        d.rectangle([5, 11, 10, 14], fill=(40, 36, 34, 255))
        d.rectangle([11, 0, 13, 2], fill=(90, 90, 90, 255))
    elif s == "bowl":
        d.pieslice([1, -2, 14, 13], 0, 180, fill=a, outline=o)
        d.line([2, 5, 13, 5], fill=o)
    elif s == "basket":
        d.pieslice([0, -3, 15, 14], 0, 180, fill=a, outline=o)
        for x in range(3, 14, 3):
            d.line([x, 6, x, 11], fill=o)
    elif s == "stand":
        d.rectangle([2, 4, 13, 5], fill=a, outline=o)
        d.rectangle([7, 6, 8, 12], fill=o)
        d.rectangle([4, 13, 11, 14], fill=a)
        d.ellipse([5, 1, 10, 4], fill=rgba(c2))
    elif s == "machine":
        d.rectangle([2, 1, 13, 14], fill=a, outline=o)
        d.rectangle([4, 6, 11, 11], fill=rgba(c2))
        d.rectangle([7, 6, 8, 8], fill=(200, 200, 200, 255))
        d.rectangle([6, 12, 9, 14], fill=(250, 250, 250, 255))
        d.point((11, 3), fill=(220, 40, 40, 255))
    elif s == "dripper":
        d.polygon([(3, 3), (12, 3), (9, 8), (6, 8)], fill=a, outline=o)
        d.rectangle([5, 10, 10, 14], fill=(250, 250, 250, 255), outline=(170, 170, 170, 255))
        d.rectangle([6, 11, 9, 12], fill=rgba(c2))
    elif s == "shaker":
        d.rectangle([5, 4, 10, 15], fill=a, outline=o)
        d.rectangle([6, 1, 9, 4], fill=lighter(c1))
    elif s == "planter":
        d.polygon([(3, 9), (12, 9), (11, 15), (4, 15)], fill=a, outline=o)
        d.line([8, 9, 8, 3], fill=rgba(c2))
        d.ellipse([4, 2, 8, 6], fill=rgba(c2))
        d.ellipse([8, 3, 12, 7], fill=rgba(c2))
    else:
        d.rectangle([2, 2, 13, 13], fill=a, outline=o)
    return img


def paint_plant_stage(leaf, fruit, stage, stages):
    img = Image.new("RGBA", (16, 16), T)
    d = ImageDraw.Draw(img)
    h = 3 + int(12 * (stage + 1) / stages)
    top = 16 - h
    for x in (4, 8, 12):
        d.line([x, 15, x + (1 if x < 8 else -1 if x > 8 else 0), top], fill=darker(leaf, 0.8))
        for y in range(top, 15, 3):
            d.ellipse([x - 2, y, x, y + 1], fill=rgba(leaf))
            d.ellipse([x, y + 1, x + 2, y + 2], fill=rgba(leaf))
    if fruit and stage == stages - 1:
        for p in ((4, top + 2), (8, top + 4), (12, top + 3), (6, top + 7), (10, top + 6)):
            if p[1] < 15:
                d.ellipse([p[0] - 1, p[1] - 1, p[0] + 1, p[1] + 1], fill=rgba(fruit))
    return img


def paint_block(kind, c1, c2=None):
    img = Image.new("RGBA", (16, 16), rgba(c1))
    d = ImageDraw.Draw(img)
    if kind == "brick":
        mortar = (205, 180, 150, 255)
        for y in (3, 7, 11, 15):
            d.line([0, y, 15, y], fill=mortar)
        for row, y0 in enumerate((0, 4, 8, 12)):
            for x in ((3, 11) if row % 2 == 0 else (7, 15)):
                d.line([x, y0, x, y0 + 2], fill=mortar)
    elif kind == "door":
        img = paint_block("brick", c1)
        d = ImageDraw.Draw(img)
        d.rectangle([2, 3, 13, 13], fill=(120, 124, 132, 255))
        d.rectangle([4, 5, 11, 10], fill=(255, 170, 70, 255))
        d.line([3, 2, 12, 2], fill=(184, 188, 194, 255))
    elif kind in ("firebox", "firebox_lit"):
        img = paint_block("brick", c1)
        d = ImageDraw.Draw(img)
        d.rectangle([3, 6, 12, 14], fill=(40, 36, 34, 255))
        if kind == "firebox_lit":
            d.polygon([(4, 14), (6, 8), (8, 12), (10, 7), (11, 14)], fill=(255, 140, 30, 255))
            d.polygon([(6, 14), (8, 10), (10, 14)], fill=(255, 220, 80, 255))
    elif kind == "chimney":
        img = paint_block("brick", c1)
        d = ImageDraw.Draw(img)
        d.rectangle([4, 4, 11, 11], fill=(70, 70, 70, 255))
        d.rectangle([6, 6, 9, 9], fill=(40, 36, 34, 255))
    elif kind == "log_side":
        for x in range(0, 16, 3):
            d.line([x, 0, x, 15], fill=darker(c1, 0.75))
    elif kind == "log_stripped":
        img = Image.new("RGBA", (16, 16), lighter(c1, 1.35))
        d = ImageDraw.Draw(img)
        for x in range(1, 16, 4):
            d.line([x, 0, x, 15], fill=lighter(c1, 1.15))
    elif kind == "log_top":
        d.ellipse([1, 1, 14, 14], fill=lighter(c1, 1.4), outline=darker(c1))
        d.ellipse([5, 5, 10, 10], outline=darker(c1, 0.8))
    elif kind == "leaves":
        img = Image.new("RGBA", (16, 16), T)
        d = ImageDraw.Draw(img)
        for y in range(0, 16, 2):
            for x in range((y // 2) % 2, 16, 2):
                d.point((x, y), fill=rgba(c1))
                d.point((x + 1, y + 1), fill=darker(c1, 0.8))
        if c2:
            for p in ((3, 4), (11, 3), (7, 10), (13, 12), (2, 13)):
                d.ellipse([p[0] - 1, p[1] - 1, p[0] + 1, p[1] + 1], fill=rgba(c2))
    elif kind == "stripes":
        for y in range(0, 16, 4):
            d.line([0, y, 15, y], fill=lighter(c1, 1.1))
    elif kind == "dessert_top":
        if c2:
            for p in ((4, 4), (11, 5), (8, 9), (4, 12), (12, 12)):
                d.ellipse([p[0] - 1, p[1] - 1, p[0] + 1, p[1] + 1], fill=rgba(c2))
    elif kind == "dessert_side":
        d.rectangle([0, 0, 15, 2], fill=lighter(c1, 1.2))
        d.rectangle([0, 8, 15, 8], fill=lighter(c1, 1.3))
    elif kind == "pot":
        d.rectangle([0, 0, 15, 2], fill=darker(c1, 0.8))
        d.rectangle([0, 3, 15, 4], fill=(90, 60, 40, 255))
    return img


def save_png(img, rel):
    path = os.path.join(RP, rel)
    if os.path.normcase(os.path.normpath(rel)) in ART_OWNED:
        return
    # item icons picked from Retro Diffusion (art/icons/<id>.png) are never replaced by placeholders
    m = re.match(r"textures[\\/]items[\\/]kb_(.+)\.png$", rel)
    if m and os.path.exists(os.path.join(ROOT, "art", "icons", m.group(1) + ".png")):
        return
    if os.path.exists(path) and not FORCE_ART:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
lang = {l: {} for l in LANGS}
item_tex, terrain_tex, sounds = {}, {}, {}
geometries = {}


def name(key, zh, en):
    lang["zh_TW"][key] = zh
    lang["zh_CN"][key] = zh_cn(zh)
    lang["en_US"][key] = en


def tex(key, rel):
    terrain_tex[key] = {"textures": f"textures/blocks/{rel}"}


def loot(path, pools):
    w(f"BP/loot_tables/{NS}/{path}.json", {"pools": pools})
    return f"loot_tables/{NS}/{path}.json"


def pool(item_id, lo=1, hi=1, chance=None):
    entry = {"type": "item", "name": kb(item_id), "weight": 1}
    if (lo, hi) != (1, 1):
        entry["functions"] = [{"function": "set_count", "count": {"min": lo, "max": hi}}]
    p = {"rolls": 1, "entries": [entry]}
    if chance is not None:
        p["conditions"] = [{"condition": "random_chance", "chance": chance}]
    return p


def block(bid, components, states=None, permutations=None, category="none", traits=None):
    # Blocks take tags as `tag:<name>` components; a `minecraft:tags` list makes the engine reject the whole block.
    for tag in components.pop("minecraft:tags", []):
        components[f"tag:{tag}"] = {}
    desc = {"identifier": kb(bid), "menu_category": {"category": category}}
    if states:
        desc["states"] = states
    if traits:
        desc["traits"] = traits
    b = {"format_version": "1.26.1", "minecraft:block": {"description": desc, "components": components}}
    if permutations:
        b["minecraft:block"]["permutations"] = permutations
    w(f"BP/blocks/{bid}.json", b)


def cond(state, value):
    v = f"'{value}'" if isinstance(value, str) else str(value).lower()
    return f"q.block_state('{state}') == {v}"


# --- Items ---------------------------------------------------------------
ITEM_IDS = {i["id"] for i in C.ITEMS}
for it in C.ITEMS:
    iid = it["id"]
    # Without display_name the game looks up "item.<id>" (no ".name") and shows the raw key.
    comps = {"minecraft:display_name": {"value": f"item.{kb(iid)}.name"},
             "minecraft:icon": f"kb_{iid}", "minecraft:max_stack_size": it["stack"]}
    if it["tags"]:
        comps["minecraft:tags"] = {"tags": it["tags"]}
    if it["place"]:
        bp = {"block": kb(it["place"])}
        if it["place"] == iid:
            bp["replace_block_item"] = True
        on = it["extra"].get("place_on")
        if on:
            bp["use_on"] = C.PLACE_ON[on]
        comps["minecraft:block_placer"] = bp
    if it["extra"].get("hand"):
        comps["minecraft:hand_equipped"] = True
    if it["extra"].get("durability"):
        comps["minecraft:durability"] = {"max_durability": it["extra"]["durability"]}
    f = it["food"]
    if f:
        comps["minecraft:food"] = {"nutrition": f["n"], "saturation_modifier": f["sat"], "can_always_eat": f["always"]}
        if f["converts"]:
            comps["minecraft:food"]["using_converts_to"] = f["converts"]
        comps["minecraft:use_animation"] = f["anim"]
        comps["minecraft:use_modifiers"] = {"use_duration": f["dur"], "movement_modifier": 0.33}
    w(f"BP/items/{iid}.json", {"format_version": "1.21.60", "minecraft:item": {
        "description": {"identifier": kb(iid), "menu_category": {"category": C.GROUP_CATEGORY[it["group"]], "group": it["group"]}},
        "components": comps}})
    name(f"item.{kb(iid)}.name", it["zh"], it["en"])
    item_tex[f"kb_{iid}"] = {"textures": f"textures/items/kb_{iid}"}
    shape, c1, c2 = it["art"]
    save_png(paint_item(shape, c1, c2), f"textures/items/kb_{iid}.png")

# --- Oven textures (block JSON from gen_oven_block.mjs) -------------------
for t, kind in [("oven_brick", "brick"), ("oven_top", "brick"), ("oven_chimney", "chimney"), ("oven_door", "door"),
                ("oven_firebox", "firebox"), ("oven_firebox_lit", "firebox_lit")]:  # oven_door = the mouth's inside walls
    tex(f"kb_{t}", f"kb_{t}")
    save_png(paint_block(kind, (156, 90, 60) if t != "oven_top" else (120, 70, 50)), f"textures/blocks/kb_{t}.png")
name(f"tile.{kb('oven')}.name", "烤箱", "Oven")


def oven_mouth_cube(x0, y0, z0, x1, y1, z1, skip=()):
    """A wall of the hollow door block. Faces on the block's outside are firebrick; the rest are the sooty inside."""
    spans = {"north": (x0, x1, y0, y1, z0 == -8), "south": (x0, x1, y0, y1, z1 == 8),
             "west": (z0, z1, y0, y1, x0 == -8), "east": (z0, z1, y0, y1, x1 == 8),
             "up": (x0, x1, z0, z1, y1 == 16), "down": (x0, x1, z0, z1, y0 == 0)}
    faces = {}
    for f, (a0, a1, b0, b1, outer) in spans.items():
        if f in skip:
            continue
        face = {"uv": [a0 + 8, 16 - b1 if f not in ("up", "down") else b0 + 8], "uv_size": [a1 - a0, b1 - b0]}
        if not outer:
            face["material_instance"] = "inside"
        faces[f] = face
    return {"origin": [x0, y0, z0], "size": [x1 - x0, y1 - y0, z1 - z0], "uv": faces}


# The oven's door block: a 10 x 10 x 14 mouth open to the front (+z, turned by the block's facing), so the bake the
# door visual draws inside it (tools/art/visuals.py kind 7) is seen through the door's window or with the door open.
w("RP/models/blocks/oven_mouth.geo.json", {"format_version": "1.21.60", "minecraft:geometry": [{
    "description": {"identifier": f"geometry.{NS}.oven_mouth", "texture_width": 16, "texture_height": 16,
                    "visible_bounds_width": 2, "visible_bounds_height": 2, "visible_bounds_offset": [0, 0.5, 0]},
    "bones": [{"name": "mouth", "pivot": [0, 0, 0], "cubes": [
        oven_mouth_cube(-8, 0, -8, 8, 3, 8),                                              # floor
        oven_mouth_cube(-8, 13, -8, 8, 16, 8),                                            # ceiling
        oven_mouth_cube(-8, 3, -8, -5, 13, 8, skip=("up", "down")),                       # sides
        oven_mouth_cube(5, 3, -8, 8, 13, 8, skip=("up", "down")),
        oven_mouth_cube(-5, 3, -8, 5, 13, -6, skip=("up", "down", "east", "west"))]}]}]})  # back
sounds[kb("oven")] = "stone"

# --- Stations -------------------------------------------------------------
# Directional stations face the player who placed them (models are drawn facing south).
FACING_ROT = {"south": 0, "east": 90, "north": 180, "west": 270}  # +y rotation turns the south-facing front toward east
FACING = {"traits": {"minecraft:placement_direction": {"enabled_states": ["minecraft:cardinal_direction"], "y_rotation_offset": 180}},
          "permutations": [{"condition": f"q.block_state('minecraft:cardinal_direction') == '{d}'",
                            "components": {"minecraft:transformation": {"rotation": [0, r, 0]}}} for d, r in FACING_ROT.items()]}
for st in C.STATIONS:
    sid = st["id"]
    tex(f"kb_{sid}", f"kb_{sid}")
    save_png(paint_block("stripes", st["tex"]), f"textures/blocks/kb_{sid}.png")
    sounds[kb(sid)] = st["sound"]
    it = next(i for i in C.ITEMS if i["id"] == sid)
    name(f"tile.{kb(sid)}.name", it["zh"], it["en"])
    if sid == "herb_planter":
        continue
    gid = f"geometry.{NS}.{sid}"  # RP/models/blocks/<sid>.geo.json, drawn by tools/art/stations.py
    box = ART_OUT["bounds"][sid]
    directional = sid in ART_STATIONS.DIRECTIONAL
    block(sid, {
        "minecraft:geometry": gid,
        "minecraft:material_instances": {"*": {"texture": f"kb_{sid}", "render_method": MAT}},
        "minecraft:collision_box": box, "minecraft:selection_box": box,
        "minecraft:destructible_by_mining": {"seconds_to_destroy": 1.0},
        "minecraft:light_dampening": 0,
        "minecraft:map_color": "#%02X%02X%02X" % tuple(st["tex"][:3]),
        f"{NS}:{sid}": {}
    }, **(FACING if directional else {}))

# --- Crops / bushes ------------------------------------------------------
# RP/models/blocks/cross.geo.json (bushes, saplings) and crop.geo.json (annual crops, '#' layout) come from tools/art.
CROP_META = []
for cp in C.CROPS:
    bid, n = cp["id"], cp["stages"]
    harvest, lo, hi = cp["harvest"]
    for s in range(n):
        tex(f"kb_{bid}_stage_{s}", f"kb_{bid}_stage_{s}")
        save_png(paint_plant_stage(cp["leaf"], cp["fruit"], s, n), f"textures/blocks/kb_{bid}_stage_{s}.png")
    seed = cp["seed"]
    if cp["kind"] == "annual":
        immature = loot(f"crops/{bid}_immature", [pool(seed)])
        mature_pools = [pool(harvest, lo, hi), pool(seed, 1, 2)]
        if cp["bonus"]:
            mature_pools.append(pool(cp["bonus"][0], 1, 1, cp["bonus"][1]))
        mature = loot(f"crops/{bid}_mature", mature_pools)
    else:
        immature = loot(f"crops/{bid}_immature", [pool(seed)])
        mature = loot(f"crops/{bid}_mature", [pool(seed), pool(harvest, lo, hi)])
    perms = []
    for s in range(n):
        hgt = max(4, int(16 * (s + 1) / n))
        perms.append({"condition": cond(GROWTH, s), "components": {
            "minecraft:material_instances": {"*": {"texture": f"kb_{bid}_stage_{s}", "render_method": MAT}},
            "minecraft:selection_box": {"origin": [-6, 0, -6], "size": [12, hgt, 12]},
            "minecraft:loot": mature if s == n - 1 else immature}})
    params = {"max": n - 1, "chance": cp["chance"], "min_light": 9, "kind": cp["kind"],
              "harvest": kb(harvest), "harvest_min": lo, "harvest_max": hi, "reset": cp["reset"], "spread": cp["spread"]}
    block(bid, {
        "minecraft:collision_box": False, "minecraft:light_dampening": 0,
        "minecraft:geometry": f"geometry.{NS}." + ("crop" if cp["kind"] == "annual" else "cross"),
        "minecraft:material_instances": {"*": {"texture": f"kb_{bid}_stage_0", "render_method": MAT}},
        "minecraft:placement_filter": {"conditions": [{"allowed_faces": ["up"], "block_filter": C.PLACE_ON[cp["place_on"]]}]},
        "minecraft:liquid_detection": {"detection_rules": [{"liquid_type": "water", "on_liquid_touches": "popped"}]},
        "minecraft:movable": {"movement_type": "popped"},
        "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.0},
        "minecraft:map_color": "#%02X%02X%02X" % tuple(cp["leaf"][:3]),
        "minecraft:loot": immature,
        "minecraft:tags": ["kaleidoscope:crop"],
        f"{NS}:plant": params
    }, states={GROWTH: {"values": {"min": 0, "max": n - 1}}}, permutations=perms)
    name(f"tile.{kb(bid)}.name", cp["zh"], cp["en"])
    sounds[kb(bid)] = "grass"
    CROP_META.append({"id": kb(bid), "seed": kb(seed), "harvest": kb(harvest), "max": n - 1, "reset": cp["reset"],
                      "kind": cp["kind"], "wild": cp["wild"] or []})
    # Worldgen
    if cp["wild"]:
        soil = ["minecraft:grass_block", "minecraft:dirt", "minecraft:podzol", "minecraft:sand", "minecraft:farmland"]
        w(f"BP/features/{NS}/wild_{bid}.json", {"format_version": "1.21.60", "minecraft:single_block_feature": {
            "description": {"identifier": f"{NS}:wild_{bid}"},
            "places_block": [{"block": {"name": kb(bid), "states": {GROWTH: n - 1}}, "weight": 1}],
            "enforce_placement_rules": False, "enforce_survivability_rules": False,
            "may_replace": ["minecraft:air", "minecraft:short_grass"],
            "may_attach_to": {"bottom": soil if cp["place_on"] != "farmland" else soil[:4]}}})
        w(f"BP/features/{NS}/wild_{bid}_scatter.json", {"format_version": "1.21.120", "minecraft:scatter_feature": {
            "description": {"identifier": f"{NS}:wild_{bid}_scatter"},
            "places_feature": f"{NS}:wild_{bid}",
            "distribution": {"iterations": 4, "x": {"distribution": "gaussian", "extent": [-3, 3]},
                             "y": 0, "z": {"distribution": "gaussian", "extent": [-3, 3]}}}})
        w(f"BP/feature_rules/{NS}/wild_{bid}_rule.json", {"format_version": "1.13.0", "minecraft:feature_rules": {
            "description": {"identifier": f"{NS}:wild_{bid}_rule", "places_feature": f"{NS}:wild_{bid}_scatter"},
            "conditions": {"placement_pass": "after_surface_pass", "minecraft:biome_filter": {
                "any_of": [{"test": "has_biome_tag", "operator": "==", "value": b} for b in cp["wild"]]}},
            "distribution": {"iterations": 1, "x": {"extent": [0, 15], "distribution": "uniform"},
                             "y": "q.heightmap(v.worldx, v.worldz)", "z": {"extent": [0, 15], "distribution": "uniform"},
                             "scatter_chance": {"numerator": 1, "denominator": 24}}}})

# --- Trees ------------------------------------------------------------------
TREE_META = []
for tr in C.TREES:
    sap = tr["sapling"]
    for s in range(3):
        tex(f"kb_{sap}_stage_{s}", f"kb_{sap}_stage_{s}")
        save_png(paint_plant_stage(tr["leaf"], None, s, 3), f"textures/blocks/kb_{sap}_stage_{s}.png")
    sap_loot = loot(f"trees/{sap}", [pool(tr["sapling_item"])])
    block(sap, {
        "minecraft:collision_box": False, "minecraft:light_dampening": 0,
        "minecraft:geometry": f"geometry.{NS}.cross",
        "minecraft:material_instances": {"*": {"texture": f"kb_{sap}_stage_0", "render_method": MAT}},
        "minecraft:placement_filter": {"conditions": [{"allowed_faces": ["up"], "block_filter": C.SOIL}]},
        "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.0},
        "minecraft:loot": sap_loot,
        f"{NS}:tree": {"tree": tr["id"]}
    }, states={GROWTH: {"values": {"min": 0, "max": 2}}},
        permutations=[{"condition": cond(GROWTH, s), "components": {"minecraft:material_instances": {
            "*": {"texture": f"kb_{sap}_stage_{s}", "render_method": MAT}}}} for s in range(3)])
    name(f"tile.{kb(sap)}.name", tr["zh"] + "苗", tr["en"] + " Sapling")
    sounds[kb(sap)] = "grass"
    leaves = tr["leaves"]
    if tr["log"].startswith("minecraft:"):
        log_id = tr["log"]
    else:
        log_id = kb(tr["log"])
        for t, kind in [("side", "log_side"), ("stripped", "log_stripped"), ("top", "log_top")]:
            tex(f"kb_{tr['log']}_{t}", f"kb_{tr['log']}_{t}")
            save_png(paint_block(kind, tr["trunk"]), f"textures/blocks/kb_{tr['log']}_{t}.png")
        mat = lambda side: {"*": {"texture": side, "render_method": "opaque"},
                            "up": {"texture": f"kb_{tr['log']}_top", "render_method": "opaque"},
                            "down": {"texture": f"kb_{tr['log']}_top", "render_method": "opaque"}}
        block(tr["log"], {
            "minecraft:geometry": "minecraft:geometry.full_block",
            "minecraft:material_instances": mat(f"kb_{tr['log']}_side"),
            "minecraft:destructible_by_mining": {"seconds_to_destroy": 2.0},
            "minecraft:flammable": {"catch_chance_modifier": 5, "destroy_chance_modifier": 5},
            "minecraft:map_color": "#%02X%02X%02X" % tuple(tr["trunk"][:3]),
            "minecraft:tags": ["log", "wood"],
            f"{NS}:bark": {"bark": kb(tr["bark"]), "regrow_chance": 6}
        }, states={f"{NS}:stripped": [False, True]}, category="nature",
            permutations=[{"condition": cond(f"{NS}:stripped", True),
                           "components": {"minecraft:material_instances": mat(f"kb_{tr['log']}_stripped")}}])
        name(f"tile.{log_id}.name", tr["zh"][:-1] + "原木", tr["en"].replace("Tree", "Log"))
        name(f"item.{log_id}.name", tr["zh"][:-1] + "原木", tr["en"].replace("Tree", "Log"))
        sounds[log_id] = "wood"
    fruit = tr.get("fruit")
    stages = 4 if fruit else 1
    for s in range(stages):
        tex(f"kb_{leaves}_{s}", f"kb_{leaves}_{s}")
        save_png(paint_block("leaves", tr["leaf"], (250, 235, 90) if fruit and s == stages - 1 else None), f"textures/blocks/kb_{leaves}_{s}.png")
    leaf_base = {
        "minecraft:geometry": "minecraft:geometry.full_block",
        "minecraft:material_instances": {"*": {"texture": f"kb_{leaves}_0", "render_method": MAT}},
        "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.3},
        "minecraft:light_dampening": 1,
        "minecraft:flammable": {"catch_chance_modifier": 30, "destroy_chance_modifier": 60},
        "minecraft:map_color": "#%02X%02X%02X" % tuple(tr["leaf"][:3]),
        "minecraft:loot": loot(f"trees/{leaves}", [pool(tr["sapling_item"], 1, 1, 0.05), pool("minecraft:stick", 1, 2, 0.1)]),
        "minecraft:tags": ["leaves"]
    }
    if fruit:
        ripe = loot(f"trees/{leaves}_ripe", [pool(fruit, 1, 2), pool(tr["sapling_item"], 1, 1, 0.05)])
        leaf_base[f"{NS}:plant"] = {"max": 3, "chance": 10, "min_light": 0, "kind": "perennial", "harvest": kb(fruit),
                                    "harvest_min": 1, "harvest_max": 2, "reset": 0, "spread": False}
        block(leaves, leaf_base, states={GROWTH: {"values": {"min": 0, "max": 3}}}, category="nature",
              permutations=[{"condition": cond(GROWTH, s), "components": {
                  "minecraft:material_instances": {"*": {"texture": f"kb_{leaves}_{s}", "render_method": MAT}},
                  **({"minecraft:loot": ripe} if s == 3 else {})}} for s in range(4)])
    else:
        block(leaves, leaf_base, category="nature")
    name(f"tile.{kb(leaves)}.name", tr["zh"][:-1] + "樹葉", tr["en"].replace("Tree", "Leaves"))
    name(f"item.{kb(leaves)}.name", tr["zh"][:-1] + "樹葉", tr["en"].replace("Tree", "Leaves"))
    sounds[kb(leaves)] = "grass"
    TREE_META.append({"id": tr["id"], "sapling": kb(sap), "log": log_id, "leaves": kb(leaves), "fruit": bool(fruit), "wild": tr["wild"]})
    # Wild trees: a ready-to-grow sapling, it becomes a tree on its next random tick
    w(f"BP/features/{NS}/wild_{sap}.json", {"format_version": "1.21.60", "minecraft:single_block_feature": {
        "description": {"identifier": f"{NS}:wild_{sap}"},
        "places_block": [{"block": {"name": kb(sap), "states": {GROWTH: 2}}, "weight": 1}],
        "enforce_placement_rules": False, "enforce_survivability_rules": False,
        "may_replace": ["minecraft:air", "minecraft:short_grass"],
        "may_attach_to": {"bottom": ["minecraft:grass_block", "minecraft:dirt", "minecraft:podzol"]}}})
    w(f"BP/feature_rules/{NS}/wild_{sap}_rule.json", {"format_version": "1.13.0", "minecraft:feature_rules": {
        "description": {"identifier": f"{NS}:wild_{sap}_rule", "places_feature": f"{NS}:wild_{sap}"},
        "conditions": {"placement_pass": "after_surface_pass", "minecraft:biome_filter": {
            "any_of": [{"test": "has_biome_tag", "operator": "==", "value": b} for b in tr["wild"]]}},
        "distribution": {"iterations": 1, "x": {"extent": [0, 15], "distribution": "uniform"},
                         "y": "q.heightmap(v.worldx, v.worldz)", "z": {"extent": [0, 15], "distribution": "uniform"},
                         "scatter_chance": {"numerator": 1, "denominator": 40}}}})

# --- Herb planter -----------------------------------------------------------
PLANT_STATE = f"{NS}:plant"
# RP/models/blocks/herb_planter.geo.json comes from tools/art (pot + soil in its own atlas; the plant planes use the
# `cross` material instance, swapped per plant and growth stage below).
tex("kb_empty", "kb_empty")
save_png(Image.new("RGBA", (16, 16), T), "textures/blocks/kb_empty.png")


def planter_mat(cross_tex):
    return {"*": {"texture": "kb_herb_planter", "render_method": MAT},
            "cross": {"texture": cross_tex, "render_method": MAT}}


planter_perms = []
for p in C.PLANTER_PLANTS:
    for g in range(4):
        planter_perms.append({"condition": f"{cond(PLANT_STATE, p)} && {cond(GROWTH, g)}",
                              "components": {"minecraft:material_instances": planter_mat(f"kb_{p}_bush_stage_{g}")}})
block("herb_planter", {
    "minecraft:geometry": f"geometry.{NS}.herb_planter",
    "minecraft:material_instances": planter_mat("kb_empty"),
    "minecraft:collision_box": {"origin": [-6, 0, -6], "size": [12, 6.5, 12]},
    "minecraft:selection_box": {"origin": [-6, 0, -6], "size": [12, 12, 12]},
    "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.6},
    "minecraft:light_dampening": 0,
    "minecraft:map_color": "#B4644A",
    f"{NS}:herb_planter": {}
}, states={PLANT_STATE: ["none"] + C.PLANTER_PLANTS, GROWTH: {"values": {"min": 0, "max": 3}}}, permutations=planter_perms)
PLANTER_META = {}
for p in C.PLANTER_PLANTS:
    cp = next(c for c in C.CROPS if c["id"] == f"{p}_bush")
    PLANTER_META[p] = {"seed": kb(cp["seed"]), "harvest": kb(cp["harvest"][0]), "min": cp["harvest"][1], "max": cp["harvest"][2]}

# --- Placeable desserts -----------------------------------------------------
BITES = f"{NS}:bites"
# Models RP/models/blocks/<id>_q<1..4>.geo.json and the atlas textures/blocks/kb_<id>.png come from
# tools/art/desserts.py (round cake / pie, q = quarters left; cut faces show the layers, toppings leave with their slice).
DESSERT_META = {}
for ds in C.DESSERTS:
    did, h = ds["id"], ds["height"]
    tex(f"kb_{did}_block", f"kb_{did}")
    mats = {"*": {"texture": f"kb_{did}_block", "render_method": MAT}}
    whole = loot(f"desserts/{did}", [pool(did)])
    empty = f"loot_tables/{NS}/empty.json"
    block(did, {
        "minecraft:geometry": f"geometry.{NS}.{did}_q4",
        "minecraft:material_instances": mats,
        "minecraft:collision_box": {"origin": [-7, 0, -7], "size": [14, h, 14]},
        "minecraft:selection_box": ART_OUT["desserts"][did]["bounds"],
        "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.3},
        "minecraft:light_dampening": 0,
        "minecraft:loot": whole,
        "minecraft:placement_filter": {"conditions": [{"allowed_faces": ["up"]}]},
        f"{NS}:dessert": {"slices": 4}
    }, states={BITES: {"values": {"min": 0, "max": 3}}},
        permutations=[{"condition": cond(BITES, b), "components": {
            "minecraft:geometry": f"geometry.{NS}.{did}_q{4 - b}",
            "minecraft:loot": whole if b == 0 else empty}} for b in range(1, 4)])
    it = next(i for i in C.ITEMS if i["id"] == did)
    name(f"tile.{kb(did)}.name", it["zh"], it["en"])
    sounds[kb(did)] = "cloth"
    DESSERT_META[kb(did)] = {"nutrition": ds["n"], "saturation": ds["sat"]}
w(f"BP/loot_tables/{NS}/empty.json", {"pools": []})

# --- Placed mug drinks (up to 4 per block) -------------------------------------
# Models RP/models/blocks/mug_<1..4>.geo.json are shared; each drink has its own atlas textures/blocks/kb_drink_<id>.png
# (tools/art/drinks.py). The drink_stack component adds / takes mugs; breaking drops every mug.
CUPS = f"{NS}:cup_count"
for did in C.DRINK_BLOCKS:
    tex(f"kb_{did}_drink", f"kb_drink_{did}")
    perms = [{"condition": cond(CUPS, n), "components": {"minecraft:geometry": f"geometry.{NS}.mug_{n}",
                                                        "minecraft:selection_box": ART_OUT["mugs"][n]}} for n in range(1, 5)]
    block(did, {
        "minecraft:geometry": f"geometry.{NS}.mug_1",
        "minecraft:material_instances": {"*": {"texture": f"kb_{did}_drink", "render_method": MAT}},
        "minecraft:collision_box": False,
        "minecraft:selection_box": ART_OUT["mugs"][1],
        "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.1},
        "minecraft:movable": {"movement_type": "popped"},
        "minecraft:light_dampening": 0,
        "minecraft:loot": f"loot_tables/{NS}/empty.json",
        "minecraft:placement_filter": {"conditions": [{"allowed_faces": ["up"]}]},
        "minecraft:tick": {"interval_range": [50, 110], "looping": True},  # steam now and then
        f"{NS}:drink_stack": {}
    }, states={CUPS: {"values": {"min": 1, "max": 4}}},
        permutations=perms + FACING["permutations"], traits=FACING["traits"])
    it = next(i for i in C.ITEMS if i["id"] == did)
    name(f"tile.{kb(did)}.name", it["zh"], it["en"])
    sounds[kb(did)] = "stone"

# --- Crafting ---------------------------------------------------------------
for rid, pattern, key, count in C.CRAFTING:
    w(f"BP/recipes/crafting/{rid}.json", {"format_version": "1.20.10", "minecraft:recipe_shaped": {
        "description": {"identifier": kb(rid)}, "tags": ["crafting_table"], "pattern": pattern,
        "key": {k: {"item": v} for k, v in key.items()}, "result": {"item": kb(rid), "count": count},
        "unlock": [{"item": v} for v in list(dict.fromkeys(key.values()))[:2]]}})

# --- Catalog / textures / sounds / lang --------------------------------------
groups = {}
for it in C.ITEMS:
    groups.setdefault((C.GROUP_CATEGORY[it["group"]], it["group"]), []).append(kb(it["id"]))
# Tree logs and leaves have no item JSON; without a group they sit loose in the Nature tab.
for tr in TREE_META:
    groups[("nature", C.G_PLANTS)] += [b for b in (tr["log"], tr["leaves"]) if b.startswith(f"{NS}:")]
cats = {}
for (cat, g), ids in groups.items():
    cats.setdefault(cat, []).append({"group_identifier": {"icon": ids[0], "name": g}, "items": ids})
w("BP/item_catalog/crafting_item_catalog.json", {"format_version": "1.21.90", "minecraft:crafting_items_catalog": {
    "categories": [{"category_name": c, "groups": g} for c, g in cats.items()]}})
w("RP/textures/item_texture.json", {"resource_pack_name": "Kaleidoscope Baking", "texture_name": "atlas.items", "texture_data": item_tex})
w("RP/textures/terrain_texture.json", {"resource_pack_name": "Kaleidoscope Baking", "texture_name": "atlas.terrain",
                                       "padding": 8, "num_mip_levels": 4, "texture_data": terrain_tex})
w("RP/blocks.json", {"format_version": "1.21.40", **{k: {"sound": v} for k, v in sounds.items()}})
for g, (zh, en) in C.GROUP_NAMES.items():
    name(g, zh, en)
for key, (zh, en) in MSG.items():
    name(f"{NS}.msg.{key}", zh, en)
PACK = {"zh_TW": ("森羅物語：烘焙", "森羅物語系列擴充：烘焙、甜點與咖啡館飲品。需要森羅物語：廚房。"),
        "en_US": ("Kaleidoscope Baking", "Kaleidoscope add-on: baking, desserts and café drinks. Requires Kaleidoscope Cookery.")}
# Series tooltip convention (as in Cookery): every item / block name carries the add-on name on a second line,
# and anything that can be set down as a block says so on a third.
PLACEABLE = {"food": {"zh_TW": "可放置的食物", "zh_CN": "可放置的食物", "en_US": "Placeable Food"},
             "drink": {"zh_TW": "可放置的飲品", "zh_CN": "可放置的饮品", "en_US": "Placeable Drink"}}
PLACEABLE_KIND = {**{kb(d["id"]): "food" for d in C.DESSERTS}, **{kb(d): "drink" for d in C.DRINK_BLOCKS}}
for l in LANGS:
    mod = PACK["en_US"][0] if l == "en_US" else (zh_cn(PACK["zh_TW"][0]) if l == "zh_CN" else PACK["zh_TW"][0])
    for k in lang[l]:
        m = re.fullmatch(r"(?:item|tile)\.(.+)\.name", k)
        if m:
            lang[l][k] += f"\\n§9§o{mod}§r"
            if m.group(1) in PLACEABLE_KIND:
                lang[l][k] += f"\\n§5{PLACEABLE[PLACEABLE_KIND[m.group(1)]][l]}§r"
for l in LANGS:
    src = PACK["en_US"] if l == "en_US" else PACK["zh_TW"]
    head = [f"pack.name={zh_cn(src[0]) if l == 'zh_CN' else src[0]}", f"pack.description={zh_cn(src[1]) if l == 'zh_CN' else src[1]}"]
    body = head + [""] + [f"{k}={v}" for k, v in sorted(lang[l].items())]
    for pack, lines in (("RP", body), ("BP", head)):
        path = os.path.join(ROOT, pack, "texts", f"{l}.lang")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
for pack in ("RP", "BP"):
    w(f"{pack}/texts/languages.json", LANGS)
STAR_ICON = os.path.join(ROOT, "docs", "branding", "star_icon.png")  # series star icon (docs/branding/make_branding.py)
for pack in (BP, RP):
    p = os.path.join(pack, "pack_icon.png")
    if os.path.exists(STAR_ICON):
        Image.open(STAR_ICON).convert("RGBA").save(p)
    elif FORCE_ART or not os.path.exists(p):
        icon = Image.new("RGBA", (64, 64), (252, 236, 210, 255))
        icon.alpha_composite(paint_item("cake", (250, 236, 200), (250, 250, 245)).resize((48, 48), Image.NEAREST), (8, 10))
        icon.save(p)

# --- JS index for scripts (guidebook, plants, desserts) ----------------------
index = {
    "items": {kb(i["id"]): {"zh_TW": i["zh"], "zh_CN": zh_cn(i["zh"]), "en_US": i["en"], "group": i["group"].split(".")[-1],
                            **({"food": {"nutrition": i["food"]["n"], "saturation": i["food"]["sat"]}} if i["food"] else {})}
              for i in C.ITEMS},
    "groups": {g.split(".")[-1]: {"zh_TW": zh, "zh_CN": zh_cn(zh), "en_US": en} for g, (zh, en) in C.GROUP_NAMES.items()},
    "crops": CROP_META, "trees": TREE_META, "planter": PLANTER_META, "desserts": DESSERT_META,
}
js = ("// GENERATED by tools/gen_content.py from tools/content.py — do not edit by hand.\n"
      f"export const CONTENT = Object.freeze({json.dumps(index, ensure_ascii=False, indent=1)});\n")
path = os.path.join(BP, "scripts", "data", "generated", "content.js")
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, "w", encoding="utf-8") as f:
    f.write(js)

# Remove stale generated JSON (items/blocks that no longer exist in content.py)
for folder in ("BP/items", "BP/blocks", "BP/recipes/crafting", f"BP/loot_tables/{NS}", f"BP/features/{NS}", f"BP/feature_rules/{NS}", "RP/models/blocks"):
    base = os.path.join(ROOT, folder)
    for dirpath, _, files in os.walk(base):
        for fn in files:
            rel = os.path.relpath(os.path.join(dirpath, fn), ROOT)
            if rel.endswith(".json") and rel not in generated and not rel.replace(os.sep, "/").endswith("blocks/oven.json"):
                os.remove(os.path.join(ROOT, rel))
                print("removed stale", rel)

print(f"generated: {len(C.ITEMS)} items, {len(C.CROPS)} crops, {len(C.TREES)} trees, {len(C.DESSERTS)} desserts, "
      f"{len(C.STATIONS)} stations, {len(generated)} JSON files")

# --- Artist asset list (docs/ART_ASSETS.md) -----------------------------------
GROUP_TITLES = {g: zh for g, (zh, en) in C.GROUP_NAMES.items()}
lines = ["# 美術資源清單（給美術）", "",
         "> 此檔由 `tools/gen_content.py` 自動產生，請勿手動編輯。",
         "", "- **方塊模型與方塊貼圖**由 `tools/art/` 以程式繪製（`python tools/art/build_models.py`，產生器也會自動執行）：",
         "  站點、甜點、植物、烤箱。要改外觀請改 `tools/art/*.py`，直接覆蓋這些 PNG 會在下次產生時被蓋掉。",
         "  每次產生都會跑 z-fight 稽核（任何兩個朝同方向的可見面重疊在同一平面就失敗），並全部使用單面材質 `alpha_test_single_sided`。",
         "  預覽圖：`art/previews/`（植物、烤箱）；Blockbench 檢視方式見 `tools/art/README.md`。",
         "- **物品圖示**由 Retro Diffusion 產生：提示詞在 `tools/art/icon_prompts.json`，選圖記錄在 `art/icons/picks.json`，",
         "  `python tools/art/rd_icons.py apply` 寫入 `RP/textures/items/`。",
         "- 方塊貼圖、物品圖示都是 **16×16**（站點與甜點為 64 寬的圖集）；`pack_icon.png` 為 64×64（`BP/`、`RP/` 各一張）。", "",
         "## 烤箱（3×3×3 大型方塊）", "",
         "烤箱由 27 個完整方塊組成，每張貼圖是**一格的一個面**。正面（朝向放置的玩家）中央是爐門，下方中央是火口；頂面中央是煙囪。",
         "", "```", "正面                      頂面",
         "┌─────┬─────┬─────┐      ┌─────┬─────┬─────┐",
         "│brick│brick│brick│      │ top │ top │ top │",
         "│brick│door │brick│      │ top │chimn│ top │",
         "│brick│fire │brick│      │ top │ top │ top │",
         "└─────┴─────┴─────┘      └─────┴─────┴─────┘", "```", "",
         "| 檔名 | 用途 |", "|------|------|",
         "| `textures/blocks/kb_oven_brick.png` | 外牆 |", "| `textures/blocks/kb_oven_top.png` | 頂面 |",
         "| `textures/blocks/kb_oven_chimney.png` | 煙囪 |", "| `textures/blocks/kb_oven_door.png` | 爐門 |",
         "| `textures/blocks/kb_oven_firebox.png` | 火口（熄火） |", "| `textures/blocks/kb_oven_firebox_lit.png` | 火口（燃燒，會發光） |", "",
         "## 站點方塊（自訂模型 + 64 寬材質圖集，`tools/art/stations.py`）", "",
         "咖啡機、手沖架、雪克杯、裱花台、發酵籃會面向放置的玩家（模型以南面為正面）。", "",
         "| 檔名 | 方塊 | 模型 |", "|------|------|------|"]
for st in C.STATIONS:
    it = next(i for i in C.ITEMS if i["id"] == st["id"])
    lines.append(f"| `textures/blocks/kb_{st['id']}.png` | {it['zh']} | `RP/models/blocks/{st['id']}.geo.json` |")
lines += ["", "## 作物 / 灌木（`tools/art/plants.py`；灌木為交叉模型，一年生作物為 # 字模型）", "", "| 植物 | 檔名 |", "|------|------|"]
for cp in C.CROPS:
    lines.append(f"| {cp['zh']} | `textures/blocks/kb_{cp['id']}_stage_0..{cp['stages'] - 1}.png` |")
lines += ["", "## 樹", "", "| 檔名 | 用途 |", "|------|------|"]
for tr in C.TREES:
    lines.append(f"| `textures/blocks/kb_{tr['sapling']}_stage_0..2.png` | {tr['zh']}苗 |")
    if not tr["log"].startswith("minecraft:"):
        lines.append(f"| `textures/blocks/kb_{tr['log']}_side / _stripped / _top.png` | {tr['zh'][:-1]}原木（側面 / 剝皮 / 頂面） |")
    lines.append(f"| `textures/blocks/kb_{tr['leaves']}_*.png` | {tr['zh'][:-1]}樹葉" + ("（0–3 結果階段）" if tr.get("fruit") else "") + " |")
lines += ["", "## 可擺放甜點（`tools/art/desserts.py`；圓形蛋糕 / 派，吃掉一片少一塊，切面露出內層）", "",
          "| 甜點 | 貼圖 | 模型 |", "|------|------|------|"]
for ds in C.DESSERTS:
    it = next(i for i in C.ITEMS if i["id"] == ds["id"])
    lines.append(f"| {it['zh']} | `textures/blocks/kb_{ds['id']}.png` | `RP/models/blocks/{ds['id']}_q1..4.geo.json` |")
lines += ["", "## 放在地上的馬克杯飲品（`tools/art/drinks.py`；一格最多 4 杯，模型 `mug_1..4` 共用）", "",
          "| 飲品 | 貼圖 |", "|------|------|"]
for did in C.DRINK_BLOCKS:
    it = next(i for i in C.ITEMS if i["id"] == did)
    lines.append(f"| {it['zh']} | `textures/blocks/kb_drink_{did}.png` |")
lines += ["", "## 物品圖示 `RP/textures/items/`", ""]
for g, title in GROUP_TITLES.items():
    lines += [f"### {title}", "", "| 檔名 | 物品 |", "|------|------|"]
    lines += [f"| `kb_{i['id']}.png` | {i['zh']} |" for i in C.ITEMS if i["group"] == g]
    lines.append("")
with open(os.path.join(ROOT, "docs", "ART_ASSETS.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

# --- Item icons: the picked Retro Diffusion icons (art/icons) always win over placeholders -----------------
import subprocess  # noqa: E402
subprocess.run([sys.executable, os.path.join(ROOT, "tools", "art", "rd_icons.py"), "apply"], check=True)
