#!/usr/bin/env python3
"""Generate item icons with the Retro Diffusion API (https://retrodiffusion.ai).

    RD_API_KEY=rdpk-... python bedrock/tools/rd_generate.py [item ...] [--n 2] [--check-cost]

Writes candidates to bedrock/art/rd/<item>_<n>.png. Copy the one you like to
bedrock/art/icons/<item>.png; build.py uses that file instead of the hand-drawn grid.
In a Claude Code cloud session the key is injected by the network proxy, so RD_API_KEY
can be left unset there.
"""
import argparse
import base64
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

API = "https://api.retrodiffusion.ai/v2"
STYLE = "rd_plus__mc_item"
OUT = Path(__file__).resolve().parents[1] / "art" / "rd"
SUFFIX = ", cute bakery dessert, warm colors"

PROMPTS = {
    "flour": "small cloth sack of flour tied with string, white flour spilling",
    "butter": "block of pale yellow butter on wax paper",
    "dough": "round ball of soft beige bread dough",
    "sweet_dough": "round ball of pale cookie dough with pink sprinkles",
    "whipped_cream": "light blue ceramic bowl full of white whipped cream swirl",
    "chocolate_bar": "chocolate bar half unwrapped in red wrapper",
    "toast": "slice of white bread toast with golden crust",
    "butter_cookie": "round golden butter cookie with chocolate chips",
    "croissant": "golden flaky croissant, crescent shape",
    "egg_tart": "portuguese egg tart, yellow custard with brown caramelized spots, flaky crust",
    "macaron": "pink french macaron with white cream filling",
    "pudding": "caramel custard pudding on small blue plate, brown caramel top",
    "cream_puff": "cream puff choux pastry filled with white cream",
    "cinnamon_roll": "cinnamon roll spiral with white icing",
    "berry_cake_slice": "slice of strawberry shortcake, white cream layers, red berry on top",
    "chocolate_cake_slice": "slice of chocolate layer cake with cream layers, cherry on top",
    "raw_croissant": "raw unbaked croissant dough, pale beige crescent shape",
    "raw_cookies": "three raw cookie dough balls with chocolate chips, pale dough",
    "raw_egg_tart": "unbaked egg tart, pale raw pastry shell filled with glossy liquid yellow custard",
    "raw_macaron": "raw pink macaron shells piped on white parchment paper",
    "raw_pudding": "small ramekin of raw liquid pale yellow custard",
    "raw_cream_puff": "raw pale choux pastry dough mounds piped on parchment",
    "raw_cinnamon_roll": "raw unbaked pale cinnamon roll dough spiral with brown cinnamon swirl",
    "raw_berry_cake": "round metal cake pan filled with raw vanilla cake batter and red berries",
    "raw_chocolate_cake": "round metal cake pan filled with raw glossy chocolate cake batter",
}


# Plants: growth-stage sprites (bottom-anchored) and new crop items
PLANT_SUFFIX = ", minecraft crop plant sprite, side view, rooted at the bottom edge"
ITEM_SUFFIX_PLAIN = ", minecraft item"
PROMPTS.update({
    "strawberry": "ripe red strawberry with green leafy top",
    "vanilla_pod": "two long dark brown vanilla bean pods",
    "cinnamon_stick": "single long thin cinnamon stick, rolled reddish brown bark quill, diagonal",
    "cinnamon_sapling": "small cinnamon tree sapling with glossy green leaves",
    "strawberry_bush_0": "tiny green seedling sprout with two small leaves",
    "strawberry_bush_1": "small low green strawberry plant with serrated leaves",
    "strawberry_bush_2": "low strawberry bush with white flowers and green leaves",
    "strawberry_bush_3": "low strawberry bush with many ripe red strawberries and green leaves",
    "vanilla_vine_0": "tiny green vine sprout curling up",
    "vanilla_vine_1": "young green vine climbing a short wooden stick",
    "vanilla_vine_2": "green vine with pale yellow orchid flowers climbing a wooden stick",
    "vanilla_vine_3": "thin green vine climbing a wooden stick with several long dark brown vanilla bean pods hanging down",
    "cinnamon_shrub_0": "tiny tree sapling sprout with two leaves",
    "cinnamon_shrub_1": "small young shrub with glossy green leaves",
    "cinnamon_shrub_2": "medium shrub with green and reddish young leaves and thin brown stems",
    "cinnamon_shrub_3": "tall bushy shrub with thick reddish brown bark stems and dense green leaves",
})


def suffix_for(name):
    if name[-2:] in ("_0", "_1", "_2", "_3"):
        return PLANT_SUFFIX
    if name in ("strawberry", "vanilla_pod", "cinnamon_stick", "cinnamon_sapling"):
        return ITEM_SUFFIX_PLAIN
    return SUFFIX


def call(method, path, payload=None):
    headers = {"Content-Type": "application/json"}
    key = os.environ.get("RD_API_KEY")
    if key:
        headers["X-RD-Token"] = key
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def generate(name, n, seed, check_cost):
    payload = {
        "prompt": PROMPTS[name] + suffix_for(name),
        "prompt_style": STYLE,
        "width": 16,
        "height": 16,
        "num_images": n,
        "remove_bg": True,
        "seed": seed,
    }
    if check_cost:
        payload["check_cost"] = True
        res = call("POST", "/inferences", payload)
        print(f"{name}: cost {res.get('balance_cost')} (uses {res.get('would_use')})")
        return
    res = call("POST", "/inferences", payload)
    if "task_id" in res:
        while True:
            time.sleep(3)
            task = call("GET", f"/inferences/tasks/{res['task_id']}")
            status = task.get("status")
            if status in ("succeeded", "completed", "success") or task.get("result"):
                res = task.get("result", task)
                break
            if status in ("failed", "error", "cancelled"):
                raise SystemExit(f"{name}: task {status}: {task}")
    OUT.mkdir(parents=True, exist_ok=True)
    for i, b64 in enumerate(res.get("base64_images", []), 1):
        p = OUT / f"{name}_{i}.png"
        p.write_bytes(base64.b64decode(b64))
        print("wrote", p)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("items", nargs="*", help="item ids (default: all)")
    ap.add_argument("--n", type=int, default=2, help="candidates per item")
    ap.add_argument("--seed", type=int, default=1234)
    ap.add_argument("--check-cost", action="store_true")
    args = ap.parse_args()
    for name in args.items or PROMPTS:
        if name not in PROMPTS:
            sys.exit(f"unknown item {name}")
        generate(name, args.n, args.seed, args.check_cost)


if __name__ == "__main__":
    main()
