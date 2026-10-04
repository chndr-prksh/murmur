"""Render Murmur's logo, icons and social thumbnail into site/.

Run with any Python that has Pillow:  python tools/make_brand.py
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SITE = Path(__file__).resolve().parent.parent / "site"
BG = (5, 7, 12)
BLUE = (57, 135, 229)
RED = (230, 103, 103)
DOT = (91, 106, 136)
TEXT = (232, 236, 243)
TEXT2 = (163, 172, 187)


def font(size, bold=True, mono=False):
    if mono:
        return ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", size, index=1 if bold else 0)
    return ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", size, index=1 if bold else 0)


def glow(size, centre, radius, colour, strength):
    """A soft radial light, returned as an RGB layer to add onto the canvas."""
    layer = Image.new("RGB", size, (0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = centre
    d.ellipse([x - radius, y - radius, x + radius, y + radius], fill=tuple(int(c * strength) for c in colour))
    return layer.filter(ImageFilter.GaussianBlur(radius * 0.45))


def add(base, layer):
    from PIL import ImageChops
    return ImageChops.add(base, layer)


def mark(d, cx, cy, r, width):
    """The logo: a source dot, two ripples, and three people it reaches."""
    for k, (start, end) in zip((0.55, 0.92), ((200, 340), (20, 160))):
        rr = r * k
        d.arc([cx - rr, cy - rr, cx + rr, cy + rr], start, end, fill=BLUE, width=width)
    sats = [(-0.78, -0.50, TEXT), (0.80, -0.34, RED), (0.10, 0.86, TEXT)]
    for sx, sy, colour in sats:
        d.line([cx, cy, cx + sx * r, cy + sy * r], fill=(120, 150, 205), width=max(1, width // 2))
    for sx, sy, colour in sats:
        s = r * 0.11
        d.ellipse([cx + sx * r - s, cy + sy * r - s, cx + sx * r + s, cy + sy * r + s], fill=colour)
    c = r * 0.24
    d.ellipse([cx - c, cy - c, cx + c, cy + c], fill=BLUE)


def logo_png(size):
    S = size * 4
    img = Image.new("RGB", (S, S), BG)
    img = add(img, glow((S, S), (S // 2, S // 2), S * 0.42, BLUE, 0.35))
    d = ImageDraw.Draw(img)
    mark(d, S / 2, S / 2, S * 0.36, max(2, S // 28))
    img = img.resize((size, size), Image.LANCZOS)
    # Rounded corners on a transparent background.
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * 4, size * 4], radius=size * 4 * 0.22, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask.resize((size, size), Image.LANCZOS))
    return out


def web(d, rng, W, H):
    """Clusters of people joined by links, like the live site."""
    clusters = [(0.66, 0.50, 0.150, 330), (0.86, 0.26, 0.085, 150), (0.90, 0.70, 0.095, 170),
                (0.50, 0.20, 0.060, 80), (0.52, 0.84, 0.070, 100), (0.74, 0.90, 0.045, 50)]
    pts = []
    for cx, cy, r, n in clusters:
        for _ in range(n):
            a, q = rng.uniform(0, math.tau), abs(rng.gauss(0, 0.5))
            pts.append((W * cx + math.cos(a) * q * r * W * 0.62, H * cy + math.sin(a) * q * r * H, len(pts)))
    for _ in range(160):
        pts.append((rng.uniform(W * 0.42, W), rng.uniform(0, H), len(pts)))

    link = (120, 150, 205)
    for i, (x, y, _) in enumerate(pts):
        near = sorted(pts, key=lambda p: (p[0] - x) ** 2 + (p[1] - y) ** 2)[1:3]
        for nx, ny, _ in near:
            d.line([x, y, nx, ny], fill=tuple(int(c * 0.34) for c in link), width=2)
        if i % 19 == 0:
            fx, fy, _ = pts[(i * 7919 + 13) % len(pts)]
            d.line([x, y, fx, fy], fill=tuple(int(c * 0.22) for c in link), width=2)
    lit = []
    for x, y, i in pts:
        roll = rng.random()
        colour = RED if roll < 0.20 else BLUE if roll < 0.34 else (170, 179, 194) if roll < 0.44 else DOT
        s = 5 if colour in (RED, BLUE) else 3.4
        d.ellipse([x - s, y - s, x + s, y + s], fill=colour)
        if colour in (RED, BLUE):
            lit.append((x, y, colour))
    return lit


def og_image():
    W, H = 2400, 1260  # drawn at twice the published size, then scaled down
    rng = random.Random(7)
    img = Image.new("RGB", (W, H), BG)
    img = add(img, glow((W, H), (int(W * 0.68), int(H * 0.48)), 620, BLUE, 0.42))
    img = add(img, glow((W, H), (int(W * 0.92), int(H * 0.86)), 380, RED, 0.16))

    d = ImageDraw.Draw(img)
    for gx in range(0, W, 112):
        d.line([gx, 0, gx, H], fill=(13, 16, 24), width=2)
    for gy in range(0, H, 112):
        d.line([0, gy, W, gy], fill=(13, 16, 24), width=2)

    lit = web(d, rng, W, H)
    halo = Image.new("RGB", (W, H), (0, 0, 0))
    hd = ImageDraw.Draw(halo)
    for x, y, colour in lit:
        hd.ellipse([x - 16, y - 16, x + 16, y + 16], fill=tuple(int(c * 0.6) for c in colour))
    img = add(img, halo.filter(ImageFilter.GaussianBlur(12)))

    # Darken the left side so the words sit on a calm background.
    shade = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(shade)
    for x in range(W):
        k = max(0.0, min(1.0, 1 - (x - W * 0.34) / (W * 0.30)))
        sd.line([x, 0, x, H], fill=int(235 * k))
    img = Image.composite(Image.new("RGB", (W, H), BG), img, shade)

    d = ImageDraw.Draw(img)
    L = 150
    mark(d, L + 44, 176, 62, 9)
    d.text((L + 136, 150), "M U R M U R", font=font(50, mono=True), fill=TEXT)

    head = font(184)
    d.text((L - 6, 380), "Ask what", font=head, fill=TEXT)
    d.text((L - 6, 570), "happens", font=head, fill=TEXT)
    wide = d.textlength("happens ", font=head)
    d.text((L - 6 + wide, 570), "next.", font=head, fill=(110, 170, 245))

    sub = font(54, bold=False)
    d.text((L, 820), "Live-news forecasts, played out across", font=sub, fill=TEXT2)
    d.text((L, 892), "1,000,000 simulated people.", font=sub, fill=TEXT)

    d.text((L, 1086), "chndr-prksh.github.io/murmur", font=font(40, bold=False, mono=True), fill=(109, 118, 134))
    return img.resize((1200, 630), Image.LANCZOS)


LOGO_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Murmur">
  <rect width="64" height="64" rx="14" fill="#05070c"/>
  <g fill="none" stroke="#3987e5" stroke-width="2.6" stroke-linecap="round">
    <path d="M19.6 27.5a13 13 0 0 1 24.8 0"/>
    <path d="M52.4 39.4a21.6 21.6 0 0 1-40.8 0"/>
  </g>
  <g stroke="#7896cd" stroke-width="1.3">
    <path d="M32 32 13.7 20.3M32 32l18.8-8M32 32l2.4 20.2"/>
  </g>
  <circle cx="13.7" cy="20.3" r="2.6" fill="#e8ecf3"/>
  <circle cx="50.8" cy="24" r="2.6" fill="#e66767"/>
  <circle cx="34.4" cy="52.2" r="2.6" fill="#e8ecf3"/>
  <circle cx="32" cy="32" r="5.6" fill="#3987e5"/>
</svg>
"""


if __name__ == "__main__":
    og_image().save(SITE / "og.png", optimize=True)
    logo_png(512).save(SITE / "logo.png", optimize=True)
    logo_png(180).save(SITE / "apple-touch-icon.png", optimize=True)
    logo_png(32).save(SITE / "favicon-32.png", optimize=True)
    (SITE / "logo.svg").write_text(LOGO_SVG)
    for name in ("og.png", "logo.png", "apple-touch-icon.png", "favicon-32.png", "logo.svg"):
        print(name, (SITE / name).stat().st_size, "bytes")
