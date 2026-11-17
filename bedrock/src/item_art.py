"""16x16 hand-placed pixel art for item icons.

Each grid row is padded on the right with '.' (transparent) up to 16 chars.
Edit a grid, then run `python bedrock/build.py` to regenerate the PNGs.
"""

PALETTE = {
    ".": None,
    "o": "#3b2a26",  # outline
    "h": "#fffbe6",  # highlight
    "w": "#ffffff",  # white
    "W": "#d9d4c7",  # white shadow
    "c": "#fff4dc",  # cream
    "C": "#e6cfa3",  # cream shadow
    "d": "#8a4b2a",  # bread dark
    "m": "#c9803f",  # bread mid
    "l": "#f0c27a",  # bread light
    "n": "#f2dcb0",  # dough
    "N": "#d4b07a",  # dough shadow
    "u": "#fbe38c",  # butter
    "U": "#dbb24f",  # butter shadow
    "r": "#d9415a",  # berry red
    "R": "#8f2438",  # berry dark
    "k": "#6b3c2a",  # chocolate
    "K": "#3e2219",  # chocolate dark
    "y": "#f7d154",  # custard
    "Y": "#d99a2b",  # custard dark / caramel
    "p": "#f6b3c8",  # pink
    "P": "#c96b8f",  # pink dark
    "b": "#d8c39a",  # burlap
    "B": "#9c8559",  # burlap dark
    "q": "#86bce0",  # ceramic blue
    "Q": "#4f7fa8",  # ceramic blue dark
    "g": "#b7c0ca",  # metal
    "G": "#6b7580",  # metal dark
    "t": "#c08a55",  # wood
    "T": "#8a5a32",  # wood dark
    "s": "#fde9a8",  # sugar glaze
}

