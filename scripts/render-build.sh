#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Building frontend (PWA)"
cd "$ROOT/frontend"
# npm ci falla en Linux si el lockfile se generó en Windows (deps opcionales de rolldown/vite).
npm install --no-audit --no-fund
npm run build

echo "==> Copying frontend dist to backend/static"
rm -rf "$ROOT/backend/static"
cp -r "$ROOT/frontend/dist" "$ROOT/backend/static"

echo "==> Installing Python dependencies"
cd "$ROOT/backend"
pip install -r requirements.txt

echo "==> Render build complete"
