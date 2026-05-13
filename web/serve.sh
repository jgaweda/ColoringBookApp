#!/usr/bin/env bash
# Tiny local dev server for the PWA. Service workers require HTTPS or
# localhost — `python3 -m http.server` on localhost is sufficient.
# On the same Wi-Fi as your iPad? Use `--network` to bind 0.0.0.0 and open
# http://<your-mac-ip>:8000 on the iPad.

set -euo pipefail

PORT=${PORT:-8000}
HOST=127.0.0.1
if [[ "${1:-}" == "--network" ]]; then HOST=0.0.0.0; fi

cd "$(dirname "$0")"

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --bind "$HOST"
elif command -v ruby >/dev/null 2>&1; then
  exec ruby -run -ehttpd . -p "$PORT" -b "$HOST"
else
  echo "Need python3 or ruby on PATH." >&2
  exit 1
fi
