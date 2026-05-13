#!/usr/bin/env bash
# Convenience wrapper to regenerate a single coloring page.
# Usage: ./tools/redo.sh unicorns/baby_unicorn
set -euo pipefail
if [ $# -ne 1 ]; then echo "Usage: $0 <category>/<page_id>" >&2; exit 1; fi
TARGET="$1"
echo "Regenerating $TARGET..."
python3 "$(dirname "$0")/generate_lineart.py" --redo "$TARGET"
CAT="${TARGET%/*}"
python3 "$(dirname "$0")/build_region_masks.py" --only "$CAT"
echo "Done. Page is now in ColoringBookApp/Content/LineArt/$TARGET.png and web/assets/line-art/$TARGET.png"
