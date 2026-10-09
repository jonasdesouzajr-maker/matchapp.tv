"""Render MatchApp Ai's padded gold-ring/play/star Android launcher assets."""
from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFilter

BASE = Path(r"C:\Users\jonas\matchapp-android-jonas-test-20261009\android-studio\app\src\main\res")
OUT = Path(r"C:\Users\jonas\Downloads\MatchApp-Ai-Jonas-New-Icon-20261009.png")
S = 1536
C = S // 2

def gradient_background():
    img = Image.new("RGB",(S,S))
    px = img.load()
    for y in range(S):
        for x in range(S):
            rr = math.hypot(x-C, y-C) / S
            v = min(1, rr * 1.2)
            aura = max(0,1-math.hypot((x-C)/S, (y-(C-170))/S)*1.65)
            px[x,y] = (int(23+12*aura-8*v),int(10+2*aura-2*v),int(34+25*aura-4*v))
    return img.convert("RGBA")

def ring(layer,cx,cy,r,width,colors):
    dr = ImageDraw.Draw(layer)
    for i in range(width):
        t=i/max(1,width-1)
        color=tuple(int(colors[0][q]*(1-t)+colors[1][q]*t) for q in range(3))+(255,)
        dr.ellipse((cx-r+i,cy-r+i,cx+r-i,cy+r-i),outline=color,width=2)

bg=gradient_background()
art=Image.new("RGBA",(S,S),(0,0,0,0))
glow=Image.new("RGBA",(S,S),(0,0,0,0))
gd=ImageDraw.Draw(glow)
# Keep all artwork inside the launcher safe circle (diameter ~ 950 on a 1536 canvas).
gd.ellipse((C-405,C-405,C+405,C+405),outline=(245,181,58,135),width=35)
bg=Image.alpha_composite(bg,glow.filter(ImageFilter.GaussianBlur(82)))
ring(art,C,C,404,13,((250,216,142),(174,115,33)))
ring(art,C,C,377,8,((132,79,29),(255,225,151)))
# Sunlight arc, never at the mask boundary.
ad=ImageDraw.Draw(art)
ad.arc((C-390,C-390,C+390,C+390),195,298,fill=(255,233,161,240),width=10)
ad.arc((C-383,C-383,C+383,C+383),4,72,fill=(245,198,111,195),width=8)
# Play insignia: spacious, with a 3-D gold face.
tri=[(C-114,C-190),(C+209,C),(C-114,C+190)]
shadow=Image.new("RGBA",(S,S),(0,0,0,0))
sd=ImageDraw.Draw(shadow)
sd.polygon([(x+16,y+21) for x,y in tri], fill=(0,0,0,190))
bg=Image.alpha_composite(bg,shadow.filter(ImageFilter.GaussianBlur(35)))
ad.polygon(tri,fill=(244,197,95,255))
ad.line([tri[0],tri[1],tri[2],tri[0]],fill=(255,237,171,255),width=12,joint="curve")
ad.polygon([(C-83,C-143),(C+151,C),(C-83,C+143)],fill=(160,97,30,205))
ad.line([(C-81,C-140),(C+155,C)],fill=(255,244,197,245),width=10)
# Four-point star rides just inside the medallion.
star_x,star_y=C+235,C-240
def star_points(cx,cy,radius,small):
    return [(round(cx+math.cos(-math.pi/2+i*math.pi/4)*(radius if i%2==0 else small)),
             round(cy+math.sin(-math.pi/2+i*math.pi/4)*(radius if i%2==0 else small))) for i in range(8)]
ad.polygon(star_points(star_x,star_y,78,24),fill=(255,226,136,255))
ad.line(star_points(star_x,star_y,78,24)+[star_points(star_x,star_y,78,24)[0]],fill=(255,251,223,255),width=5)
ad.ellipse((star_x-10,star_y-10,star_x+10,star_y+10),fill=(255,255,246,255))
combined=Image.alpha_composite(bg,art).convert("RGB")
OUT.parent.mkdir(parents=True,exist_ok=True)
combined.resize((1024,1024),Image.Resampling.LANCZOS).save(OUT,optimize=True)
# Legacy assets use the complete dark/plum square artwork.
for dpi,size in [("mdpi",48),("hdpi",72),("xhdpi",96),("xxhdpi",144),("xxxhdpi",192)]:
    target=BASE/f"mipmap-{dpi}"
    target.mkdir(exist_ok=True,parents=True)
    icon=combined.resize((size,size),Image.Resampling.LANCZOS)
    icon.save(target/"ic_launcher.png",optimize=True)
    icon.save(target/"ic_launcher_round.png",optimize=True)
# Adaptive icon uses transparency beyond the art so the system owns its mask.
adaptive=Image.new("RGBA",(S,S),(0,0,0,0))
adaptive=Image.alpha_composite(adaptive,art)
adaptive.resize((432,432),Image.Resampling.LANCZOS).save(BASE/"drawable"/"ic_launcher_foreground.png",optimize=True)
print("ICON_MASTER="+str(OUT))
print("ICON_MASTER_BYTES="+str(OUT.stat().st_size))
print("ICON_DONE=1")