ITEMS = {
    # ---------------- ingredients ----------------
    "flour": [
        "",
        "......oooo",
        ".....obbbbo",
        "......oBBo",
        ".....obbbbo",
        "....obbbbbbo",
        "...obbbwwbbbo",
        "...obbwwwwbbo",
        "..obbbwwwwbbbo",
        "..obbbbwwbbbbo",
        "..obbbbbbbbbbo",
        "..oBbbbbbbbbBo",
        "..oBBbbbbbbBBo",
        "...oBBBBBBBBo",
        "....oooooooo",
    ],
    "butter": [
        "",
        "",
        "",
        "",
        "....oooooooooo",
        "...ohuuuuuuuuo",
        "..ohuuuuuuuuUo",
        ".oooooooooooUo",
        ".ouuuuuuuuuoUo",
        ".ouuuuuuuuuoUo",
        ".oUuuuuuuuuoo",
        ".oUUUUUUUUUo",
        "wwwwwwwwwwwwwww",
        ".WWWWWWWWWWWWW",
    ],
    "dough": [
        "",
        "",
        "",
        "",
        "......oooo",
        "....oohnnnoo",
        "...ohhnnnnnno",
        "..ohnnnnnnnnno",
        "..onnnnnnnnnno",
        "..onnnnnnnnnNo",
        "..oNnnnnnnnNNo",
        "...oNNnnnNNNo",
        "....ooNNNNoo",
        "......oooo",
    ],
    "sweet_dough": [
        "",
        "",
        "",
        "",
        "......oooo",
        "....oohpnnoo",
        "...ohhnnpnnno",
        "..ohnpnnnnnpno",
        "..onnnnpnnnnno",
        "..onpnnnnnpnNo",
        "..oNnnnpnnnNNo",
        "...oNNnnnNNNo",
        "....ooNNNNoo",
        "......oooo",
    ],
    "whipped_cream": [
        "",
        ".......oo",
        "......owwo",
        ".....owhwwo",
        "......owwWo",
        "....oowwwwWoo",
        "...owwwwwwwwWo",
        "..oowwwwwwwwWoo",
        "..oqqqqqqqqqqqo",
        "...oqhqqqqqqqo",
        "...oQqqqqqqqQo",
        "....oQQQQQQQo",
        ".....ooooooo",
    ],
    "chocolate_bar": [
        "",
        "",
        "...oooooooooo",
        "..okkkokkkokko",
        "..okkKokkKokKo",
        "..ooooooooooo",
        "..okkkokkkokko",
        "..okkKokkKokKo",
        "..ooooooooooo",
        "..orrrrrrrrrro",
        "..owwwwwwwwwwo",
        "..orrrrrrrrrro",
        "..oRRRRRRRRRRo",
        "...oooooooooo",
    ],
    # ---------------- desserts ----------------
    "toast": [
        "",
        "",
        "....oooooooo",
        "...odmmmmmmdo",
        "..odmlllllllmdo",
        "..omlnnnnnnnlmo",
        "..omnnnnnnnnnmo",
        "..odmnnnnnnnmdo",
        "...omnnnnnnnmo",
        "...omnnnnnnnmo",
        "...omnnnnnnnmo",
        "...omnnnnnnnmo",
        "...odmmmmmmmdo",
        "....ooooooooo",
    ],
    "butter_cookie": [
        "",
        "",
        "",
        ".....oooooo",
        "...oollllllloo",
        "..olllmlllkllo",
        "..ollkllllllmlo",
        ".olllllmllllllo",
        ".ollmllllkllllo",
        ".olllllllllmllo",
        ".omllkllmllllmo",
        "..ommllllllmmo",
        "..oommmmmmmmoo",
        "....oooooooo",
    ],
    "croissant": [
        "",
        "",
        "",
        "",
        "......oooo",
        "....oolllloo",
        "..oolmlmlmllo",
        ".olmldlmldlmlo",
        "olmldmlmlmdlmo",
        "omldmmmmmmmdmo",
        "oddo.odddo.oddo",
        ".oo...ooo...oo",
    ],
    "egg_tart": [
        "",
        "",
        "",
        "",
        "...oooooooooo",
        "..olllllllllllo",
        ".olyyyYyyyyyyylo",
        ".olyYyyyyyYyyylo",
        ".olyyyyYyyyyyylo",
        "..olllllllllllo",
        "..omdmdmdmdmdmo",
        "...omdmdmdmdmo",
        "....ooooooooo",
    ],
    "macaron": [
        "",
        "",
        "",
        "....oooooooo",
        "...ohppppppppo",
        "..ohpppppppppPo",
        "..opppppppppPPo",
        "..oPPPPPPPPPPPo",
        "..owwwwwwwwwwwo",
        "..oPPPPPPPPPPPo",
        "..opppppppppPPo",
        "..oPPPPPPPPPPPo",
        "...ooooooooooo",
    ],
    "pudding": [
        "",
        "",
        ".....oooooo",
        "....oYYYYYYo",
        "....oYdYYdYo",
        "...oyyYYYYyyo",
        "...ohyyyyyyyo",
        "...oyyyyyyyyo",
        "..ohyyyyyyyyyo",
        "..oyyyyyyyyyYo",
        ".ooYyyyyyyyYYoo",
        "oqqqqqqqqqqqqqqo",
        ".oQQQQQQQQQQQQo",
        "..oooooooooooo",
    ],
    "cream_puff": [
        "",
        "",
        "",
        ".....oooooo",
        "...oolhwlhlloo",
        "..olllmlllmlllo",
        "..omlwlmlwlmlmo",
        "..ooooooooooooo",
        "..owwwwwwwwwwwo",
        "..oWwwwwwwwwwWo",
        "..ooooooooooooo",
        "..olmlmmlmmlmlo",
        "...ommmmmmmmmo",
        "....ooooooooo",
    ],
    "cinnamon_roll": [
        "",
        "",
        "",
        "....oooooooo",
        "...ollmmmmmllo",
        "..olmmllllmmmlo",
        "..omlsmmmmslmmo",
        "..omlmmlsmmlmmo",
        "..omlmsmdmmlmmo",
        "..omlmmssmlmlmo",
        "..ommlllllllmmo",
        "...ommmmmmmmmo",
        "...oddddddddo",
        "....oooooooo",
    ],
    "berry_cake_slice": [
        "",
        "",
        "..........oo",
        "........oorRo",
        "......oowcrRo",
        "....oowwwwwwo",
        "..oowwwwwwwwo",
        ".owwwwwwwwwWo",
        ".ollllllllllo",
        ".orrrrrrrrrRo",
        ".owwwwwwwwwWo",
        ".ollllllllllo",
        ".ommmmmmmmmmo",
        ".oooooooooooo",
    ],
    "chocolate_cake_slice": [
        "",
        "",
        "..........oo",
        "........oowhRo",
        "......ookkrRo",
        "....ookkkkkko",
        "..ookkkkkkkko",
        ".okkkkkkkkkKo",
        ".oKKKKKKKKKKo",
        ".occcccccccCo",
        ".okkkkkkkkkKo",
        ".occcccccccCo",
        ".oKKKKKKKKKKo",
        ".oooooooooooo",
    ],
}

# Food stats: nutrition, saturation_modifier, optional container returned after eating
FOOD = {
    "toast": (5, 0.6, None),
    "butter_cookie": (2, 0.3, None),
    "croissant": (6, 0.7, None),
    "egg_tart": (5, 0.6, None),
    "macaron": (3, 0.4, None),
    "pudding": (6, 0.6, "minecraft:bowl"),
    "cream_puff": (5, 0.5, None),
    "cinnamon_roll": (7, 0.6, None),
    "berry_cake_slice": (6, 0.5, None),
    "chocolate_cake_slice": (7, 0.6, None),
    "dough": (1, 0.1, None),
    "sweet_dough": (2, 0.2, None),
}
