#!/usr/bin/env python3
"""
Greedy Cookie — region mask builder.

For every line-art PNG in ColoringBookApp/Content/LineArt/<category>/, produce
a paired *.mask.png where each closed white region is filled with a unique RGB.
This mask is what the iOS app uses to do O(1) tap-to-fill.

Usage:
  pip install pillow numpy scipy
  python3 tools/build_region_masks.py
  python3 tools/build_region_masks.py --only heroes
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    import numpy as np
    from PIL import Image
    from scipy import ndimage
except ImportError as e:
    print(f"Missing dep: {e}. Run: pip install pillow numpy scipy", file=sys.stderr)
    sys.exit(2)

REPO = Path(__file__).resolve().parents[1]
LINEART = REPO / "ColoringBookApp" / "Content" / "LineArt"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="Comma-separated category ids")
    args = ap.parse_args()
    only = {s.strip() for s in args.only.split(",") if s.strip()}

    pngs = []
    for cat_dir in sorted(p for p in LINEART.iterdir() if p.is_dir()):
        if only and cat_dir.name not in only:
            continue
        for png in sorted(cat_dir.glob("*.png")):
            if png.name.endswith(".mask.png") or png.name.endswith(".thumb.png"):
                continue
            pngs.append(png)

    if not pngs:
        print("No line-art PNGs found. Run tools/generate_lineart.py first.")
        return 0

    print(f"Building masks for {len(pngs)} pages...")
    for png in pngs:
        out = png.with_name(png.stem + ".mask.png")
        if out.exists():
            print(f"  SKIP {png.relative_to(LINEART)}")
            continue
        try:
            _build_mask(png, out)
            print(f"  OK   {png.relative_to(LINEART)}")
        except Exception as e:  # noqa: BLE001
            print(f"  FAIL {png.relative_to(LINEART)}: {e}", file=sys.stderr)
    return 0


def _build_mask(in_png: Path, out_png: Path) -> None:
    img = np.array(Image.open(in_png).convert("L"))
    # Pixel is "fillable" if it's white-ish; the line art is dark.
    fillable = img > 192

    labeled, n = ndimage.label(fillable, structure=np.ones((3, 3), dtype=int))
    if n == 0:
        raise RuntimeError("no fillable regions detected")

    # Map each region label -> a unique RGB color, skipping near-black.
    rgb = np.zeros((*labeled.shape, 3), dtype=np.uint8)
    for i in range(1, n + 1):
        c = _color_for_label(i)
        rgb[labeled == i] = c
    # Line-art (the gaps) stays pure black so the iOS RegionMask ignores it.
    Image.fromarray(rgb).save(out_png, optimize=True)


def _color_for_label(i: int) -> tuple[int, int, int]:
    """Spread labels across the RGB cube, avoiding (0,0,0) and saturating."""
    i = max(1, i)
    r = (i * 73)  & 0xFF
    g = (i * 151) & 0xFF
    b = (i * 211) & 0xFF
    if r < 32 and g < 32 and b < 32:
        r = (r + 64) & 0xFF
    return r, g, b


if __name__ == "__main__":
    sys.exit(main())
