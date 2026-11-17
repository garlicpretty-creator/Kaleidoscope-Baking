// ## Kaleidoscope script role: Guidebook content builder (pure).
// Builds the payload for Cookery's Guidebook Extension API (Cookery
// documentation/KC_GUIDEBOOK_EXTENSION_API.md): one "Baking" tab with every Baking item,
// its recipes (Baking stations AND the Cookery stations Baking registers into), and how-to
// text for each station, in zh_TW / zh_CN / en_US.
import { listRecipes } from "../api/registry.js";
import { CONTENT } from "../data/generated/content.js";
import { COOKERY_REGISTRATIONS } from "./cookeryData.js";

export const GUIDEBOOK_ID = "kaleidoscope_baking:guidebook";
const LOCALES = ["zh_TW", "zh_CN", "en_US"];
const ICON = "textures/items/kb_sponge_cake";

// A representative item for each #tag so the guidebook can show an icon / name.
const TAG_EXAMPLES = {
  "#kaleidoscope:flour": "kaleidoscope_cookery:flour", "#kaleidoscope:egg": "minecraft:egg",
  "#kaleidoscope:milk": "minecraft:milk_bucket", "#kaleidoscope:sweetener": "minecraft:sugar",
  "#kaleidoscope:water": "minecraft:water_bucket", "#kaleidoscope:butter": "kaleidoscope_baking:butter",
  "#kaleidoscope:honey": "minecraft:honey_bottle", "#kaleidoscope:cookie": "kaleidoscope_baking:butter_cookie",
  "#kaleidoscope:cooked_fish": "minecraft:cooked_salmon", "#kaleidoscope:vegetable": "minecraft:carrot",
  "#kaleidoscope:herb": "kaleidoscope_baking:thyme", "#kaleidoscope:dairy": "kaleidoscope_baking:butter",
  "#kaleidoscope:ground_coffee": "kaleidoscope_baking:ground_coffee_medium",
  "#kaleidoscope_baking:whisk": "kaleidoscope_baking:whisk", "#kaleidoscope_baking:frother": "kaleidoscope_baking:milk_frother"
};
const example = spec => (spec.startsWith("#") ? TAG_EXAMPLES[spec] : spec);
const first = slot => (Array.isArray(slot) ? slot : [slot]).map(example).find(Boolean);

const METHODS = {
  mixing_bowl: "攪拌盆 Mixing Bowl", oven: "烤箱 Oven", proofing: "發酵籃 Proofing", decorating: "裱花台 Decorating",
  espresso: "咖啡機 Espresso", pour_over: "手沖架 Pour-Over", shaker: "雪克杯 Shaker",
  millstone: "石磨 Millstone", chopping_board: "砧板 Chopping Board", chopping_board_tool: "砧板 Chopping Board",
  steamer: "蒸籠 Steamer", bamboo_tray: "竹篩 Bamboo Tray", stockpot_exact: "湯鍋 Stockpot", wok: "炒鍋 Wok"
};

