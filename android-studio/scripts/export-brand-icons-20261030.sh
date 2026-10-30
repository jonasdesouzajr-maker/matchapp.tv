#!/usr/bin/env bash
# Mechanical Android/Play exports from the owner-requested image-edited masters.
# ImageMagick is used only for asset sizing, format conversion and platform masks.
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
brand_dir="$project_root/play/refresh-20261030/artwork"
res_dir="$project_root/app/src/main/res"
icon_tmp="$(mktemp -d)"
trap 'rm -rf "$icon_tmp"' EXIT

convert "$brand_dir/matchapp-ai-play-master.png" -colorspace sRGB -resize 512x512! \
    -alpha on -define png:color-type=6 "$brand_dir/matchapp-ai-play-512.png"

# Android's visible mask covers the central 72dp of a 108dp layer. These masters
# already include the design's breathing room. A small additional inset keeps
# the complete gold ring, including its highlights, inside the 66dp safe circle.
convert "$brand_dir/matchapp-ai-adaptive-foreground-master.png" -colorspace sRGB \
    -resize 408x408! -background none -gravity center -extent 432x432 \
    -define png:color-type=6 "$res_dir/drawable-nodpi/matchapp_launcher_orbit.png"

convert -size 512x512 xc:none -fill white -draw 'roundrectangle 8,8 503,503 112,112' "$icon_tmp/rounded-mask.png"
convert -size 512x512 xc:none -fill white -draw 'circle 255.5,255.5 255.5,4' "$icon_tmp/round-mask.png"
convert "$brand_dir/matchapp-ai-play-512.png" "$icon_tmp/rounded-mask.png" \
    -alpha off -compose CopyOpacity -composite "$icon_tmp/legacy-square.png"
convert "$brand_dir/matchapp-ai-play-512.png" "$icon_tmp/round-mask.png" \
    -alpha off -compose CopyOpacity -composite "$icon_tmp/legacy-round.png"
cp "$icon_tmp/legacy-round.png" "$res_dir/drawable/ic_launcher_foreground.png"
for density_size in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
    density="${density_size%:*}"
    size="${density_size#*:}"
    convert "$icon_tmp/legacy-square.png" -resize "${size}x${size}!" -define png:color-type=6 "$res_dir/mipmap-$density/ic_launcher.png"
    convert "$icon_tmp/legacy-round.png" -resize "${size}x${size}!" -define png:color-type=6 "$res_dir/mipmap-$density/ic_launcher_round.png"
done
printf 'Exported Play icon, adaptive foreground and five legacy launcher densities.\n'
