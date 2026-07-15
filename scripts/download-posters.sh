#!/usr/bin/env bash
#
# download-posters.sh — Download real course posters from the WordPress server
#
# Run this script in a deployment environment with network access to
# karafarini.shomal.ac.ir. It downloads all 14 real poster images and
# generates optimized WebP variants, replacing the placeholder posters.
#
# Usage:
#   chmod +x scripts/download-posters.sh
#   ./scripts/download-posters.sh
#
# Requirements: curl, ImageMagick (convert) or libwebp (cwebp)
#

set -euo pipefail

COURSES_DIR="public/images/courses"
mkdir -p "$COURSES_DIR"

# Course slug -> source URL
declare -A POSTERS=(
  ["aimsun"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/10/Banner-AIMSUN-1.jpg"
  ["python"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/10/Untitled-5.png"
  ["massage"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/09/IEC-Banner-Mehdi-Fathi-2-_-3-Dpi-72-CMYK-scaled.jpg"
  ["3d-printing"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/10/IEC-Banner-Mehdi-Ghasempor-2-_-3-Dpi-72-CMYK-scaled.jpg"
  ["accounting"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/10/IMG_6701-scaled.jpeg"
  ["instruments"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/09/761989bf-8512-4ced-a236-f34d6a6830c9.jpeg"
  ["financial-trading"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/09/IMG_5522.jpeg"
  ["accounting-basics"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/09/image.jpg"
  ["creativity-robotics"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/07/WhatsApp-Image-2025-06-09-at-15.15.59-1-min-1448x2048.webp"
  ["python-creative-beginner"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/07/WhatsApp-Image-2025-06-09-at-15.13.08-min-1462x2048.webp"
  ["python-creative-intermediate"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/07/POSTER1-1-min-1463x2048.png"
  ["frontend-programming"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/07/POSTER4-min-1448x2048.webp"
  ["management-skills"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/09/photo13663196857.jpg"
  ["sales-drivers"]="https://karafarini.shomal.ac.ir/wp-content/uploads/2025/09/photo13686228624.jpg"
)

echo "============================================================"
echo "Downloading real course posters"
echo "============================================================"

HAS_CWEBP=$(command -v cwebp || echo "")
HAS_CONVERT=$(command -v convert || echo "")

for slug in "${!POSTERS[@]}"; do
  url="${POSTERS[$slug]}"
  raw="$COURSES_DIR/${slug}-raw.tmp"
  jpg="$COURSES_DIR/${slug}.jpg"
  webp="$COURSES_DIR/${slug}.webp"

  echo ""
  echo "[$slug]"

  # Download
  if curl -sL --max-time 30 -o "$raw" "$url"; then
    echo "  Downloaded: $(wc -c < "$raw") bytes"
  else
    echo "  WARNING: Download failed, keeping placeholder"
    continue
  fi

  # Convert to JPEG (resize to max 800x1000, optimize)
  if [ -n "$HAS_CONVERT" ]; then
    convert "$raw" -resize 800x1000\> -quality 88 -strip "$jpg"
    echo "  JPEG: $(wc -c < "$jpg") bytes"
  else
    cp "$raw" "$jpg"
    echo "  JPEG (raw copy, no ImageMagick): $(wc -c < "$jpg") bytes"
  fi

  # Generate WebP
  if [ -n "$HAS_CWEBP" ]; then
    cwebp -quiet -q 82 -resize 800 1000 "$jpg" -o "$webp"
    echo "  WebP: $(wc -c < "$webp") bytes"
  elif [ -n "$HAS_CONVERT" ]; then
    convert "$raw" -resize 800x1000\> -quality 82 "$webp"
    echo "  WebP: $(wc -c < "$webp") bytes"
  else
    echo "  WebP: skipped (no cwebp or convert)"
  fi

  # Cleanup raw
  rm -f "$raw"
done

echo ""
echo "============================================================"
echo "Poster download complete!"
echo "============================================================"
echo ""
echo "Note: If any downloads failed, placeholder posters remain in place."
echo "      Re-run this script when network access is available."