/** How-to text shown on station entries. */
const HELP = {
  "kaleidoscope_baking:oven": {
    zh_TW: ["3×3×3 大型烤箱，需要完整空地。", "手持燃料點擊加柴；手持材料放入（共 4 格，模具會自動從背包拿）。", "時間到發出音效時取出才是成品，放太久會烤焦。", "空手取出完成品；潛行空手取出全部。"],
    en_US: ["A 3×3×3 oven: needs a clear space.", "Click with fuel to stoke it; click with dough/batter to load (4 slots, molds come from your inventory).", "Take it out when it chimes; leave it too long and it burns.", "Empty hand: take finished items. Sneak: take everything."]
  },
  "kaleidoscope_baking:mixing_bowl": {
    zh_TW: ["放入最多 9 種材料，用打蛋器攪拌。", "奶泡類配方改用奶泡器。", "空手取回最後一樣；潛行空手全部取回。"],
    en_US: ["Add up to 9 ingredients and stir with a whisk.", "Frothing recipes use the milk frother instead.", "Empty hand takes the last ingredient back; sneak takes all."]
  },
  "kaleidoscope_baking:proofing_basket": {
    zh_TW: ["放入麵團等它發酵（最多 16 個）。", "旁邊有火、點燃的爐子或烤箱會加倍；冰雪會減半。"],
    en_US: ["Put dough in and let it rise (up to 16).", "Heat nearby doubles the speed; snow and ice halve it."]
  },
  "kaleidoscope_baking:decorating_stand": {
    zh_TW: ["先放蛋糕胚或塔殼，再依序放上配料。", "完成時空手點擊取得成品。"],
    en_US: ["Place a cake or tart shell, then add toppings in order.", "Empty hand when finished to take the result."]
  },
  "kaleidoscope_baking:espresso_machine": {
    zh_TW: ["需要紅石訊號才能運作，訊號越強越快。", "用水桶加水，放入咖啡粉（可先加奶泡、焦糖等）。", "完成後空手取出，會從背包使用一個馬克杯。"],
    en_US: ["Needs a redstone signal; stronger signals brew faster.", "Fill with a water bucket, add ground coffee (and milk foam, caramel...).", "Take the drink with an empty hand; uses a Coffee Mug from your inventory."]
  },
  "kaleidoscope_baking:pour_over_stand": {
    zh_TW: ["放入咖啡粉，再手持水桶點擊沖煮。"], en_US: ["Add ground coffee, then click with a water bucket."]
  },
  "kaleidoscope_baking:drink_shaker": {
    zh_TW: ["放入材料後空手搖，最後一下選甜度與冰塊。", "需要外帶杯；手搖飲不能堆疊。"],
    en_US: ["Add ingredients and shake with an empty hand; choose sweetness and ice at the end.", "Needs a Takeaway Cup; shaken drinks don't stack."]
  },
  "kaleidoscope_baking:herb_planter": {
    zh_TW: ["種下香草插枝或草莓，長在室內也可以。"], en_US: ["Plant herb cuttings or strawberries indoors."]
  },
  "kaleidoscope_baking:cake_stand": {
    zh_TW: ["手持整顆蛋糕或派放上去展示，一樣能一片一片吃。", "潛行空手可拿回完整的甜點。"],
    en_US: ["Place a whole cake or pie on it; eat it slice by slice.", "Sneak with an empty hand to take an untouched dessert back."]
  },
  "kaleidoscope_baking:tea_tray": {
    zh_TW: ["放最多 3 個小點心。", "從架上吃東西時，下午茶加成的時間放寬到 60 秒。"],
    en_US: ["Holds up to 3 small treats.", "Eating from it widens the afternoon-tea window to 60 s."]
  },
  "kaleidoscope_baking:bread_display": {
    zh_TW: ["收納 9 格麵包或點心，前 3 格會顯示在櫃子裡。"], en_US: ["Stores 9 stacks of bread or pastries; the first 3 are shown."]
  },
  "kaleidoscope_baking:pastry_case": {
    zh_TW: ["收納 9 格點心，前 3 格會顯示在櫥窗裡。"], en_US: ["Stores 9 stacks of pastries; the first 3 are shown."]
  },
  "kaleidoscope_baking:piping_bag": {
    zh_TW: ["在攪拌盆放 4 片造型餅乾和 1 份色糖霜，用擠花袋點 3 下。"], en_US: ["Put 4 shaped cookies and 1 icing in the mixing bowl, then use the piping bag 3 times."]
  },
  "kaleidoscope_baking:bubble_milk_tea": {
    zh_TW: ["潛行手持手搖飲對方塊頂面使用即可放下（最多 4 杯），甜度與冰塊會保留。"],
    en_US: ["Sneak and use a hand-shaken drink on a block top to put it down (up to 4); sweetness and ice are kept."]
  },
  "kaleidoscope_baking:espresso": {
    zh_TW: ["可以直接放在桌上疊杯（最多 4 杯）。", "咖啡因 +2。短時間喝 3 杯以上會心悸，5 以上嚴重心悸；牛奶、熱可可、茶可以舒緩。"],
    en_US: ["Can be placed and stacked on a table (up to 4).", "Caffeine +2. 3+ causes palpitations, 5+ severe; milk, hot cocoa and tea calm it."]
  }
};

const TEXT = {
  zh_TW: { title: "烘焙", intro: "森羅物語：烘焙的全部物品與配方。", all: "全部", select: "選擇一個項目。", language_note: "語言跟隨食譜書設定。", back: "返回",
    item: "物品", block: "方塊", item_block: "物品＋方塊", settings: "烘焙設定", settings_title: "烘焙設定", save: "儲存",
    auto_convert: "兩個模組都安裝時，自動把烘焙的植物換成主導模組的版本", auto_convert_note: "關閉後只保留配方互通，不會改動世界中的方塊。" },
  en_US: { title: "Baking", intro: "Everything in Kaleidoscope Baking.", all: "All Entries", select: "Select an entry.", language_note: "Uses the guidebook language setting.", back: "Back",
    item: "Item", block: "Block", item_block: "Item + Block", settings: "Baking Settings", settings_title: "Baking Settings", save: "Save",
    auto_convert: "Convert Baking plants to the lead pack's version when both are installed", auto_convert_note: "When off, recipes still accept both versions, but world blocks are left alone." }
};

