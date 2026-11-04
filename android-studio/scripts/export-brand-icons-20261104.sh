#!/usr/bin/env bash
# Size the original transparent artwork for Play, adaptive and pre-O launchers.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
art="$root/play/refresh-20261104/artwork"
res="$root/app/src/main/res"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
font="${MATCHAPP_ICON_FONT:-DejaVu-Sans-Bold}"
bounds="$(convert "$art/comet-master.png" -alpha extract -threshold 6% -format '%@' info:)"
convert "$art/comet-master.png" -crop "$bounds" +repage "$tmp/symbol.png"
# The launcher title under the icon uses the public brand spelling. The owner
# selected the uppercase AI lettering for this particular artwork.
convert -size 1024x1024 radial-gradient:'#432260-#120a21' -colorspace sRGB "$tmp/back.png"
convert "$tmp/symbol.png" -resize '622x590' "$tmp/large.png"
convert "$tmp/back.png" "$tmp/large.png" -gravity North -geometry +0+135 -composite \
  -gravity South -font "$font" -pointsize 82 -kerning -1.6 -fill '#f7e8be' -annotate +0+159 'MatchApp AI' \
  -resize 512x512 -alpha on -depth 8 -define png:color-type=6 "$art/matchapp-ai-play-512.png"
cp "$art/matchapp-ai-play-512.png" "$root/play/icon-512.png"
convert "$tmp/symbol.png" -resize '209x185' "$tmp/small.png"
convert -size 432x432 xc:none "$tmp/small.png" -gravity North -geometry +0+104 -composite \
  -gravity South -font "$font" -pointsize 25 -fill '#f7e8be' -annotate +0+119 'MatchApp AI' \
  -depth 8 -define png:color-type=6 "$res/drawable-nodpi/matchapp_launcher_orbit.png"
convert -size 512x512 xc:none -fill white -draw 'roundrectangle 8,8 503,503 112,112' "$tmp/square.png"
convert -size 512x512 xc:none -fill white -draw 'circle 255.5,255.5 255.5,4' "$tmp/round.png"
for shape in square round; do
  convert "$art/matchapp-ai-play-512.png" "$tmp/$shape.png" -alpha off -compose CopyOpacity -composite "$tmp/$shape-icon.png"
done
cp "$tmp/round-icon.png" "$res/drawable/ic_launcher_foreground.png"
for spec in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  dir="$res/mipmap-${spec%:*}"; size="${spec#*:}"
  for pair in square:ic_launcher round:ic_launcher_round; do
    convert "$tmp/${pair%:*}-icon.png" -resize "${size}x${size}!" -depth 8 -define png:color-type=6 "$dir/${pair#*:}.png"
  done
done
