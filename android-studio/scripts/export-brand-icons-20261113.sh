#!/usr/bin/env bash
# Technical size/mask exports of the exact owner-approved Flow concept A.
# No redraw, recoloring, lettering replacement, or website branding changes.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
art="$root/play/refresh-20261113/artwork"
res="$root/app/src/main/res"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
png=(-strip -depth 8 -define png:color-type=6)
convert "$art/approved-icon-a.jpg" -resize 512x512 "${png[@]}" "$art/matchapp-ai-play-512.png"
cp "$art/matchapp-ai-play-512.png" "$root/play/icon-512.png"
# The original AI lettering is near the upper-left corner. An 85% fit plus the
# existing adaptive inset keeps the complete lettering and gold mark in 66dp.
convert "$art/approved-icon-a.jpg" -resize 436x436 -background '#1b0842' \
  -gravity center -extent 512x512 "${png[@]}" "$tmp/fit.png"
convert -size 512x512 xc:none -fill white -draw 'circle 255.5,255.5 255.5,1' "$tmp/round.png"
convert -size 512x512 xc:none -fill white -draw 'roundrectangle 2,2 509,509 112,112' "$tmp/square.png"
for shape in square round; do
  convert "$tmp/fit.png" "$tmp/$shape.png" -alpha off -compose CopyOpacity -composite \
    "${png[@]}" "$tmp/$shape-icon.png"
done
cp "$tmp/round-icon.png" "$res/drawable-nodpi/matchapp_launcher_ai_ribbon.png"
cp "$tmp/round-icon.png" "$res/drawable/ic_launcher_foreground.png"
for spec in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  dir="$res/mipmap-${spec%:*}"; size="${spec#*:}"
  for pair in square:ic_launcher round:ic_launcher_round; do
    convert "$tmp/${pair%:*}-icon.png" -resize "${size}x${size}!" \
      "${png[@]}" "$dir/${pair#*:}.png"
  done
done
