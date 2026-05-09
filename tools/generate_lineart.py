#!/usr/bin/env python3
"""
Greedy Cookie — line-art generator.

Reads ColoringBookApp/Content/categories.json and produces a black-on-white,
thick-stroke, kid-friendly coloring page for every (category, page) entry that
does not yet exist on disk.

This is a developer-only tool. It runs OUTSIDE the iOS app. Generated assets
are committed into the repo under ColoringBookApp/Content/LineArt/<category>/.

The image-gen backend is pluggable. Default is OpenAI Images API (DALL·E 3).
You can swap in any other API by editing `_backend_request`.

Usage:
  export OPENAI_API_KEY=...
  python3 tools/generate_lineart.py
  python3 tools/generate_lineart.py --only heroes,unicorns
  python3 tools/generate_lineart.py --redo dinosaurs/happy_trex
  python3 tools/generate_lineart.py --dry-run

Requires:
  pip install requests pillow
  brew install potrace          # for SVG vectorization
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

try:
    import requests
except ImportError:
    requests = None  # tools fail loudly on first network call

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None

REPO = Path(__file__).resolve().parents[1]
CONTENT = REPO / "ColoringBookApp" / "Content"
MANIFEST = CONTENT / "categories.json"
LINEART = CONTENT / "LineArt"

# Fixed style anchor. Keeping this in one place is what makes the whole book
# look like it was drawn by the same illustrator.
STYLE_PROMPT = (
    "thick black outline coloring page for toddlers, simple shapes, "
    "no shading, no fill, no color, large closed regions, white background, "
    "cute friendly cartoon, smiling characters, no copyrighted characters, "
    "minimal background detail"
)

CATEGORY_HINTS = {
    "heroes": "an original (non-branded) caped child superhero",
    "princesses": "an original princess or prince in a castle setting",
    "unicorns": "a sparkly cartoon unicorn",
    "dinosaurs": "a friendly cartoon dinosaur",
    "butterflies": "a butterfly or other gentle bug",
    "fantasy": "a baby dragon or wizard scene",
    "space": "a smiling rocket, planet, or astronaut child",
    "undersea": "a friendly mermaid or sea creature",
    "jungle": "a cute jungle animal",
    "farm": "a cute farm animal",
    "vehicles": "a friendly cartoon vehicle with eyes",
    "robots": "a friendly robot or fluffy cute monster",
    "holidays": "a holiday or seasonal scene",
    "sweets": "an anthropomorphic dessert with a smiley face",
    "letters": "a giant letter or number with a related cute creature",
}


@dataclass
class PageRef:
    category_id: str
    page_id: str
    page_title: str
    out_dir: Path


def main() -> int:
    args = _parse_args()

    pages = list(_load_pages(args.only))
    if args.redo:
        pages = [p for p in pages if f"{p.category_id}/{p.page_id}" in args.redo]

    if not pages:
        print("Nothing to generate.")
        return 0

    print(f"Will generate {len(pages)} pages.")
    if args.dry_run:
        for p in pages:
            print(f"  {p.category_id}/{p.page_id}  ->  {p.out_dir}")
        return 0

    if requests is None or Image is None:
        print("Missing deps. Run:  pip install requests pillow", file=sys.stderr)
        return 2

    failures: list[str] = []
    for p in pages:
        try:
            _generate_one(p, args)
        except Exception as e:  # noqa: BLE001
            print(f"  FAIL {p.category_id}/{p.page_id}: {e}", file=sys.stderr)
            failures.append(f"{p.category_id}/{p.page_id}")

    if failures:
        print(f"\n{len(failures)} pages failed. Re-run with --redo {','.join(failures)}", file=sys.stderr)
        return 1
    print("\nDone. Now run tools/build_region_masks.py to produce the region masks.")
    return 0


def _parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="Comma-separated category ids to filter")
    ap.add_argument("--redo", default="", help="Comma-separated category/page ids to force-regenerate")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--size", default="1024x1024")
    args = ap.parse_args()
    args.only = {s.strip() for s in args.only.split(",") if s.strip()}
    args.redo = {s.strip() for s in args.redo.split(",") if s.strip()}
    return args


def _load_pages(only: set[str]) -> Iterable[PageRef]:
    data = json.loads(MANIFEST.read_text())
    for cat in data["categories"]:
        if only and cat["id"] not in only:
            continue
        for page in cat["pages"]:
            out = LINEART / cat["id"]
            yield PageRef(cat["id"], page["id"], page["title"], out)


def _generate_one(p: PageRef, args: argparse.Namespace) -> None:
    p.out_dir.mkdir(parents=True, exist_ok=True)
    raster_path = p.out_dir / f"{p.page_id}.png"
    svg_path = p.out_dir / f"{p.page_id}.svg"
    thumb_path = p.out_dir / f"{p.page_id}.thumb.png"

    if svg_path.exists() and raster_path.exists() and not args.redo:
        print(f"  SKIP {p.category_id}/{p.page_id} (exists)")
        return

    print(f"  GEN  {p.category_id}/{p.page_id}: {p.page_title}")
    prompt = _build_prompt(p)
    img_bytes = _backend_request(prompt, args.size)
    raster_path.write_bytes(img_bytes)

    _postprocess_to_lineart(raster_path)
    _vectorize_to_svg(raster_path, svg_path)
    _make_thumbnail(raster_path, thumb_path)
    time.sleep(1.0)  # gentle on the API


def _build_prompt(p: PageRef) -> str:
    hint = CATEGORY_HINTS.get(p.category_id, "a cute simple cartoon")
    return f"{p.page_title} — {hint}. {STYLE_PROMPT}."


def _backend_request(prompt: str, size: str) -> bytes:
    """Default backend: OpenAI Images API. Replace as needed."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")
    resp = requests.post(
        "https://api.openai.com/v1/images/generations",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "gpt-image-1",
            "prompt": prompt,
            "size": size,
            "n": 1,
            "background": "white",
        },
        timeout=120,
    )
    resp.raise_for_status()
    body = resp.json()
    b64 = body["data"][0]["b64_json"]
    return base64.b64decode(b64)


def _postprocess_to_lineart(path: Path) -> None:
    """Threshold the raster to pure black-on-white so it's true line-art."""
    img = Image.open(path).convert("L")
    img = ImageOps.autocontrast(img, cutoff=2)
    bw = img.point(lambda v: 0 if v < 160 else 255, mode="1").convert("L")
    Image.merge("RGB", (bw, bw, bw)).save(path)


def _vectorize_to_svg(raster: Path, svg_out: Path) -> None:
    """Run potrace to convert the cleaned raster to SVG."""
    try:
        bmp = raster.with_suffix(".pbm")
        Image.open(raster).convert("1").save(bmp)
        subprocess.run(
            ["potrace", str(bmp), "-s", "-o", str(svg_out), "--turdsize", "20"],
            check=True,
        )
        bmp.unlink(missing_ok=True)
    except FileNotFoundError:
        # potrace not installed — keep going with raster only.
        pass


def _make_thumbnail(raster: Path, thumb: Path) -> None:
    img = Image.open(raster).convert("RGB")
    img.thumbnail((256, 256))
    img.save(thumb)


if __name__ == "__main__":
    sys.exit(main())
