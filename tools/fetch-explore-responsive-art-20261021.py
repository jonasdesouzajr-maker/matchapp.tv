"""Fetch renditions of the existing licensed source photos; never enlarge or redraw.

Manual asset maintenance only. No API key, scheduled job, or runtime CDN dependency.
Pillow reads dimensions to verify the delivered files; it does not edit images.
"""
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
import urllib.parse
import urllib.request
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets/cinema'
SOURCES = json.loads((ASSETS / 'explore-sources.json').read_text())
WIDTHS = {
    'explore-hero.jpg': [700, 1400, 2800, 3500],
    'explore-awaited.jpg': [600, 1200, 2400],
    'explore-weekly.jpg': [500, 1000, 2000],
    'explore-books.jpg': [350, 700, 1400],
    'explore-food.jpg': [350, 700, 1400],
    'explore-news.jpg': [350, 700, 1400],
    'explore-events.jpg': [500, 1000, 2000],
    'explore-music.jpg': [350, 700, 1400],
}

def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        if response.status != 200:
            raise RuntimeError(f'Image source returned {response.status}')
        return response.read()

def photo(row):
    source = row['source']
    if not source.startswith('https://images.unsplash.com/photo-'):
        raise RuntimeError('Only the existing recorded photo sources are allowed')
    meta = json.loads(fetch(source + '?fm=json'))
    native = [meta.get('PixelWidth') or meta.get('TIFF', {}).get('ImageWidth') or meta.get('Exif', {}).get('PixelXDimension'),
              meta.get('PixelHeight') or meta.get('TIFF', {}).get('ImageLength') or meta.get('Exif', {}).get('PixelYDimension')]
    if not all(isinstance(n, int) and n > 0 for n in native):
        raise RuntimeError('Cannot verify original dimensions for ' + row['file'])
    original = Image.open(ASSETS / row['file'])
    variants = []
    for width in WIDTHS[row['file']]:
        if width > native[0]:
            continue  # Never invent detail by enlarging a source photograph.
        params = urllib.parse.urlencode({'fm': 'avif', 'fit': 'max', 'w': width, 'q': 82})
        url = source + '?' + params
        data = fetch(url)
        image = Image.open(io.BytesIO(data))
        if image.format != 'AVIF' or image.width != width or image.width > native[0] or image.height > native[1]:
            raise RuntimeError('Unexpected format or source-upscaled dimensions')
        if abs(image.width / image.height - original.width / original.height) > 0.015:
            raise RuntimeError('Rendition changed the existing photo composition')
        name = Path(row['file']).stem + '-' + str(width) + '.avif'
        (ASSETS / name).write_bytes(data)
        variants.append({'file': name, 'source': url, 'width': image.width, 'height': image.height,
                         'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    print(row['file'], native, [(v['width'], v['bytes']) for v in variants], flush=True)
    return {'original': row['file'], 'source': source, 'sourceDimensions': native,
            'fallbackDimensions': list(original.size), 'fallbackBytes': (ASSETS / row['file']).stat().st_size,
            'variants': variants}

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        rows = list(pool.map(photo, SOURCES['photos']))
    (ASSETS / 'explore-responsive-sources.json').write_text(json.dumps({
        'retrieved': '2026-10-21', 'license': SOURCES['license'],
        'purpose': 'Responsive renditions of the same decorative photographs. Original files remain the compatibility fallback. No generated or upscaled detail.',
        'photos': rows,
    }, indent=2) + '\n')
