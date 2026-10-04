"""Render candidate logos side by side so one can be picked."""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageChops

OUT = Path(__file__).resolve().parent / "logo-options.png"
BG, BLUE, LIGHT, RED = (5, 7, 12), (57, 135, 229), (191, 219, 255), (230, 103, 103)
S = 1024


def base():
    img = Image.new("RGB", (S, S), BG)
    g = Image.new("RGB", (S, S), (0, 0, 0))
    ImageDraw.Draw(g).ellipse([S * 0.1, S * 0.1, S * 0.9, S * 0.9], fill=(14, 34, 64))
    return ImageChops.add(img, g.filter(ImageFilter.GaussianBlur(S * 0.16)))


def mix(a, b, k):
    return tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))


def spline(pts, n=400):
    """Catmull-Rom through the points."""
    p = [pts[0]] + pts + [pts[-1]]
    out = []
    for i in range(1, len(p) - 2):
        for s in range(n // (len(pts) - 1)):
            t = s / (n // (len(pts) - 1))
            q = []
            for k in range(2):
                a, b, c, d = p[i - 1][k], p[i][k], p[i + 1][k], p[i + 2][k]
                q.append(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3))
            out.append(tuple(q))
    out.append(pts[-1])
    return out


M_PATH = [(0.20, 0.72), (0.24, 0.34), (0.36, 0.30), (0.50, 0.58), (0.64, 0.30), (0.76, 0.34), (0.80, 0.72)]


def option_wave():
    """A: one continuous wave that reads as an M."""
    img = base()
    d = ImageDraw.Draw(img)
    path = spline(M_PATH)
    w = S * 0.052
    for i, (x, y) in enumerate(path):
        c = mix(BLUE, LIGHT, i / len(path))
        d.ellipse([x * S - w, y * S - w, x * S + w, y * S + w], fill=c)
    x, y = path[-1]
    d.ellipse([x * S - w * 1.5, y * S - w * 1.5, x * S + w * 1.5, y * S + w * 1.5], fill=RED)
    return img


def option_flock():
    """B: a murmuration of dots gathering into an M."""
    img = base()
    d = ImageDraw.Draw(img)
    rng = random.Random(4)
    path = spline(M_PATH, 60)
    for i, (x, y) in enumerate(path):
        for _ in range(3):
            jx, jy = rng.gauss(0, 0.022), rng.gauss(0, 0.022)
            r = S * rng.uniform(0.010, 0.026)
            c = mix(BLUE, LIGHT, rng.random() * 0.8)
            d.ellipse([(x + jx) * S - r, (y + jy) * S - r, (x + jx) * S + r, (y + jy) * S + r], fill=c)
    for _ in range(26):  # stragglers drifting off the top right
        t = rng.random()
        x, y = 0.80 + t * 0.12 + rng.gauss(0, 0.03), 0.60 - t * 0.42 + rng.gauss(0, 0.04)
        r = S * rng.uniform(0.006, 0.014) * (1.2 - t)
        d.ellipse([x * S - r, y * S - r, x * S + r, y * S + r], fill=mix(BLUE, BG, t * 0.5))
    d.ellipse([0.50 * S - 30, 0.58 * S - 30, 0.50 * S + 30, 0.58 * S + 30], fill=RED)
    return img


def option_ripple():
    """C: a signal spreading outward from one voice."""
    img = base()
    d = ImageDraw.Draw(img)
    cx, cy = S * 0.36, S * 0.64
    for k, r in enumerate((0.20, 0.34, 0.48, 0.62)):
        c = mix(LIGHT, BLUE, k / 3)
        c = mix(c, BG, k * 0.16)
        rr = S * r
        d.arc([cx - rr, cy - rr, cx + rr, cy + rr], 282, 348, fill=c, width=int(S * (0.070 - k * 0.008)))
    r0 = S * 0.085
    d.ellipse([cx - r0, cy - r0, cx + r0, cy + r0], fill=LIGHT)
    return img


def rounded(img):
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S, S], radius=S * 0.22, fill=255)
    out = Image.new("RGB", (S, S), (24, 28, 38))
    out.paste(img, (0, 0), mask)
    return out


if __name__ == "__main__":
    opts = [rounded(o()) for o in (option_wave, option_flock, option_ripple)]
    sheet = Image.new("RGB", (S * 3 + 200, S + 360), (24, 28, 38))
    for i, o in enumerate(opts):
        sheet.paste(o, (50 + i * (S + 50), 50))
        small = o.resize((96, 96), Image.LANCZOS)   # how it reads as a small icon
        sheet.paste(small, (50 + i * (S + 50), S + 110))
        tiny = o.resize((40, 40), Image.LANCZOS)
        sheet.paste(tiny, (180 + i * (S + 50), S + 138))
    sheet.resize((sheet.width // 3, sheet.height // 3), Image.LANCZOS).save(OUT)
    print(OUT)
