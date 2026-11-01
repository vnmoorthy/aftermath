#!/usr/bin/env bash
# Builds the server-free github.io version of the phone game into static-site/ (needs static-build/ from bake-static.ts).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=static-site; SITE_URL="${SITE_URL:-https://vnmoorthy.github.io/aftermath/}"
rm -rf "${OUT:?}"; mkdir -p "$OUT"
cp -R web/assets "$OUT/assets"; rm -rf "$OUT/assets/gen"; mkdir -p "$OUT/assets/gen"
cp static-build/gen/* "$OUT/assets/gen/" 2>/dev/null || true
cp -R static-build/voice "$OUT/voice"; cp static-build/worlds.json "$OUT/"
for f in cosmos.js wormhole.js music.js pano.js explore.js static-shim.js; do sed -e "s#'/assets/#'assets/#g; s#\"/assets/#\"assets/#g; s#\`/assets/#\`assets/#g" "web/$f" > "$OUT/$f"; done
sed -e 's#<head>#<head>\n<script src="static-shim.js"></script>#' \
    -e "s#src=\"/api/qr.svg\"#src=\"qr.png\"#g" \
    -e "s#src=\"/#src=\"#g; s#href=\"/#href=\"#g; s#url(/assets/#url(assets/#g; s#'/assets/#'assets/#g; s#\"/assets/#\"assets/#g; s#\`/assets/#\`assets/#g" \
    web/phone-art.html > "$OUT/index.html"
bun -e "import QRCode from 'qrcode'; await QRCode.toFile('$OUT/qr.png', '$SITE_URL', { width: 600, margin: 2 })"
touch "$OUT/.nojekyll"
du -sh "$OUT"
