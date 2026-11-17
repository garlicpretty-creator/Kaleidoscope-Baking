"""Player-facing strings: key -> (zh_TW, en_US). zh_CN is converted automatically.
Series rule: NO on-screen text prompts (no actionbar / chat / title). Players read state from
the blocks, particles and sounds; refusals use runtime.refuse(). Only strings that appear in a
form the player opens on purpose, or in item lore, belong here.
Keys are prefixed with `kaleidoscope_baking.msg.` in the .lang files. Keep the number of
%s placeholders identical across languages (tools/validate.py checks this)."""

MSG = {
    # Shaker customisation form (opened deliberately) + the sweetness / ice item lore
    "shaker.form_title": ("客製化飲料", "Customize your drink"),
    "shaker.form_sweet": ("甜度", "Sweetness"),
    "shaker.form_ice": ("冰塊", "Ice"),
    "sweet.full": ("全糖", "Full sugar"), "sweet.less": ("少糖", "Less sugar"), "sweet.half": ("半糖", "Half sugar"),
    "sweet.light": ("微糖", "Light sugar"), "sweet.none": ("無糖", "No sugar"), "sweet.stevia": ("甜菊無糖", "Stevia (sugar-free)"),
    "ice.regular": ("正常冰", "Regular ice"), "ice.less": ("少冰", "Less ice"), "ice.light": ("微冰", "Light ice"),
    "ice.none": ("去冰", "No ice"), "ice.warm": ("溫", "Warm"), "ice.hot": ("熱", "Hot"),
}
