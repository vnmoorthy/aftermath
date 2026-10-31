# Renders a full-frame (1920x1080) transparent overlay with text for the product video.
# Usage: python3 overlay-png.py '<json spec>' out.png   spec = {"items":[{"text","size","x","y","color","align"}], "bar": bool, "qr": path}
import json, sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
spec = json.loads(sys.argv[1]); out = sys.argv[2]
W, H = 1920, 1080
im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
fonts = ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc"]
fp = next((f for f in fonts if os.path.exists(f)), None)
if spec.get("bar"): d.rectangle([0, H - 150, W, H], fill=(0, 0, 0, 140))
if spec.get("qr") and os.path.exists(spec["qr"]):
    q = Image.open(spec["qr"]).convert("RGBA").resize((300, 300)); im.alpha_composite(q, ((W - 300) // 2, int(H * 0.42)))
for it in spec.get("items", []):
    f = ImageFont.truetype(fp, it["size"]) if fp else ImageFont.load_default()
    col = tuple(int(it.get("color", "FFFFFF")[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
    y = it["y"]
    for line in it["text"].split("\n"):
        tw = d.textlength(line, font=f)
        x = (W - tw) / 2 if it.get("align") == "center" else it["x"]
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).text((x + 3, y + 3), line, font=f, fill=(0, 0, 0, 200))
        im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(4)))
        d.text((x, y), line, font=f, fill=col)
        y += int(it["size"] * 1.35)
im.save(out)
