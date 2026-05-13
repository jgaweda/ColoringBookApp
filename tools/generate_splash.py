#!/usr/bin/env python3
"""
Generate iOS PWA splash screens for the most common iPad sizes by rendering
the icon centered on the app's gradient background.

Output: web/splash/<NAME>.png plus a snippet of <link> tags to paste into
index.html. Run after editing icon.svg.

Requires: pip install cairosvg pillow
"""
from __future__ import annotations
from pathlib import Path
import sys

try:
    import cairosvg
    from PIL import Image, ImageDraw
except ImportError as e:
    print(f"Missing dep: {e}. pip install cairosvg pillow", file=sys.stderr)
    sys.exit(2)

REPO = Path(__file__).resolve().parents[1]
ICON_SVG = REPO / "web" / "icon.svg"
OUT = REPO / "web" / "splash"

# (width, height, label, media-query) — iPad portrait + landscape pairs.
TARGETS = [
    (2048, 2732, "ipadpro129-portrait",  "screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"),
    (2732, 2048, "ipadpro129-landscape", "screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"),
    (1668, 2388, "ipadpro11-portrait",   "screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"),
    (2388, 1668, "ipadpro11-landscape",  "screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"),
    (1640, 2360, "ipadair-portrait",     "screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"),
    (2360, 1640, "ipadair-landscape",    "screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"),
    (1620, 2160, "ipad-portrait",        "screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"),
    (2160, 1620, "ipad-landscape",       "screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"),
]


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    icon_data = ICON_SVG.read_bytes()
    snippets = []
    for w, h, name, media in TARGETS:
        bg = make_gradient_bg(w, h)
        # Render the icon at 38% of min(w,h) to fit nicely on the splash.
        icon_size = int(min(w, h) * 0.38)
        icon_png = cairosvg.svg2png(
            bytestring=icon_data,
            output_width=icon_size,
            output_height=icon_size,
        )
        from io import BytesIO
        icon = Image.open(BytesIO(icon_png)).convert("RGBA")
        bg.paste(icon, ((w - icon_size) // 2, (h - icon_size) // 2), icon)
        out_path = OUT / f"{name}.png"
        bg.save(out_path, optimize=True)
        rel = f"./splash/{name}.png"
        snippets.append(f'  <link rel="apple-touch-startup-image" href="{rel}" media="{media}" />')
        print(f"  wrote {out_path.relative_to(REPO)} ({w}x{h})")

    print("\nPaste into index.html <head>:\n")
    print("\n".join(snippets))
    return 0


def make_gradient_bg(w, h):
    img = Image.new("RGB", (w, h), (255, 248, 225))  # base
    # Diagonal gradient from #FFF8E1 to #FFE9F4
    pixels = img.load()
    for y in range(h):
        for x in range(w):
            t = (x / w + y / h) / 2
            r = int(255 + t * (255 - 255))
            g = int(248 + t * (233 - 248))
            b = int(225 + t * (244 - 225))
            pixels[x, y] = (r, g, b)
    return img


if __name__ == "__main__":
    sys.exit(main())
