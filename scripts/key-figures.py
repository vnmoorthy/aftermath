# Chroma-keys the green-screen figure renders into transparent cutouts (web/assets/figure-*.webp).
import sys, os
from PIL import Image
for name in ("figure-a", "figure-b", "figure-c"):
    p = f"web/assets/{name}.webp"
    if not os.path.exists(p): continue
    im = Image.open(p).convert("RGBA"); px = im.load(); w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            m = max(r, b)
            if g > 90 and g > m * 1.35:
                px[x, y] = (r, m, b, 0)                       # background
            elif g > m * 1.08:
                k = min(1.0, (g - m * 1.08) / (m * 0.27 + 1))  # soft edge + despill
                px[x, y] = (r, m, b, int(255 * (1 - k)))
    bb = im.getbbox()
    if bb: im = im.crop(bb)
    im.thumbnail((700, 1100))
    im.save(p, "WEBP", quality=88)
    print("keyed", p, im.size)
