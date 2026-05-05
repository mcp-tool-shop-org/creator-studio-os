#!/usr/bin/env bash
# Create binary test fixtures for the csos smoke harness.
#
# Usage:
#   bash tests/fixtures/make-fixtures.sh
#
# Requirements: ffmpeg (brew install ffmpeg)

set -euo pipefail

FIXTURES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Creating smoke fixtures in: $FIXTURES_DIR"

# ── black-5s.mov ─────────────────────────────────────────────────────────────
# 5-second 1280×720 black video, H.264, 30fps.
# Used by Phase 1 (Compressor encode + monitor).
MOV="$FIXTURES_DIR/black-5s.mov"
if [ -f "$MOV" ]; then
  echo "  ✓ black-5s.mov already exists ($(du -h "$MOV" | cut -f1))"
else
  if ! command -v ffmpeg &>/dev/null; then
    echo "  ✗ ffmpeg not found. Install with: brew install ffmpeg"
    exit 1
  fi
  echo "  Creating black-5s.mov..."
  ffmpeg -y \
    -f lavfi -i "color=c=black:s=1280x720:d=5" \
    -c:v libx264 -r 30 -pix_fmt yuv420p \
    -an \
    "$MOV" 2>/dev/null
  echo "  ✓ black-5s.mov created ($(du -h "$MOV" | cut -f1))"
fi

# ── black-30s.mov ─────────────────────────────────────────────────────────────
# 30-second 1920×1080 black ProRes video, 30fps.
# Used by Phase 1 smoke (Compressor encode + monitor). Longer duration gives the
# streaming monitor multiple poll windows on Apple Silicon before the job completes.
MOV30="$FIXTURES_DIR/black-30s.mov"
if [ -f "$MOV30" ]; then
  echo "  ✓ black-30s.mov already exists ($(du -h "$MOV30" | cut -f1))"
else
  if ! command -v ffmpeg &>/dev/null; then
    echo "  ✗ ffmpeg not found. Install with: brew install ffmpeg"
    exit 1
  fi
  echo "  Creating black-30s.mov..."
  ffmpeg -y \
    -f lavfi -i "color=c=black:s=1920x1080:d=30" \
    -c:v prores_ks \
    -an \
    "$MOV30" 2>/dev/null
  echo "  ✓ black-30s.mov created ($(du -h "$MOV30" | cut -f1))"
fi

echo "Fixtures ready."
