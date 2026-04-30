#!/usr/bin/env bash
# render.sh — build the PDF from index.html
#
# Usage:
#   ./scripts/render.sh                        # outputs ks-ppd.pdf
#   ./scripts/render.sh forja-ppd.pdf          # custom output name
#
# Requires: Python 3 with weasyprint installed.
#   pip install weasyprint            (on most systems)
#   pip install weasyprint --break-system-packages   (on newer Debian/Ubuntu)
#
# Run from the template root directory.

set -e

OUTPUT="${1:-ks-ppd.pdf}"
INPUT="index.html"

if [ ! -f "$INPUT" ]; then
  echo "Error: $INPUT not found. Run from the template root directory."
  exit 1
fi

echo "Rendering $INPUT → $OUTPUT"
python3 -c "
from weasyprint import HTML
HTML('$INPUT').write_pdf('$OUTPUT')
import os
size_kb = os.path.getsize('$OUTPUT') / 1024
print(f'  Done — {size_kb:.0f} KB')
"

echo ""
echo "PDF: $(pwd)/$OUTPUT"
