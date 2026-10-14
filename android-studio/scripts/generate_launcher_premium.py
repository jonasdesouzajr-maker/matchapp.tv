#!/usr/bin/env python3
"""Build Android, Play and PWA launcher assets from the exact owner-approved purple/gold icon.
Never changes Kids artwork or product functionality.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib

root = Path(__file__).resolve().parents[2]
source = root / 'assets/brand/matchapp-icon-approved.png'
image = Image.open(source).convert('RGB')
w, h = image.size
if w != h or w < 900:
    raise ValueError('Expected a high-resolution square source')
# Remove the dark presentation canvas. Preserve the complete purple tile and
# its ambient edge instead of putting an oversized black frame on the launcher.
lo, hi = round(w * 0.195), round(w * 0.805)
artwork = image.crop((lo, lo, hi, hi)).resize((1024, 1024), Image.Resampling.LANCZOS)

def save_png(path, size, image=artwork):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.resize((size, size), Image.Resampling.LANCZOS).save(path, 'PNG', optimize=True)

brand = root / 'assets/brand'
# Installed browser/PWA icons must have genuine transparent outer corners.
# The high-resolution Play/Android artwork stays full-bleed, while this
# rounded alpha silhouette avoids a square presentation mat on home screens.
alpha_hi = Image.new('L', (4096, 4096), 0)
ImageDraw.Draw(alpha_hi).rounded_rectangle((148, 12, 3948, 3804), radius=770, fill=255)
alpha = alpha_hi.resize((1024, 1024), Image.Resampling.LANCZOS)
pwa_artwork = artwork.convert('RGBA')
pwa_artwork.putalpha(alpha)
save_png(brand / 'matchapp-ai-install-192.png', 192, pwa_artwork)
save_png(brand / 'matchapp-ai-install-512.png', 512, pwa_artwork)
save_png(brand / 'matchapp-apple-touch-icon.png', 180)
save_png(brand / 'matchapp-icon-maskable-192.png', 192)
save_png(brand / 'matchapp-icon-maskable-512.png', 512)
save_png(root / 'android-studio/play/icon-512.png', 512)

drawable = root / 'android-studio/app/src/main/res/drawable'
artwork.resize((512, 512), Image.Resampling.LANCZOS).save(
    drawable / 'matchapp_launcher_premium.webp', 'WEBP', quality=94, method=6)

res = root / 'android-studio/app/src/main/res'
for density, size in {'mdpi':48,'hdpi':72,'xhdpi':96,'xxhdpi':144,'xxxhdpi':192}.items():
    mipmap = res / ('mipmap-' + density)
    base = artwork.resize((size, size), Image.Resampling.LANCZOS)
    base.save(mipmap/'ic_launcher.png', 'PNG', optimize=True)
    # Separate legacy round resource; modern Android uses the adaptive XML mask.
    mask = Image.new('L', (size*4, size*4))
    ImageDraw.Draw(mask).ellipse((0,0,size*4-1,size*4-1), fill=255)
    mask = mask.resize((size,size), Image.Resampling.LANCZOS)
    round_icon = base.convert('RGBA')
    round_icon.putalpha(mask)
    round_icon.save(mipmap/'ic_launcher_round.png', 'PNG', optimize=True)
print('Launcher assets generated from SHA-256:', hashlib.sha256(source.read_bytes()).hexdigest())
print('Play listing, PWA and five Android densities refreshed; Kids unchanged.')