function recipesFor(id, all) {
  const out = [];
  const add = (method, ingredients, count, time, base) => {
    const ing = ingredients.map(first).filter(Boolean).slice(0, 12);
    if (ing.length && out.length < 24) out.push({ method, ingredients: ing, count: count ?? 1, time: time ?? 0, result: id, ...(base ? { base } : {}) });
  };
  for (const r of all.mixing_bowl) if (r.result === id) add(METHODS.mixing_bowl, [...r.slots, r.tool], r.count);
  for (const r of all.oven) {
    if (r.result === id || r.roast?.includes(id)) add(METHODS.oven, [r.input, r.mold].filter(Boolean), r.count, r.time);
  }
  for (const r of all.proofing) if (r.result === id) add(METHODS.proofing, [r.input], r.count, r.time);
  for (const r of all.decorating) if (r.result === id) add(METHODS.decorating, [r.base, ...r.layers], r.count);
  for (const r of all.espresso) if (r.result === id) add(METHODS.espresso, [r.input, r.additive, r.carrier].filter(Boolean), r.count, r.time);
  for (const r of all.pour_over) if (r.result === id) add(METHODS.pour_over, [r.input, "minecraft:water_bucket", r.carrier], r.count);
  for (const r of all.shaker) if (r.result === id) add(METHODS.shaker, [...r.slots, r.carrier].filter(Boolean), r.count);
  for (const c of COOKERY_REGISTRATIONS.recipes) {
    const r = c.recipe;
    const outs = r.outputs ? r.outputs.map(o => o.id) : [r.result];
    if (!outs.includes(id)) continue;
    const ings = r.ingredients ?? [r.input, r.tool].filter(Boolean);
    add(METHODS[c.kind] ?? c.kind, ings, r.count ?? r.outputs?.[0]?.count, r.time ?? r.duration, r.base);
  }
  return out;
}

export function buildGuidebook(version = "1") {
  const all = listRecipes();
  const categories = Object.entries(CONTENT.groups).map(([gid, n]) => ({ id: gid, labelKey: `cat_${gid}`, fallback: n.en_US, icon: "" }));
  const entries = [];
  const names = { zh_TW: {}, zh_CN: {}, en_US: {} };
  for (const [id, it] of Object.entries(CONTENT.items)) {
    const short = id.split(":")[1];
    const help = HELP[id];
    const mechanicsByLocale = {};
    if (help) for (const l of LOCALES) mechanicsByLocale[l] = help[l] ?? help.zh_TW;
    entries.push({
      id, category: it.group, kinds: ["item"], icon: `textures/items/kb_${short}`,
      ...(it.food ? { food: it.food } : {}),
      recipes: recipesFor(id, all),
      mechanics: help?.en_US ?? [],
      mechanicsByLocale
    });
    for (const l of LOCALES) names[l][id] = it[l];
  }
  const text = {};
  for (const l of LOCALES) {
    const base = TEXT[l] ?? (l === "zh_CN" ? TEXT.zh_TW : TEXT.en_US);
    text[l] = { ...base };
    for (const [gid, n] of Object.entries(CONTENT.groups)) text[l][`cat_${gid}`] = n[l];
  }
  return {
    api: 1, id: GUIDEBOOK_ID, version, order: 200, icon: ICON,
    titleKey: "title", introKey: "intro", allKey: "all", selectKey: "select", languageNoteKey: "language_note", backKey: "back",
    showIds: false, categories, entries, names, text,
    actions: [{
      id: "settings", type: "form", labelKey: "settings", fallback: "Baking Settings", icon: "",
      form: {
        titleKey: "settings_title", titleFallback: "Baking Settings", submitKey: "save", submitFallback: "Save",
        responseEvent: "kaleidoscope_baking:settings_changed",
        fields: [
          // ## Cookery stores this per player (in Cookery's own property scope), so the form shows
          // the value this player last saved; the world-wide setting is applied via responseEvent.
          { id: "auto_convert", type: "toggle", labelKey: "auto_convert", fallback: "Auto-convert plants", default: true, property: "kaleidoscope_baking:auto_convert" },
          { id: "note", type: "label", textKey: "auto_convert_note", fallback: "" }
        ]
      }
    }]
  };
}
