# Generates docs/branding/banner.png and star_icon.png (Kaleidoscope series style).
# Usage: python3 docs/branding/make_branding.py docs/branding
import sys
from PIL import Image
out = sys.argv[1]
W,H,S = 78,48,20
C = dict(
 bg=(192,192,196), frame=(48,48,51), shadow=(128,128,133), black=(0,0,0),
 mid=(224,98,143), dark=(140,31,72), light=(255,214,228), inner=(17,17,17), innershade=(51,51,51),
 txt=(255,214,228), txts=(224,98,143),
 sl=(255,176,204), sd=(168,40,79),
 y=(255,242,0), yh=(255,250,170), ys=(250,200,30), yd=(240,165,15),
)
def frame(W,H):
  im = Image.new("RGBA",(W,H),C['bg']); p=im.load()
  def rect(x0,y0,x1,y1,c):
    for x in range(x0,x1+1):
        for y in range(y0,y1+1): p[x,y]=c
  rect(2,2,W-1,H-1,C['shadow']); rect(1,1,W-2,H-2,C['frame']); rect(2,2,W-3,H-3,C['black'])
  rect(3,3,W-4,H-4,C['mid']); rect(4,4,W-5,H-5,C['dark']); rect(5,5,W-6,H-6,C['inner'])
  rect(W-6,5,W-6,H-6,C['innershade']); rect(5,H-6,W-6,H-6,C['innershade'])
  for (cx,cy,dx,dy) in [(3,3,1,1),(W-4,3,-1,1),(3,H-4,1,-1),(W-4,H-4,-1,-1)]:
    for i in range(3):
        p[cx+dx*i,cy]=C['light']; p[cx,cy+dy*i]=C['light']
    p[cx+dx,cy+dy]=C['light']
    for k,col in ((3,'dark'),(4,'light'),(5,'dark')):
        if 3+k < min(W,H)//2:
            p[cx+dx*k,cy]=C[col]; p[cx,cy+dy*k]=C[col]
  return im
img = frame(W,H); px = img.load()

def sprite(rows, pal, ox, oy, target=None):
    t = target if target else px
    for j,r in enumerate(rows):
        for i,ch in enumerate(r):
            if ch!='.': t[ox+i,oy+j]=pal[ch]

# --- star: traced 1:1 from the series banners (L/D = outline light/dark, l = dot) ---
STAR = [
"......LLLD.......",
"......LppD.......",
"....LLLppDLL.....",
"....LppyyooD.....",
"LLLLLppyyooDLLLL.",
"LppppyyyyyyyyooD.",
"LppppyyyyyyyyooD.",
"LppyyyyyyyyooooD.",
"LppyyyyyyyyooooD.",
"LDDppyyyyyyooDDD.",
"..LppyyyyyyooD...",
"..LppyyooyyooD...",
"..LppyyooyyooD...",
"..LooooDDooooD...",
"..LooooD.ooooD.lD",
"..LDDDDD.DDDDD.DD",
]
spal = {'L':C['sl'],'D':C['sd'],'l':C['light'],'p':(254,252,57),'y':(255,238,5),'o':(254,195,30)}
sw,sh = len(STAR[0]),len(STAR)
sprite(STAR,spal,31,7)
# --- side icons: the add-on's own item textures, 1 texel = 1 unit ---
import os
ITEMS = os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","..","RP","textures","items")
ITEMS = os.environ.get("KB_ITEMS", ITEMS)
def paste_item(name, ox, oy):
    it = Image.open(os.path.join(ITEMS,"kb_%s.png"%name)).convert("RGBA")
    img.alpha_composite(it,(ox,oy))
paste_item("croissant", 11, 7)
paste_item("strawberry_cream_cake", 52, 7)
# --- font (matches series banners: 1px light strokes + 1px right drop-shade) ---
F = {
'K':["#..#","#.#.","##..","#.#.","#..#"],
'A':["####","#..#","####","#..#","#..#"],
'L':["#..","#..","#..","#..","###"],
'E':["###","#..","###","#..","###"],
'I':["#","#","#","#","#"],
'D':["###.","#..#","#..#","#..#","###."],
'O':["####","#..#","#..#","#..#","####"],
'S':["###","#..","###","..#","###"],
'C':["###","#..","#..","#..","###"],
'P':["####","#..#","####","#..",  "#.."],
'B':["###.","#..#","###.","#..#","###."],
'N':["#..#","##.#","#.##","#..#","#..#"],
'G':["####","#...","#.##","#..#","####"],
}
def textw(s): return sum(len(F[c][0])+2 for c in s)-1
def text(s,y):
    x = 5 + (68-textw(s))//2
    for ch in s:
        g=F[ch]; w=len(g[0])
        for j,r in enumerate(g):
            r=r.ljust(w,'.')
            for i,v in enumerate(r):
                if v!='#': continue
                px[x+i,y+j]=C['txt']
                if i+1>=w or r[i+1]!='#': px[x+i+1,y+j]=C['txts']
        x+=w+2
text("KALEIDOSCOPE",27)
text("BAKING",34)
img.convert("RGB").resize((W*S,H*S),Image.NEAREST).save(out+"/banner.png")
# framed star icon, 32x32 grid -> 256px
IW=32
ic=frame(IW,IW); ip=ic.load()
sprite(STAR,spal,(IW-sw)//2+1,(IW-sh)//2,ip)
ic.convert("RGB").resize((256,256),Image.NEAREST).save(out+"/star_icon.png")
