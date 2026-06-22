#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Building frontend (PWA)"
cd "$ROOT/frontend"
npm ci
npm run build

echo "==> Copying frontend dist to backend/static"
rm -rf "$ROOT/backend/static"
cp -r "$ROOT/frontend/dist" "$ROOT/backend/static"

echo "==> Installing Python dependencies"
cd "$ROOT/backend"
pip install -r requirements.txt

echo "==> Render build complete"
