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


LIGHT = (191, 219, 255)
# The logo: one continuous wave that reads as an M, ending in a single voice.
M_PATH = [(0.20, 0.72), (0.24, 0.34), (0.36, 0.30), (0.50, 0.58), (0.64, 0.30), (0.76, 0.34), (0.80, 0.72)]


def spline(pts, per=70):
    """Catmull-Rom curve through the points."""
    p = [pts[0]] + pts + [pts[-1]]
    out = []
    for i in range(1, len(p) - 2):
        for s in range(per):
            t = s / per
            out.append(tuple(
                0.5 * ((2 * p[i][k]) + (-p[i - 1][k] + p[i + 1][k]) * t
                       + (2 * p[i - 1][k] - 5 * p[i][k] + 4 * p[i + 1][k] - p[i + 2][k]) * t * t
                       + (-p[i - 1][k] + 3 * p[i][k] - 3 * p[i + 1][k] + p[i + 2][k]) * t ** 3)
                for k in range(2)))
    out.append(pts[-1])
    return out


def mix(a, b, k):
    return tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))


def mark(d, x0, y0, size):
    """Draw the wave inside the square whose top-left corner is (x0, y0)."""
    path = spline(M_PATH)
    w = size * 0.052
    for i, (x, y) in enumerate(path):
        cx, cy = x0 + x * size, y0 + y * size
        d.ellipse([cx - w, cy - w, cx + w, cy + w], fill=mix(BLUE, LIGHT, i / len(path)))
    cx, cy = x0 + path[-1][0] * size, y0 + path[-1][1] * size
    d.ellipse([cx - w * 1.5, cy - w * 1.5, cx + w * 1.5, cy + w * 1.5], fill=RED)


def logo_png(size):
    S = size * 4
    img = Image.new("RGB", (S, S), BG)
    img = add(img, glow((S, S), (S // 2, S // 2), S * 0.42, BLUE, 0.3))
    mark(ImageDraw.Draw(img), 0, 0, S)
    img = img.resize((size, size), Image.LANCZOS)
    # Rounded corners on a transparent background.
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S, S], radius=S * 0.22, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask.resize((size, size), Image.LANCZOS))
    return out


def logo_svg():
    pts = spline(M_PATH, per=10)
    path = "M" + " L".join(f"{x * 64:.2f} {y * 64:.2f}" for x, y in pts)
    ex, ey = pts[-1][0] * 64, pts[-1][1] * 64
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Murmur">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#3987e5"/><stop offset="1" stop-color="#bfdbff"/>
    </linearGradient>
    <radialGradient id="b" cx="0.5" cy="0.5" r="0.6">
      <stop offset="0" stop-color="#11284b"/><stop offset="1" stop-color="#05070c"/>
    </radialGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#b)"/>
  <path d="{path}" fill="none" stroke="url(#g)" stroke-width="6.6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="{ex:.2f}" cy="{ey:.2f}" r="5" fill="#e66767"/>
</svg>
"""


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
    mark(d, L - 30, 96, 170)
    d.text((L + 150, 150), "M U R M U R", font=font(50, mono=True), fill=TEXT)

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


if __name__ == "__main__":
    og_image().save(SITE / "og.png", optimize=True)
    logo_png(512).save(SITE / "logo.png", optimize=True)
    logo_png(180).save(SITE / "apple-touch-icon.png", optimize=True)
    logo_png(32).save(SITE / "favicon-32.png", optimize=True)
    (SITE / "logo.svg").write_text(logo_svg())
    for name in ("og.png", "logo.png", "apple-touch-icon.png", "favicon-32.png", "logo.svg"):
        print(name, (SITE / name).stat().st_size, "bytes")
