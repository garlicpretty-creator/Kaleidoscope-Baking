"""Player-facing strings: key -> (zh_TW, en_US). zh_CN is converted automatically.
Keys are prefixed with `kaleidoscope_baking.msg.` in the .lang files.

Baking is immersive: stations never show on-screen text (sound, particles and the station visuals
are the feedback). The only strings left are the hand-shaken drink form (sweetness / ice) and the
sweetness / ice names shown in a drink's tooltip. Keep %s placeholder counts equal across languages."""

MSG = {
    "shaker.form_title": ('客製化飲料', 'Customize your drink'),
    "shaker.form_sweet": ('甜度', 'Sweetness'),
    "shaker.form_ice": ('冰塊', 'Ice'),
    "sweet.full": ('全糖', 'Full sugar'),
    "sweet.less": ('少糖', 'Less sugar'),
    "sweet.half": ('半糖', 'Half sugar'),
    "sweet.light": ('微糖', 'Light sugar'),
    "sweet.none": ('無糖', 'No sugar'),
    "sweet.stevia": ('甜菊無糖', 'Stevia (sugar-free)'),
    "ice.regular": ('正常冰', 'Regular ice'),
    "ice.less": ('少冰', 'Less ice'),
    "ice.light": ('微冰', 'Light ice'),
    "ice.none": ('去冰', 'No ice'),
    "ice.warm": ('溫', 'Warm'),
    "ice.hot": ('熱', 'Hot'),
}
