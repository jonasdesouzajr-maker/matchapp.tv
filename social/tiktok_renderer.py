#!/usr/bin/env python3
"""Render original MatchApp vertical motion graphics without third-party art."""
import argparse
import math
import subprocess
import tempfile
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H, FPS, SECONDS = 540, 960, 15, 18
REGULAR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
GOLD, WHITE, MUTED = '#e9c969', '#fff7ec', '#c9b9d8'


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else REGULAR, size)


def centered(draw, y, message, size, color=WHITE, bold=True):
    face = font(size, bold)
    box = draw.textbbox((0, 0), message, font=face)
    draw.text(((W - (box[2] - box[0])) / 2, y), message, font=face, fill=color)


def pill(draw, x, y, width, label, accent):
    draw.rounded_rectangle((x, y, x + width, y + 82), radius=23,
                           fill='#28183e', outline=accent, width=2)
    face = font(22, True)
    draw.text((x + 22, y + 23), label, font=face, fill=WHITE)


def frame(t):
    image = Image.new('RGB', (W, H), '#130d26')
    draw = ImageDraw.Draw(image)
    for y in range(H):
        amount = int(17 * y / H)
        draw.line((0, y, W, y), fill=(20 + amount, 13 + amount // 2, 40 + amount))
    pulse = 12 * math.sin(t * 1.9)
    draw.ellipse((-165 + t * 7, 90, 185 + t * 7, 440), fill='#24143b')
    draw.ellipse((345 - t * 5, 570, 690 - t * 5, 920), fill='#2b1a47')
    for n in range(18):
        x = (n * 91 + 77) % W
        y = (n * 153 + 71) % H
        r = 1 + n % 2
        draw.ellipse((x-r, y-r, x+r, y+r), fill='#6c577f')
    draw.rounded_rectangle((23, 24, W-23, H-24), radius=35,
                           outline='#8a6940', width=2)
    centered(draw, 67, 'MATCHAPP  Ai', 27, GOLD)
    draw.line((145, 111, W-145, 111), fill=GOLD, width=2)

    if t < 4:
        centered(draw, 261, 'NOITE DE FILME?', 38)
        centered(draw, 331, 'Dois gostos.', 32, MUTED)
        centered(draw, 382, 'Uma escolha.', 36, GOLD)
        draw.rounded_rectangle((178, 535-pulse, 362, 719-pulse), radius=40,
                               fill='#492a65', outline=GOLD, width=3)
        centered(draw, 581-pulse, '▶', 75, GOLD)
    elif t < 8:
        centered(draw, 219, 'CADA UM ESCOLHE', 31, GOLD)
        pill(draw, 73, 365, 394, 'VOCÊ  ·  leve + divertido', '#a48ce8')
        pill(draw, 73, 485, 394, 'PAR  ·  intenso + esperto', '#e9c969')
        centered(draw, 664, 'Sem discutir por horas.', 23, MUTED, False)
    elif t < 13:
        centered(draw, 228, 'MATCH TOGETHER', 34, GOLD)
        pill(draw, 82, 356, 171, 'SEU GOSTO', '#a48ce8')
        pill(draw, 286, 356, 171, 'O DELE(A)', '#e9c969')
        draw.line((168, 463, W//2, 570), fill=GOLD, width=3)
        draw.line((371, 463, W//2, 570), fill=GOLD, width=3)
        draw.ellipse((W//2-50-pulse/2, 529-pulse/2, W//2+50+pulse/2,
                      629+pulse/2), fill='#503369', outline=GOLD, width=4)
        centered(draw, 551-pulse/2, '✓', 48, WHITE)
        centered(draw, 678, 'Uma indicação para os dois.', 22, MUTED, False)
    else:
        centered(draw, 241, 'MANDE O LINK.', 38)
        centered(draw, 311, 'DESCUBRAM JUNTOS.', 31, GOLD)
        draw.rounded_rectangle((83, 502, W-83, 596), radius=21,
                               fill='#e9c969')
        centered(draw, 527, 'TESTE AGORA  ↗', 27, '#24132e')
        centered(draw, 674, 'matchapp.tv/together.html', 22, WHITE, False)
    centered(draw, 867, 'Qual é o seu combo de moods?', 17, MUTED, False)
    return image


def soundtrack(path):
    rate = 22050
    with wave.open(str(path), 'wb') as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        chunk = bytearray()
        notes = (220, 277.18, 329.63, 277.18)
        for i in range(rate * SECONDS):
            t = i / rate
            beat = t % .5
            envelope = max(0, 1 - beat * 2) ** 4
            chord = notes[int(t // 2) % len(notes)]
            v = (math.sin(2 * math.pi * chord * t) * .07 +
                 math.sin(2 * math.pi * (chord / 2) * t) * .045) * envelope
            sample = int(max(-1, min(1, v)) * 32767)
            chunk.extend(sample.to_bytes(2, 'little', signed=True))
        out.writeframes(chunk)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / 'frames.rgb'
        audio = Path(tmp) / 'original-audio.wav'
        with raw.open('wb') as out:
            for n in range(FPS * SECONDS):
                out.write(frame(n / FPS).tobytes())
        soundtrack(audio)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo',
                        '-pixel_format', 'rgb24', '-video_size', f'{W}x{H}',
                        '-framerate', str(FPS), '-i', str(raw), '-i', str(audio),
                        '-c:v', 'libx264', '-preset', 'fast', '-crf', '34',
                        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '48k',
                        '-movflags', '+faststart', '-shortest', str(args.output)],
                       check=True)


if __name__ == '__main__':
    main()
