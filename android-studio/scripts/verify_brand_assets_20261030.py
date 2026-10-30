#!/usr/bin/env python3
"""Verify actual packaged pixels and owner artwork without optional image libraries."""
from pathlib import Path
import hashlib
import math
import struct
import xml.etree.ElementTree as ET
import zlib

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "app/src/main/res"
ART = ROOT / "play/refresh-20261030/artwork"


def rgba_png(path, expected_size):
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"Not a PNG: {path}"
    offset, compressed, header = 8, bytearray(), None
    while offset < len(data):
        length = struct.unpack_from(">I", data, offset)[0]
        kind = data[offset + 4:offset + 8]
        chunk = data[offset + 8:offset + 8 + length]
        if kind == b"IHDR":
            header = struct.unpack(">IIBBBBB", chunk)
        elif kind == b"IDAT":
            compressed.extend(chunk)
        offset += length + 12
    assert header is not None, f"Missing PNG header: {path}"
    w, h, depth, color, compression, filtering, interlace = header
    assert (w, h) == expected_size, f"Unexpected size {w}x{h}: {path}"
    assert (depth, color, compression, filtering, interlace) == (8, 6, 0, 0, 0), f"Expected non-interlaced 32-bit RGBA: {path}"
    raw = zlib.decompress(compressed)
    stride, previous, rows = w * 4, bytearray(w * 4), []
    assert len(raw) == (stride + 1) * h
    for y in range(h):
        start = y * (stride + 1)
        mode = raw[start]
        row = bytearray(raw[start + 1:start + 1 + stride])
        assert 0 <= mode <= 4
        for x in range(stride):
            left = row[x - 4] if x >= 4 else 0
            above = previous[x]
            upper_left = previous[x - 4] if x >= 4 else 0
            if mode == 1:
                predictor = left
            elif mode == 2:
                predictor = above
            elif mode == 3:
                predictor = (left + above) // 2
            elif mode == 4:
                p = left + above - upper_left
                distances = (abs(p - left), abs(p - above), abs(p - upper_left))
                predictor = (left, above, upper_left)[distances.index(min(distances))]
            else:
                predictor = 0
            row[x] = (row[x] + predictor) & 255
        rows.append(row)
        previous = row
    return rows


play_path = ART / "matchapp-ai-play-512.png"
play = rgba_png(play_path, (512, 512))
assert play_path.stat().st_size <= 1024 * 1024, "Play listing icon exceeds 1024 KB"
assert all(a == 255 for row in play for a in row[3::4]), "Play icon must be full-bleed, without a baked transparent outer mask"

foreground = rgba_png(RES / "drawable-nodpi/matchapp_launcher_orbit.png", (432, 432))
visible = [(x, y) for y, row in enumerate(foreground) for x in range(432) if row[x * 4 + 3] > 8]
assert len(visible) > 5000, "Adaptive foreground is empty or damaged"
max_radius = max(math.hypot(x + 0.5 - 216, y + 0.5 - 216) for x, y in visible)
assert max_radius <= 432 * 33 / 108, f"Artwork escapes Android's 66dp safe circle: {max_radius}"
assert foreground[0][3] == foreground[-1][-1] == 0, "Adaptive foreground has an opaque canvas"
assert sum(a == 0 for row in foreground for a in row[3::4]) > 432 * 432 / 2

for density, size in (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)):
    for name in ("ic_launcher", "ic_launcher_round"):
        rows = rgba_png(RES / f"mipmap-{density}/{name}.png", (size, size))
        assert rows[0][3] == rows[-1][-1] == 0, f"Unmasked legacy icon: {density}/{name}"
        assert rows[size // 2][(size // 2) * 4 + 3] == 255
rgba_png(RES / "drawable/ic_launcher_foreground.png", (512, 512))

android = "{http://schemas.android.com/apk/res/android}"
for qualifier in ("v26", "v33"):
    for name in ("ic_launcher", "ic_launcher_round"):
        tree = ET.parse(RES / f"mipmap-anydpi-{qualifier}/{name}.xml").getroot()
        assert tree.find("background").attrib[android + "drawable"] == "@drawable/matchapp_launcher_background"
        assert tree.find("foreground").attrib[android + "drawable"] == "@drawable/matchapp_launcher_safe"
        if qualifier == "v33":
            assert tree.find("monochrome").attrib[android + "drawable"] == "@drawable/matchapp_launcher_monochrome"

studio = RES / "drawable-nodpi/adv_dev_ops_studio.jpg"
assert hashlib.sha256(studio.read_bytes()).hexdigest() == "2663e87fc0b2fab3fba870696ec76ff97fc1f8fe47fb3ef680c091f5365b6f1d", "Owner-supplied company artwork bytes changed"
print(f"Android/Play icon sizes, alpha, safe circle ({max_radius:.2f}px <= 132px), themed resources and exact company artwork: PASS")
