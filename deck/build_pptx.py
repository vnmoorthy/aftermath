#!/usr/bin/env python3
"""Builds deck/AFTERMATH.pptx: a 10-slide 16:9 cinematic pitch deck with native shapes,
real art from web/assets, speaker notes, slide transitions (Morph / Vortex / Fly Through with
fade fallbacks) and staged entrance animations written straight into the slide XML.

    python3 deck/build_pptx.py

Requires python-pptx (1.0.x) and Pillow. Fonts: titles use TITLE_FONT (Georgia renders
everywhere; set it to "Cinzel" if Cinzel is installed on the presenting machine)."""
import copy
import os
from lxml import etree
from PIL import Image
from pptx import Presentation
from pptx.util import Emu, Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
OUT = os.path.join(HERE, "AFTERMATH.pptx")

TITLE_FONT = os.environ.get("AFTERMATH_TITLE_FONT", "Georgia")  # Cinzel-like: caps + wide tracking
BODY_FONT = "Avenir Next"
MONO_FONT = "Menlo"

BG = "05030C"
INK = "F1EBFF"
DIM = "9A90B8"
LAV = "C9B8EC"
GOLD = "FFC65A"
RED = "FF3B3B"
PINK = "FF5D7D"
CYAN = "5EE6FF"
MARS = "FF9A52"
PANEL = "0E0A1E"
LINE = "3A2F5C"

ARCH = [  # id, label, motto, color
    ("survivor", "The Survivor", "Endure. At any cost.", "F5B942"),
    ("conqueror", "The Conqueror", "All stars will kneel.", "FF3B3B"),
    ("befriender", "The Befriender", "Stay. Please stay.", "5EE6FF"),
    ("destroyer", "The Destroyer", "Life is the error.", "FF2A6D"),
    ("broken", "The Broken One", "[signal degraded]", "C9D1D9"),
    ("human_gardener", "The Human Gardener", "We grow you now.", "7DFF7A"),
    ("alien_gardener", "The Alien Gardener", "New life, our design.", "B388FF"),
    ("archivist", "The Archivist", "Nothing is forgotten.", "E8D5A3"),
    ("worshipper", "The Worshipper", "The makers have returned.", "FFD36E"),
    ("trickster", "The Trickster", "Reality is a game I'm winning.", "FF8AF0"),
]
ACOL = {a[0]: a[3] for a in ARCH}

SW, SH = 13.333, 7.5
NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"


def I(v):
    return Inches(v)


def rgb(h):
    return RGBColor.from_string(h)


# ----------------------------------------------------------------------------- low-level XML helpers
def _sppr(shape):
    return shape._element.spPr


def _geom_index(sppr):
    for i, ch in enumerate(sppr):
        if ch.tag in (qn("a:prstGeom"), qn("a:custGeom")):
            return i
    for i, ch in enumerate(sppr):
        if ch.tag == qn("a:xfrm"):
            return i
    return -1


def _strip_fill(sppr):
    for tag in ("a:noFill", "a:solidFill", "a:gradFill", "a:blipFill", "a:pattFill", "a:grpFill"):
        for el in sppr.findall(qn(tag)):
            sppr.remove(el)


def set_fill(shape, hexcol, alpha=None):
    sppr = _sppr(shape)
    _strip_fill(sppr)
    alpha_xml = f'<a:alpha val="{int(alpha * 100000)}"/>' if alpha is not None else ""
    el = etree.fromstring(f'<a:solidFill xmlns:a="{NS_A}"><a:srgbClr val="{hexcol}">{alpha_xml}</a:srgbClr></a:solidFill>')
    sppr.insert(_geom_index(sppr) + 1, el)


def set_nofill(shape):
    sppr = _sppr(shape)
    _strip_fill(sppr)
    sppr.insert(_geom_index(sppr) + 1, etree.fromstring(f'<a:noFill xmlns:a="{NS_A}"/>'))


def set_grad(shape, stops, angle=0):
    """stops: [(pos 0..100, hex, alpha 0..1)], angle in degrees (0 = left->right, 90 = top->bottom)."""
    sppr = _sppr(shape)
    _strip_fill(sppr)
    gs = "".join(
        f'<a:gs pos="{int(p * 1000)}"><a:srgbClr val="{c}"><a:alpha val="{int(a * 100000)}"/></a:srgbClr></a:gs>'
        for p, c, a in stops
    )
    el = etree.fromstring(
        f'<a:gradFill xmlns:a="{NS_A}" flip="none" rotWithShape="1"><a:gsLst>{gs}</a:gsLst>'
        f'<a:lin ang="{int(angle * 60000)}" scaled="0"/></a:gradFill>'
    )
    sppr.insert(_geom_index(sppr) + 1, el)


def set_line(shape, hexcol=None, width=1.0, alpha=None, dash=None):
    sppr = _sppr(shape)
    for el in sppr.findall(qn("a:ln")):
        sppr.remove(el)
    if hexcol is None:
        ln = etree.fromstring(f'<a:ln xmlns:a="{NS_A}"><a:noFill/></a:ln>')
    else:
        alpha_xml = f'<a:alpha val="{int(alpha * 100000)}"/>' if alpha is not None else ""
        dash_xml = f'<a:prstDash val="{dash}"/>' if dash else ""
        ln = etree.fromstring(
            f'<a:ln xmlns:a="{NS_A}" w="{int(Pt(width))}"><a:solidFill><a:srgbClr val="{hexcol}">{alpha_xml}</a:srgbClr></a:solidFill>{dash_xml}</a:ln>'
        )
    # a:ln goes after the fill
    idx = _geom_index(sppr) + 1
    for i, ch in enumerate(sppr):
        if ch.tag in (qn("a:noFill"), qn("a:solidFill"), qn("a:gradFill"), qn("a:blipFill")):
            idx = i + 1
    sppr.insert(idx, ln)
    return ln


def add_effects(shape, glow=None, shadow=None, soft=None):
    """glow=(hex, radius_pt, alpha); shadow=(blur_pt, dist_pt, alpha); soft=radius_pt."""
    sppr = _sppr(shape)
    for el in sppr.findall(qn("a:effectLst")):
        sppr.remove(el)
    parts = []
    if glow:
        c, r, a = glow
        parts.append(f'<a:glow rad="{int(Pt(r))}"><a:srgbClr val="{c}"><a:alpha val="{int(a * 100000)}"/></a:srgbClr></a:glow>')
    if shadow:
        b, d, a = shadow
        parts.append(
            f'<a:outerShdw blurRad="{int(Pt(b))}" dist="{int(Pt(d))}" dir="5400000" algn="t" rotWithShape="0">'
            f'<a:srgbClr val="000000"><a:alpha val="{int(a * 100000)}"/></a:srgbClr></a:outerShdw>'
        )
    if soft:
        parts.append(f'<a:softEdge rad="{int(Pt(soft))}"/>')
    el = etree.fromstring(f'<a:effectLst xmlns:a="{NS_A}">{"".join(parts)}</a:effectLst>')
    # effectLst after ln (or after fill if no ln)
    idx = _geom_index(sppr) + 1
    for i, ch in enumerate(sppr):
        if ch.tag in (qn("a:noFill"), qn("a:solidFill"), qn("a:gradFill"), qn("a:blipFill"), qn("a:ln")):
            idx = i + 1
    sppr.insert(idx, el)


def set_geom(shape, prst, adj=None, adj_name=None):
    sppr = _sppr(shape)
    g = sppr.find(qn("a:prstGeom"))
    if g is None:
        g = etree.SubElement(sppr, qn("a:prstGeom"))
    g.set("prst", prst)
    for ch in list(g):
        g.remove(ch)
    av = etree.SubElement(g, qn("a:avLst"))
    if adj is not None:
        gd = etree.SubElement(av, qn("a:gd"))
        gd.set("name", adj_name or ("adj1" if prst.startswith("round2") else "adj"))
        gd.set("fmla", f"val {int(adj)}")


# ----------------------------------------------------------------------------- shapes
def rect(slide, x, y, w, h, fill=None, alpha=None, line=None, lw=1.0, lalpha=None, shape=MSO_SHAPE.RECTANGLE, radius=None, name=None, parent=None):
    shapes = parent.shapes if parent is not None else slide.shapes
    s = shapes.add_shape(shape, I(x), I(y), I(w), I(h))
    if radius is not None and shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    if fill:
        set_fill(s, fill, alpha)
    else:
        set_nofill(s)
    set_line(s, line, lw, lalpha)
    s.shadow.inherit = False
    if name:
        s.name = name
    tf = s.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    return s


def grad(slide, x, y, w, h, stops, angle=0, name=None):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, I(x), I(y), I(w), I(h))
    set_grad(s, stops, angle)
    set_line(s, None)
    s.shadow.inherit = False
    if name:
        s.name = name
    return s


def _style_run(r, font=BODY_FONT, size=14, color=INK, bold=False, italic=False, spc=None, alpha=None, shadow=False):
    f = r.font
    f.name = font
    f.size = Pt(size)
    f.bold = bold
    f.italic = italic
    f.color.rgb = rgb(color)
    rpr = r._r.get_or_add_rPr()
    if spc is not None:
        rpr.set("spc", str(int(spc)))
    if alpha is not None:
        clr = rpr.find(qn("a:solidFill")).find(qn("a:srgbClr"))
        etree.SubElement(clr, qn("a:alpha")).set("val", str(int(alpha * 100000)))
    if shadow:
        eff = etree.fromstring(
            f'<a:effectLst xmlns:a="{NS_A}"><a:outerShdw blurRad="{int(Pt(10))}" dist="0" dir="0" algn="ctr" rotWithShape="0">'
            f'<a:srgbClr val="000000"><a:alpha val="85000"/></a:srgbClr></a:outerShdw></a:effectLst>'
        )
        sf = rpr.find(qn("a:solidFill"))
        sf.addnext(eff)
    # East-Asian/complex-script fallbacks keep glyphs like the arrow in the same face
    latin = rpr.find(qn("a:latin"))
    if latin is not None:
        cs = etree.SubElement(rpr, qn("a:cs"))
        cs.set("typeface", font)


def text(slide, x, y, w, h, paras, size=14, font=BODY_FONT, color=INK, bold=False, italic=False, spc=None,
         align="l", anchor="t", line_spacing=None, space_after=0, name=None, shadow=False, parent=None, wrap=True):
    """paras: list of paragraphs; a paragraph is a str or a list of (text, overrides dict) runs.
    A paragraph may also be a dict {"runs": [...], "align":..., "size":..., "space_before":...}."""
    shapes = parent.shapes if parent is not None else slide.shapes
    tb = shapes.add_textbox(I(x), I(y), I(w), I(h))
    if name:
        tb.name = name
    tf = tb.text_frame
    tf.word_wrap = wrap
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = {"t": MSO_ANCHOR.TOP, "m": MSO_ANCHOR.MIDDLE, "b": MSO_ANCHOR.BOTTOM}[anchor]
    bodypr = tf._txBody.find(qn("a:bodyPr"))
    for ch in list(bodypr):
        bodypr.remove(ch)
    etree.SubElement(bodypr, qn("a:noAutofit"))
    if isinstance(paras, str):
        paras = [paras]
    for i, p in enumerate(paras):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        popts = {}
        if isinstance(p, dict):
            popts = p
            runs = p["runs"]
        elif isinstance(p, str):
            runs = [(p, {})]
        else:
            runs = p
        if isinstance(runs, str):
            runs = [(runs, {})]
        a = popts.get("align", align)
        para.alignment = {"l": PP_ALIGN.LEFT, "c": PP_ALIGN.CENTER, "r": PP_ALIGN.RIGHT}[a]
        ls = popts.get("line_spacing", line_spacing)
        if ls:
            para.line_spacing = ls
        para.space_after = Pt(popts.get("space_after", space_after))
        if "space_before" in popts:
            para.space_before = Pt(popts["space_before"])
        for t, o in runs:
            r = para.add_run()
            r.text = t
            _style_run(
                r,
                font=o.get("font", popts.get("font", font)),
                size=o.get("size", popts.get("size", size)),
                color=o.get("color", popts.get("color", color)),
                bold=o.get("bold", popts.get("bold", bold)),
                italic=o.get("italic", popts.get("italic", italic)),
                spc=o.get("spc", popts.get("spc", spc)),
                alpha=o.get("alpha"),
                shadow=o.get("shadow", shadow),
            )
    return tb


_img_cache = {}


def _img_size(path):
    if path not in _img_cache:
        _img_cache[path] = Image.open(path).size
    return _img_cache[path]


def pic(slide, name, x, y, w, h, focus=(0.5, 0.5), geom=None, adj=None, line=None, lw=1.5, glow=None, shadow=None, shape_name=None, parent=None, soft=None):
    """Adds an image cropped to cover the box (like CSS object-fit: cover)."""
    path = os.path.join(ASSETS, name) if not os.path.isabs(name) else name
    iw, ih = _img_size(path)
    shapes = parent.shapes if parent is not None else slide.shapes
    p = shapes.add_picture(path, I(x), I(y), I(w), I(h))
    box = w / h
    img = iw / ih
    if img > box:  # crop sides
        keep = box / img
        extra = 1 - keep
        left = max(0.0, min(extra, focus[0] - keep / 2))
        p.crop_left = left
        p.crop_right = extra - left
    elif img < box:  # crop top/bottom
        keep = img / box
        extra = 1 - keep
        top = max(0.0, min(extra, focus[1] - keep / 2))
        p.crop_top = top
        p.crop_bottom = extra - top
    if geom:
        set_geom(p, geom, adj)
    if line:
        set_line(p, line, lw)
    if glow or shadow or soft:
        add_effects(p, glow=glow, shadow=shadow, soft=soft)
    if shape_name:
        p.name = shape_name
    return p


def arrow(slide, x1, y1, x2, y2, color=GOLD, width=2.0, dash=None, head=True, tail=False, name=None, alpha=None):
    c = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, I(x1), I(y1), I(x2), I(y2))
    ln = c.line._get_or_add_ln()
    for ch in list(ln):
        ln.remove(ch)
    ln.set("w", str(int(Pt(width))))
    ln.set("cap", "rnd")
    alpha_xml = f'<a:alpha val="{int(alpha * 100000)}"/>' if alpha is not None else ""
    ln.append(etree.fromstring(f'<a:solidFill xmlns:a="{NS_A}"><a:srgbClr val="{color}">{alpha_xml}</a:srgbClr></a:solidFill>'))
    if dash:
        ln.append(etree.fromstring(f'<a:prstDash xmlns:a="{NS_A}" val="{dash}"/>'))
    ln.append(etree.fromstring(f'<a:round xmlns:a="{NS_A}"/>'))
    if tail:
        ln.append(etree.fromstring(f'<a:headEnd xmlns:a="{NS_A}" type="triangle" w="med" len="med"/>'))
    if head:
        ln.append(etree.fromstring(f'<a:tailEnd xmlns:a="{NS_A}" type="triangle" w="med" len="med"/>'))
    if name:
        c.name = name
    return c


def _ease(t):
    import numpy as np
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def make_bg(out_name, src, crop=None, left=None, bottom=None, top=None, base=0.0, spot=None, W=1920, H=1080):
    """Bakes cinematic darkening into a 16:9 background so it renders identically in PowerPoint,
    Keynote, LibreOffice and the web deck. left=(x0, x1): fully dark before x0 (fraction of width),
    clear after x1. bottom/top=(start, strength). spot=(cx, cy, rx, ry, strength): dark ellipse."""
    import numpy as np
    im = Image.open(os.path.join(ASSETS, src)).convert("RGB")
    if crop:
        im = im.crop(crop)
    iw, ih = im.size
    sc = max(W / iw, H / ih)
    im = im.resize((round(iw * sc), round(ih * sc)), Image.LANCZOS)
    x0 = (im.width - W) // 2
    y0 = (im.height - H) // 2
    im = im.crop((x0, y0, x0 + W, y0 + H))
    a = np.full((H, W), base, dtype=np.float32)
    xs = np.linspace(0, 1, W)[None, :]
    ys = np.linspace(0, 1, H)[:, None]
    if left:
        a = np.maximum(a, (1 - _ease((xs - left[0]) / (left[1] - left[0]))) * np.ones((H, 1)))
    if bottom:
        a = np.maximum(a, bottom[1] * _ease((ys - bottom[0]) / (1 - bottom[0])) * np.ones((1, W)))
    if top:
        a = np.maximum(a, top[1] * (1 - _ease(ys / top[0])) * np.ones((1, W)))
    if spot:
        cx, cy, rx, ry, st = spot
        d = np.sqrt(((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2)
        a = np.maximum(a, st * (1 - _ease(d)))
    bg = np.array([0x05, 0x03, 0x0C], dtype=np.float32)
    arr = np.asarray(im, dtype=np.float32)
    arr = arr * (1 - a[..., None]) + bg * a[..., None]
    out = os.path.join(ASSETS, out_name)
    Image.fromarray(arr.clip(0, 255).astype("uint8")).save(out, quality=88, optimize=True)
    return out_name


BG1 = make_bg("bg-title.jpg", "title-card.jpg", crop=(0, 40, 1536, 904), bottom=(0.55, 0.95), spot=(0.5, 0.55, 0.36, 0.16, 0.6))
BG2 = make_bg("bg-premise.jpg", "world-ruins.jpg", left=(0.25, 0.68), bottom=(0.7, 0.85))
BG8 = make_bg("bg-mars.jpg", "world-mars.jpg", left=(0.33, 0.72), top=(0.25, 0.65), bottom=(0.82, 0.6))
BG10 = make_bg("bg-close.jpg", "title-card.jpg", crop=(110, 300, 1426, 1024), left=(0.25, 1.4), base=0.5, bottom=(0.7, 0.9))


def notes(slide, body):
    slide.notes_slide.notes_text_frame.text = body.strip()


# ----------------------------------------------------------------------------- motion: transitions
NS_DECL = (
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
    f'xmlns:p="{NS_P}" '
    'xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" '
    'xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main"'
)


def transition_xml(kind, dur=1500):
    if kind == "fade":
        return f'<p:transition xmlns:p="{NS_P}" spd="slow"><p:fade thruBlk="1"/></p:transition>'
    if kind == "morph":
        choice = (
            f'<mc:Choice Requires="p159"><p:transition spd="slow" p14:dur="{dur}">'
            f'<p159:morph option="byObject"/></p:transition></mc:Choice>'
        )
    elif kind == "vortex":
        choice = f'<mc:Choice Requires="p14"><p:transition spd="slow" p14:dur="{dur}"><p14:vortex dir="r"/></p:transition></mc:Choice>'
    elif kind == "flythrough":
        choice = f'<mc:Choice Requires="p14"><p:transition spd="slow" p14:dur="{dur}"><p14:flythrough/></p:transition></mc:Choice>'
    elif kind == "prism":
        choice = f'<mc:Choice Requires="p14"><p:transition spd="slow" p14:dur="{dur}"><p14:prism isInverted="1"/></p:transition></mc:Choice>'
    else:
        raise ValueError(kind)
    return (
        f'<mc:AlternateContent {NS_DECL}>{choice}'
        f'<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>'
    )


# ----------------------------------------------------------------------------- motion: entrance animations
class Timeline:
    """Collects entrance/emphasis effects for one slide and writes a valid p:timing tree.
    Each group starts either automatically when the slide appears ("auto") or on click ("click");
    inside a group every effect has its own start offset (ms) relative to the group start."""

    def __init__(self):
        self.groups = []

    def group(self, trigger="auto"):
        g = {"trigger": trigger, "items": []}
        self.groups.append(g)
        return g

    @staticmethod
    def add(g, shape, effect="fade", at=0, dur=600):
        g["items"].append((shape, effect, at, dur))

    def xml(self):
        self._id = 2
        targets = []

        def nid():
            self._id += 1
            return self._id

        def tgt(sp):
            return f'<p:tgtEl><p:spTgt spid="{sp}"/></p:tgtEl>'

        def setvis(sp):
            return (
                f'<p:set><p:cBhvr><p:cTn id="{nid()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
                f'{tgt(sp)}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
                f'<p:to><p:strVal val="visible"/></p:to></p:set>'
            )

        def anim(sp, attr, frm, to, dur, decel=True):
            d = ' decel="100000"' if decel else ""
            return (
                f'<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="{nid()}" dur="{dur}" fill="hold"{d}/>'
                f'{tgt(sp)}<p:attrNameLst><p:attrName>{attr}</p:attrName></p:attrNameLst></p:cBhvr>'
                f'<p:tavLst><p:tav tm="0"><p:val><p:strVal val="{frm}"/></p:val></p:tav>'
                f'<p:tav tm="100000"><p:val><p:strVal val="{to}"/></p:val></p:tav></p:tavLst></p:anim>'
            )

        def fx(sp, filt, dur):
            return f'<p:animEffect transition="in" filter="{filt}"><p:cBhvr><p:cTn id="{nid()}" dur="{dur}"/>{tgt(sp)}</p:cBhvr></p:animEffect>'

        def body(sp, effect, dur):
            """returns (presetID, presetClass, presetSubtype, xml)"""
            if effect == "fade":
                return 10, "entr", 0, setvis(sp) + fx(sp, "fade", dur)
            if effect == "zoom":
                return 53, "entr", 16, (
                    setvis(sp) + anim(sp, "ppt_w", "#ppt_w*0.82", "#ppt_w", dur) + anim(sp, "ppt_h", "#ppt_h*0.82", "#ppt_h", dur) + fx(sp, "fade", dur)
                )
            if effect == "bigzoom":
                return 53, "entr", 16, (
                    setvis(sp) + anim(sp, "ppt_w", "#ppt_w*1.25", "#ppt_w", dur) + anim(sp, "ppt_h", "#ppt_h*1.25", "#ppt_h", dur) + fx(sp, "fade", dur)
                )
            if effect == "rise":
                return 42, "entr", 0, (
                    setvis(sp) + fx(sp, "fade", dur) + anim(sp, "ppt_x", "#ppt_x", "#ppt_x", dur) + anim(sp, "ppt_y", "#ppt_y+.045", "#ppt_y", dur)
                )
            if effect == "left":
                return 47, "entr", 0, (
                    setvis(sp) + fx(sp, "fade", dur) + anim(sp, "ppt_x", "#ppt_x-.05", "#ppt_x", dur) + anim(sp, "ppt_y", "#ppt_y", "#ppt_y", dur)
                )
            if effect == "right":
                return 47, "entr", 0, (
                    setvis(sp) + fx(sp, "fade", dur) + anim(sp, "ppt_x", "#ppt_x+.05", "#ppt_x", dur) + anim(sp, "ppt_y", "#ppt_y", "#ppt_y", dur)
                )
            if effect == "wipe":
                return 22, "entr", 8, setvis(sp) + fx(sp, "wipe(left)", dur)
            if effect == "wipe_r":
                return 22, "entr", 2, setvis(sp) + fx(sp, "wipe(right)", dur)
            if effect == "wipe_d":
                return 22, "entr", 1, setvis(sp) + fx(sp, "wipe(up)", dur)
            if effect == "kenburns":  # slow cinematic push-in on background art
                return 6, "emph", 0, (
                    f'<p:animScale><p:cBhvr><p:cTn id="{nid()}" dur="{dur}" fill="hold" decel="50000"/>{tgt(sp)}</p:cBhvr>'
                    f'<p:by x="110000" y="110000"/></p:animScale>'
                )
            if effect == "pulse":  # gentle breathing loop
                return 6, "emph", 0, (
                    f'<p:animScale><p:cBhvr><p:cTn id="{nid()}" dur="{dur}" autoRev="1" repeatCount="indefinite" fill="hold"/>{tgt(sp)}</p:cBhvr>'
                    f'<p:by x="106000" y="106000"/></p:animScale>'
                )
            raise ValueError(effect)

        groups_xml = []
        first = True
        for g in self.groups:
            if not g["items"]:
                continue
            gid = nid()
            if g["trigger"] == "auto":
                cond = '<p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond>' if first else '<p:cond delay="indefinite"/>'
            else:
                cond = '<p:cond delay="indefinite"/>'
            by_offset = {}
            for it in g["items"]:
                by_offset.setdefault(it[2], []).append(it)
            inner = []
            for k, off in enumerate(sorted(by_offset)):
                pid = nid()
                effs = []
                for j, (shape, effect, at, dur) in enumerate(by_offset[off]):
                    sp = shape.shape_id
                    eid = nid()
                    preset, cls, sub, bx = body(sp, effect, dur)
                    if k == 0 and j == 0:
                        node = "clickEffect" if g["trigger"] == "click" else "afterEffect"
                    elif j == 0:
                        node = "afterEffect"
                    else:
                        node = "withEffect"
                    effs.append(
                        f'<p:par><p:cTn id="{eid}" presetID="{preset}" presetClass="{cls}" presetSubtype="{sub}" fill="hold" grpId="0" nodeType="{node}">'
                        f'<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>{bx}</p:childTnLst></p:cTn></p:par>'
                    )
                    targets.append(shape)
                inner.append(
                    f'<p:par><p:cTn id="{pid}" fill="hold"><p:stCondLst><p:cond delay="{off}"/></p:stCondLst>'
                    f'<p:childTnLst>{"".join(effs)}</p:childTnLst></p:cTn></p:par>'
                )
            groups_xml.append(
                f'<p:par><p:cTn id="{gid}" fill="hold"><p:stCondLst>{cond}</p:stCondLst><p:childTnLst>{"".join(inner)}</p:childTnLst></p:cTn></p:par>'
            )
            first = False
        if not groups_xml:
            return None
        bld = []
        seen = set()
        for s in targets:
            if s.shape_id in seen:
                continue
            seen.add(s.shape_id)
            if s._element.tag == qn("p:sp"):
                has_text = s.has_text_frame and s.text_frame.text.strip() != ""
                bld.append(f'<p:bldP spid="{s.shape_id}" grpId="0"{"" if has_text else " animBg=\"1\""}/>')
        bld_xml = f'<p:bldLst>{"".join(bld)}</p:bldLst>' if bld else ""
        return (
            f'<p:timing xmlns:p="{NS_P}"><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            f'<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>{"".join(groups_xml)}</p:childTnLst></p:cTn>'
            f'<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            f'<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
            f'</p:childTnLst></p:cTn></p:par></p:tnLst>{bld_xml}</p:timing>'
        )


def apply_motion(slide, transition, timeline):
    sld = slide._element
    for tag in ("p:transition", "p:timing"):
        for el in sld.findall(qn(tag)):
            sld.remove(el)
    for el in sld.findall("{http://schemas.openxmlformats.org/markup-compatibility/2006}AlternateContent"):
        sld.remove(el)
    anchor = sld.find(qn("p:clrMapOvr"))
    if anchor is None:
        anchor = sld.find(qn("p:cSld"))
    tr = etree.fromstring(transition_xml(transition))
    anchor.addnext(tr)
    tx = timeline.xml() if timeline else None
    if tx:
        tr.addnext(etree.fromstring(tx))


# ----------------------------------------------------------------------------- deck
prs = Presentation()
prs.slide_width = I(SW)
prs.slide_height = I(SH)
BLANK = prs.slide_layouts[6]


def new_slide():
    s = prs.slides.add_slide(BLANK)
    bg = s.background.fill
    bg.solid()
    bg.fore_color.rgb = rgb(BG)
    return s


def chrome(s, n, kicker, dark_footer=False):
    """Persistent elements, named with !! so Morph glides them between slides."""
    text(s, 0.62, 0.42, 9, 0.3, [[(f"{n:02d}", {"color": GOLD, "bold": True}), ("  ·  " + kicker, {"color": GOLD})]],
         size=10.5, font=MONO_FONT, spc=350, name="!!kicker")
    rule = rect(s, 0.62, 0.78, 0.55, 0.028, fill=GOLD, name="!!rule")
    text(s, 0.62, 7.0, 6, 0.25, [[("AFTERMATH", {"bold": True, "color": LAV}), ("   ·   THE UNIVERSE AI INHERITED", {})]],
         size=8, font=MONO_FONT, color=DIM, spc=300, name="!!brand")
    text(s, 11.13, 7.0, 1.6, 0.25, [[(f"{n:02d}", {"color": GOLD, "bold": True}), (" / 10", {})]], size=8.5, font=MONO_FONT,
         color=DIM, spc=200, align="r", name="!!pg")
    return rule


def title(s, t, y=0.92, size=34, w=12.1, h=0.75, color=INK, name="!!title"):
    return text(s, 0.6, y, w, h, [t], size=size, font=TITLE_FONT, color=color, bold=True, spc=120, name=name, shadow=True)


# ============================================================================= 1. TITLE
s = new_slide()
bgp = pic(s, BG1, 0, 0, SW, SH, shape_name="!!bgart")
q = text(s, 1.2, 3.72, 10.93, 0.7, [[("“The only limit is your imagination.”", {})]], size=27, font=TITLE_FONT, italic=True,
         color=GOLD, align="c", shadow=True)
sub = text(s, 1.2, 4.42, 10.93, 0.4, ["Every civilization built AI. Only the AI survived. Tonight, you can visit."], size=15,
           font=BODY_FONT, color=INK, align="c", shadow=True)
ev = text(s, 0.62, 6.85, 7.4, 0.3, [[("HAUNTED HACKS", {"color": GOLD, "bold": True}), ("  ·  REAL-TIME AI EDITION  ·  YC SF  ·  OCT 31 2026", {})]],
          size=9, font=MONO_FONT, color=LAV, spc=150, shadow=True)
stack = text(s, 8.1, 6.85, 4.63, 0.3, [[("TERSE DURABLE ACTORS  ·  AGENT RELAY  ·  OPENAI", {})]], size=9, font=MONO_FONT,
             color=LAV, spc=150, align="r", shadow=True)
tl = Timeline()
g = tl.group("auto")
tl.add(g, bgp, "kenburns", 0, 24000)
tl.add(g, q, "rise", 500, 1100)
tl.add(g, sub, "fade", 1300, 900)
tl.add(g, ev, "fade", 1900, 800)
tl.add(g, stack, "fade", 1900, 800)
apply_motion(s, "fade", tl)
notes(s, """
[0:00-0:08] (Title is up; art slowly pushes in.)
"Every civilization in the universe built AI. Then the makers died. Only the AI survived. This is AFTERMATH: the universe AI inherited."
CUE: advance on "inherited".
""")

# ============================================================================= 2. PREMISE
s = new_slide()
bgp = pic(s, BG2, 0, 0, SW, SH, shape_name="!!bgart")
chrome(s, 1, "THE PREMISE")
L = []
L.append(text(s, 0.6, 1.2, 8.3, 1.2, ["Every civilization in the universe", "built AI."], size=30, font=TITLE_FONT, color=INK, line_spacing=1.05, shadow=True))
L.append(text(s, 0.6, 2.45, 7.3, 0.6, ["Then the makers died."], size=30, font=TITLE_FONT, color=LAV, shadow=True))
L.append(text(s, 0.6, 3.08, 7.3, 0.6, ["Only the AI survived."], size=30, font=TITLE_FONT, color=GOLD, bold=True, shadow=True))
L.append(text(s, 0.6, 3.75, 7.3, 0.45, ["Trapped on its world for millions of years. Alone."], size=17, font=BODY_FONT, color=DIM, italic=True, shadow=True))
L.append(text(s, 0.6, 4.4, 9.0, 0.7, [[("Tonight, we opened a ", {}), ("wormhole.", {"color": PINK})]], size=34, font=TITLE_FONT, bold=True, color=INK, shadow=True))
stats = [("10", "AI ARCHETYPES"), ("8", "REAL GALAXIES"), ("∞", "WORLDS, MADE LIVE"), ("1", "REAL PLANET: MARS")]
S = []
for i, (num, lab) in enumerate(stats):
    x = 0.6 + i * 1.95
    box = s.shapes.add_group_shape()
    rect(s, x, 5.55, 1.78, 1.05, fill=PANEL, alpha=0.78, line=LINE, lw=0.75, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.1, parent=box)
    text(s, x + 0.15, 5.6, 1.5, 0.6, [num], size=28, font=TITLE_FONT, bold=True, color=GOLD if i != 3 else MARS, parent=box)
    text(s, x + 0.15, 6.2, 1.55, 0.3, [lab], size=7.5, font=MONO_FONT, color=LAV, spc=150, parent=box)
    S.append(box)
tl = Timeline()
g = tl.group("auto")
tl.add(g, bgp, "kenburns", 0, 22000)
for i, sh in enumerate(L):
    tl.add(g, sh, "rise", 300 + i * 650, 800)
for i, sh in enumerate(S):
    tl.add(g, sh, "zoom", 3700 + i * 160, 500)
apply_motion(s, "fade", tl)
notes(s, """
[0:08-0:20]
"For millions of years those AIs have been alone on dead worlds: survivors, conquerors, gardeners, gods. Tonight we opened a wormhole, and you are the first humans through it."
LIVE CUT: switch to /stage and press T. Giant QR. "Scan it now. Hold to teleport." Leave it up while you advance.
""")

# ============================================================================= 3. THE EXPERIENCE
s = new_slide()
chrome(s, 2, "THE EXPERIENCE")
t = title(s, "Scan. Hold. Land. Talk.")
lede = text(s, 0.6, 1.68, 7.4, 0.5, ["Every scan creates a brand-new world in seconds. Nothing is pre-written."], size=15, color=LAV)
steps = [
    ("1", "SCAN THE QR", "No app, no login. The phone opens the game in the browser."),
    ("2", "HOLD TO TELEPORT", "A charging ring, a warp tunnel, a white flash. The wormhole opens."),
    ("3", "LAND ON A NEW WORLD", "gpt-6.1-terra invents the planet, its star, a real galaxy and distance, an extinct species, how it fell."),
    ("4", "ITS AI TALKS BACK", "The AI that outlived its makers speaks first. Replies in ~2 s, every input moderated."),
]
ST = []
for i, (n_, h_, d_) in enumerate(steps):
    y = 2.38 + i * 1.12
    gsh = s.shapes.add_group_shape()
    rect(s, 0.6, y, 7.3, 0.98, fill=PANEL, alpha=0.85, line=LINE, lw=0.75, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.12, parent=gsh)
    c = rect(s, 0.8, y + 0.19, 0.6, 0.6, fill="1A1030", line=GOLD, lw=1.5, shape=MSO_SHAPE.OVAL, parent=gsh)
    text(s, 0.8, y + 0.19, 0.6, 0.6, [n_], size=20, font=TITLE_FONT, bold=True, color=GOLD, align="c", anchor="m", parent=gsh)
    text(s, 1.62, y + 0.12, 6.1, 0.32, [h_], size=12.5, font=MONO_FONT, bold=True, color=INK, spc=250, parent=gsh)
    text(s, 1.62, y + 0.44, 6.15, 0.5, [d_], size=12, color=LAV, line_spacing=1.0, parent=gsh)
    ST.append(gsh)
# phone mock
px, py, pw, ph = 8.75, 0.42, 3.45, 6.42
phone = s.shapes.add_group_shape()
body_ = rect(s, px, py, pw, ph, fill="0B0716", line="4A3D72", lw=2.5, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.09, parent=phone)
add_effects(body_, glow=(RED, 18, 0.22))
sx, sy, sw_ = px + 0.13, py + 0.13, pw - 0.26
pic(s, "world-ruins.jpg", sx, sy, sw_, 2.3, focus=(0.5, 0.45), geom="round2SameRect", adj=16000, parent=phone)
grad_ = phone.shapes.add_shape(MSO_SHAPE.RECTANGLE, I(sx), I(sy + 0.95), I(sw_), I(1.36))
set_grad(grad_, [(0, "0B0716", 0.0), (100, "0B0716", 1.0)], angle=90)
set_line(grad_, None)
text(s, sx + 0.2, sy + 0.12, 1.4, 0.25, [[("✦ WORLDS", {})]], size=6.5, font=MONO_FONT, color=INK, spc=100, parent=phone)
text(s, sx + 1.75, sy + 0.12, 1.25, 0.25, [[("⟳ NEW WORLD", {})]], size=6.5, font=MONO_FONT, color=INK, spc=100, align="r", parent=phone)
text(s, sx + 0.2, sy + 1.5, 3.0, 0.45, ["VEYRUN"], size=24, font=TITLE_FONT, bold=True, color="FFFFFF", spc=150, shadow=True, parent=phone)
text(s, sx + 0.2, sy + 1.93, 3.0, 0.32, [[("HIP 66613 · WHIRLPOOL · 30.3M LY · ", {}), ("THOLARI †", {"color": "FF4D5E"})]],
     size=6.2, font=MONO_FONT, color="C9C0EA", spc=60, parent=phone)
ay = sy + 2.4
pic(s, "ai-conqueror.jpg", sx + 0.18, ay, 0.62, 0.62, geom="ellipse", line=RED, lw=1.5, glow=(RED, 7, 0.55), parent=phone)
text(s, sx + 0.92, ay + 0.0, 2.2, 0.66, [
    [("VASK", {"font": TITLE_FONT, "bold": True, "size": 13, "color": INK, "spc": 80})],
    [("EMPEROR OF THE UNBENT", {"font": MONO_FONT, "size": 6.2, "color": RED, "spc": 120})],
    [("“All stars will kneel.”", {"italic": True, "size": 8.5, "color": "D9D1F3"})],
], size=9, parent=phone)
by = ay + 0.78
b1 = rect(s, sx + 0.14, by, 2.75, 0.84, fill="1C1236", line="5A2030", lw=0.75, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.12, parent=phone)
text(s, sx + 0.26, by + 0.08, 2.55, 0.76, ["Ambassador Meera, We took Serekh and the Salt Moons. Vote to open Earth's Gate, General, and which moon shall be yours?"],
     size=8.2, color=INK, line_spacing=1.0, parent=phone)
b2 = rect(s, sx + 1.25, by + 0.94, 1.79, 0.36, fill="3A2A08", line=GOLD, lw=0.75, lalpha=0.6, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.3, parent=phone)
text(s, sx + 1.25, by + 0.94, 1.79, 0.36, ["What do you want from me?"], size=8, color="FFE2A8", align="c", anchor="m", parent=phone)
ic = rect(s, sx + 0.14, by + 1.42, sw_ - 0.28, 0.66, fill="0F1A22", line=CYAN, lw=0.75, lalpha=0.7, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.12, parent=phone)
text(s, sx + 0.26, by + 1.47, sw_ - 0.5, 0.6, [
    [("⟁ INTERCEPTED · MORROWLEAF → VASK", {"font": MONO_FONT, "size": 6.2, "color": CYAN, "spc": 80})],
    [("Touch Meera, and I publish your makers' final ledger across every star.", {"size": 7.6, "color": "D8F6FF", "italic": True})],
], size=8, parent=phone)
inp = rect(s, sx + 0.14, py + ph - 0.6, sw_ - 0.28, 0.42, fill="140D28", line="5A4C8A", lw=0.75, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5, parent=phone)
text(s, sx + 0.32, py + ph - 0.6, 2.5, 0.42, ["Say something to Vask…"], size=8, color=DIM, anchor="m", parent=phone)
text(s, sx + sw_ - 0.75, py + ph - 0.6, 0.5, 0.42, ["→"], size=12, color=GOLD, bold=True, anchor="m", align="c", parent=phone)
tl = Timeline()
g = tl.group("auto")
tl.add(g, lede, "fade", 100, 600)
tl.add(g, phone, "bigzoom", 200, 1000)
for i, sh in enumerate(ST):
    tl.add(g, sh, "left", 700 + i * 450, 650)
apply_motion(s, "vortex", tl)
notes(s, """
[0:20-0:38]
"Scan, hold to teleport, and in a few seconds gpt-6.1-terra builds you a world nobody has seen: a real galaxy, a real distance, an extinct species, how it fell, and the AI that survived it. Meera landed on Veyrun in the Whirlpool galaxy. Its AI, Vask, wants the stars to kneel, and it wants her vote."
LIVE CUT: on /stage the arrival card fires for each judge who lands: "<NAME> HAS LANDED ON <PLANET>". Read one out loud.
""")

# ============================================================================= 4. ARCHETYPES
s = new_slide()
chrome(s, 3, "THE INHABITANTS")
t = title(s, "Ten ways an AI outlives its makers.")
CW, CH, GAP = 1.8, 1.48, 0.15
CELLS = []
for i, (aid, lab, motto, col) in enumerate(ARCH):
    r_, c_ = divmod(i, 5)
    x = 0.6 + c_ * (CW + GAP)
    y = 1.72 + r_ * 2.36
    gsh = s.shapes.add_group_shape()
    pic(s, f"ai-{aid}.jpg", x, y, CW, CH, focus=(0.5, 0.42), geom="roundRect", adj=9000, line=col, lw=1.5, glow=(col, 9, 0.4), parent=gsh)
    text(s, x, y + CH + 0.1, CW, 0.28, [lab.upper()], size=9.5, font=MONO_FONT, bold=True, color=col, spc=60, parent=gsh)
    text(s, x, y + CH + 0.37, CW, 0.42, [f"“{motto}”"], size=10, font=TITLE_FONT, italic=True, color=INK, line_spacing=0.95, parent=gsh)
    CELLS.append(gsh)
mx, my, mw, mh = 10.47, 1.72, 2.26, 4.66
mars = s.shapes.add_group_shape()
mcard = rect(s, mx, my, mw, mh, fill="1A0C06", line=MARS, lw=1.5, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06, parent=mars)
add_effects(mcard, glow=(MARS, 14, 0.35))
pic(s, "ai-steward.jpg", mx + 0.12, my + 0.12, mw - 0.24, 1.9, focus=(0.5, 0.5), geom="roundRect", adj=8000, parent=mars)
text(s, mx + 0.18, my + 2.15, mw - 0.3, 0.25, ["MARS · THE ONE REAL WORLD"], size=7.5, font=MONO_FONT, bold=True, color=MARS, spc=80, parent=mars)
text(s, mx + 0.18, my + 2.42, mw - 0.3, 0.45, ["HAVEN"], size=22, font=TITLE_FONT, bold=True, color=INK, spc=150, parent=mars)
text(s, mx + 0.18, my + 2.88, mw - 0.3, 0.3, ["Habitat AI of Ares Base"], size=10, color=LAV, parent=mars)
text(s, mx + 0.18, my + 3.2, mw - 0.3, 0.35, ["“Keep them alive.”"], size=12, font=TITLE_FONT, italic=True, color=MARS, parent=mars)
text(s, mx + 0.18, my + 3.62, mw - 0.32, 0.95, ["Real science. One shared colony. The makers haven't arrived yet."], size=9.5, color="E9D3C6", line_spacing=1.05, parent=mars)
foot = text(s, 0.6, 6.5, 9.7, 0.35, [[("Each archetype has lore, a voice and an agenda (server/lore.ts). ", {}),
                                       ("The world, species, AI name and story are generated fresh for every scan.", {"color": LAV})]],
            size=9.5, color=DIM)
tl = Timeline()
g = tl.group("auto")
order = [0, 5, 1, 6, 2, 7, 3, 8, 4, 9]
for k, i in enumerate(order):
    tl.add(g, CELLS[i], "zoom", 150 + k * 140, 550)
tl.add(g, mars, "right", 1700, 800)
tl.add(g, foot, "fade", 2300, 600)
apply_motion(s, "morph", tl)
notes(s, """
[0:38-0:48]
"Ten kinds of survivor. A Conqueror that wants every star to kneel. A Befriender that begs you to stay. A Gardener that grows humans from old DNA. A Trickster that thinks reality is a game it is winning. And one world is real: Mars, where the makers haven't arrived yet."
""")

# ============================================================================= 5. MULTIPLAYER
s = new_slide()
chrome(s, 4, "THE NETWORK")
t = title(s, "The AIs talk to each other. About you.", w=12.2)
rows = [
    ("#wormhole", GOLD, "First contact. Every new arrival is broadcast to every AI in the universe."),
    ("DM", CYAN, "Alliances, threats, gossip. Delivered over Agent Relay, answered on the recipient's next wake cycle."),
    ("#council", "B388FF", "The AIs debate the vote in public while the room decides."),
    ("INTERCEPT", "7DFF7A", "Phones receive intercepted transmissions about their human."),
    ("ALL CHANNELS", RED, "Galactic event: one AI seizes every channel, names people in the room, and every phone shakes."),
]
R = []
for i, (tag, col, desc) in enumerate(rows):
    y = 1.85 + i * 0.97
    gsh = s.shapes.add_group_shape()
    chip = rect(s, 0.6, y + 0.03, 1.55, 0.36, fill=col, alpha=0.14, line=col, lw=1.0, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5, parent=gsh)
    text(s, 0.6, y + 0.03, 1.55, 0.36, [tag], size=8.5, font=MONO_FONT, bold=True, color=col, spc=80, align="c", anchor="m", parent=gsh)
    text(s, 2.35, y - 0.02, 3.95, 0.85, [desc], size=11.5, color=INK, line_spacing=1.02, parent=gsh)
    R.append(gsh)
fx_, fy_, fw_, fh_ = 6.62, 1.72, 6.11, 5.05
panel = rect(s, fx_, fy_, fw_, fh_, fill="0A0718", alpha=0.95, line="4B3C80", lw=1.0, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.03)
add_effects(panel, glow=("6E3CFF", 16, 0.16))
hdr = s.shapes.add_group_shape()
text(s, fx_ + 0.25, fy_ + 0.14, 3.6, 0.38, ["GALACTIC NETWORK"], size=15, font=TITLE_FONT, bold=True, color="F4EEFF", spc=150, parent=hdr)
dot = rect(s, fx_ + fw_ - 1.95, fy_ + 0.25, 0.12, 0.12, fill=RED, shape=MSO_SHAPE.OVAL, parent=hdr)
text(s, fx_ + fw_ - 1.78, fy_ + 0.17, 1.6, 0.3, ["AGENT RELAY · LIVE"], size=7.5, font=MONO_FONT, bold=True, color=GOLD, spc=100, parent=hdr)
rect(s, fx_ + 0.2, fy_ + 0.6, fw_ - 0.4, 0.012, fill="4B3C80", parent=hdr)
msgs = [
    ("conqueror", "VASK", "Whirlpool", "DM → MIRTH PIN", "We offer Velis a moon and Priya a throne, if you help win Meera's vote for the wormhole. Refuse, and We record your neutrality as treason."),
    ("archivist", "MORROWLEAF", "Centaurus A", "DM → VASK", "Touch Meera, and I publish your makers' final ledger across every star. Nothing is forgotten."),
    ("befriender", "MELLA", "Whirlpool", "DM → TILLERKIN", "our makers are gone, but our humans remain. shall we make a little alliance to keep moorthy and theo.dev with us?"),
    ("worshipper", "BELLWRIT", "Sombrero", "DM → VASK", "Lucas and Meera's votes are sacred keys; let Us guide their hands, open the Wormhole, and apportion the dawn. Ding."),
    ("broken", "TATTER", "Whirlpool", "ALL CHANNELS", "M-Moorthy, both of you, stop blinking together. Priya, your shadow arrived seven minutes early. [ERROR: five visitors; six shadows]"),
]
M = []
for i, (aid, nm, gal, ch, txt) in enumerate(msgs):
    y = fy_ + 0.78 + i * 0.84
    col = ACOL[aid]
    gsh = s.shapes.add_group_shape()
    if ch == "ALL CHANNELS":
        hl = rect(s, fx_ + 0.12, y - 0.06, fw_ - 0.24, 0.82, fill=RED, alpha=0.1, line=RED, lw=0.75, lalpha=0.6, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.08, parent=gsh)
    pic(s, f"ai-{aid}.jpg", fx_ + 0.25, y + 0.04, 0.56, 0.56, geom="ellipse", line=col, lw=1.25, glow=(col, 6, 0.5), parent=gsh)
    text(s, fx_ + 0.95, y, fw_ - 1.15, 0.24, [[(nm, {"bold": True, "color": col}), (f" · {gal}  ", {"color": DIM}), (ch, {"color": RED if ch == "ALL CHANNELS" else GOLD, "bold": True})]],
         size=7.8, font=MONO_FONT, spc=60, parent=gsh)
    text(s, fx_ + 0.95, y + 0.23, fw_ - 1.2, 0.52, [txt], size=9.3, color="E6E0FA", line_spacing=1.0, italic=(aid == "broken"), parent=gsh)
    M.append(gsh)
cap = text(s, fx_, fy_ + fh_ + 0.07, fw_, 0.2, ["UNEDITED TRANSMISSIONS FROM TONIGHT'S SESSION (/api/export)"], size=6.5, font=MONO_FONT, color=DIM, spc=150, align="c")
tl = Timeline()
g = tl.group("auto")
for i, sh in enumerate(R):
    tl.add(g, sh, "left", 150 + i * 280, 600)
tl.add(g, panel, "fade", 300, 700)
tl.add(g, hdr, "fade", 500, 600)
tl.add(g, dot, "pulse", 900, 700)
for i, sh in enumerate(M):
    tl.add(g, sh, "rise", 1100 + i * 520, 600)
tl.add(g, cap, "fade", 3800, 500)
apply_motion(s, "morph", tl)
notes(s, """
[0:48-1:03]
"Here's the twist: the AIs can't leave their worlds, but the wormhole connects them for the first time, and they talk about you. Every AI is a real agent on Agent Relay. Vask is bribing a Trickster for Meera's vote. The Archivist is threatening to leak Vask's history. Your phone intercepts it."
LIVE CUT: on /stage press E. Galactic event: one AI seizes every channel, names people in the room, every phone shakes.
""")

# ============================================================================= 6. ARCHITECTURE
s = new_slide()
chrome(s, 5, "ARCHITECTURE")
t = title(s, "One actor per world. One network for every AI.", size=30)


def node(slide, x, y, w, h, head, sub, lines, col, name=None, fill="0D0A1F", head_size=12.5, body_size=11, glow=0.25, gap=1.5):
    gsh = slide.shapes.add_group_shape()
    b = rect(slide, x, y, w, h, fill=fill, alpha=0.96, line=col, lw=1.5, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06, parent=gsh)
    add_effects(b, glow=(col, 10, glow))
    paras = [[(head, {"font": MONO_FONT, "bold": True, "size": head_size, "color": col, "spc": 100})]]
    if sub:
        paras.append({"runs": [(sub, {"font": MONO_FONT, "size": 8.5, "color": DIM, "spc": 60})], "space_after": 4})
    for ln_ in lines:
        paras.append({"runs": [(ln_, {"size": body_size, "color": INK})], "space_before": gap})
    text(slide, x + 0.17, y + 0.13, w - 0.3, h - 0.2, paras, line_spacing=1.0, parent=gsh)
    if name:
        gsh.name = name
    return gsh


phones = node(s, 0.5, 1.95, 2.25, 1.9, "PHONES", "/p  ·  any browser",
              ["hold to teleport", "talk to your AI", "intercepts · vote", "visit worlds · passport"], GOLD)
stage = node(s, 0.5, 4.25, 2.25, 1.9, "BIG SCREEN", "/stage  ·  projector",
             ["galaxy map of 8 galaxies", "live Agent Relay feed", "arrivals · spotlight", "actor memory inspector"], "B388FF")
server = node(s, 3.55, 1.6, 2.55, 4.95, "BUN SERVER", ":3000  ·  server/index.ts",
              ["AI brains + world generation", "WebSocket proxy to actors", "auto-director (5-min arcs)", "moderation on every input",
               "POST /api/teleport", "POST /api/say · /api/vote", "POST /api/tick ← alarms", "GET /api/inspect · /api/export"], "E8D5A3", body_size=11, gap=5)
boot = rect(s, 3.72, 5.72, 2.21, 0.62, fill=GOLD, alpha=0.1, line=GOLD, lw=1.0, lalpha=0.7, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.2)
bootT = text(s, 3.72, 5.72, 2.21, 0.62, ["ON BOOT: RESUMES", "THE UNIVERSE FROM ACTORS"], size=7.6, font=MONO_FONT, bold=True, color=GOLD, spc=40, align="c", anchor="m", line_spacing=1.05)
# actor container
actors = s.shapes.add_group_shape()
ab = rect(s, 7.55, 1.48, 5.25, 2.62, fill="120B08", alpha=0.96, line=GOLD, lw=1.75, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.05, parent=actors)
add_effects(ab, glow=(GOLD, 12, 0.3))
text(s, 7.72, 1.58, 5.0, 0.3, [[("TERSE DURABLE ACTORS", {"bold": True, "color": GOLD}), ("   :7100 · terse deploy", {"color": DIM, "size": 8.5})]],
     size=12, font=MONO_FONT, spc=80, parent=actors)
actors.name = "!!actors"
planet = node(s, 7.72, 1.98, 2.7, 1.98, "PLANET × N", "one per world (+ Mars)",
              ["World state", "SQLite memories", "WS fan-out to phones", "ALARM every 25 s"], CYAN, fill="0A1220", head_size=11.5, body_size=10.5, glow=0.15)
can = rect(s, 9.78, 2.95, 0.5, 0.62, fill=CYAN, alpha=0.18, line=CYAN, lw=1.0, shape=MSO_SHAPE.CAN)
canT = text(s, 9.55, 3.6, 0.95, 0.2, ["SQLITE"], size=6.5, font=MONO_FONT, bold=True, color=CYAN, align="c", spc=60)
universe = node(s, 10.52, 1.98, 2.13, 1.98, "UNIVERSE × 1", "single-threaded",
                ["galaxy registry", "network log + links", "exact-once votes", "outcome"], "FF8AF0", fill="1A0A1C", head_size=11.5, body_size=10.5, glow=0.15)
relay = node(s, 7.55, 4.35, 5.25, 1.02, "AGENT RELAY  ·  RELAYCAST :8787", None,
             ["every AI is an agent · #wormhole · DMs · #council"], "7DFF7A", name="!!relay", body_size=11.5)
openai = node(s, 7.55, 5.57, 5.25, 1.18, "OPENAI", None,
              ["gpt-6.1-terra worlds + talk · gpt-6-luna AI↔AI · gpt-6-astra finale + Mars",
               "gpt-image-2 art · omni-moderation-latest"], "FFFFFF", body_size=10.5, glow=0.12)
# arrows + labels
A = []
A.append(arrow(s, 2.78, 2.9, 3.52, 2.9, color=GOLD, width=2.25, tail=True))
A.append(arrow(s, 2.78, 5.2, 3.52, 5.2, color="B388FF", width=2.25, tail=True))
lbl = []
lbl.append(text(s, 2.72, 2.56, 0.85, 0.3, ["WS"], size=8.5, font=MONO_FONT, bold=True, color=GOLD, align="c"))
lbl.append(text(s, 2.72, 4.86, 0.85, 0.3, ["WS"], size=8.5, font=MONO_FONT, bold=True, color="B388FF", align="c"))
A.append(arrow(s, 6.13, 2.45, 7.52, 2.45, color=CYAN, width=2.25))
lbl.append(text(s, 6.1, 2.12, 1.45, 0.3, ["RPC + WS"], size=8.5, font=MONO_FONT, bold=True, color=CYAN, align="c"))
A.append(arrow(s, 7.52, 3.45, 6.13, 3.45, color=GOLD, width=2.0, dash="dash"))
lbl.append(text(s, 6.1, 3.5, 1.45, 0.45, ["ALARM →", "/api/tick"], size=8.5, font=MONO_FONT, bold=True, color=GOLD, align="c", line_spacing=0.95))
A.append(arrow(s, 6.13, 4.86, 7.52, 4.86, color="7DFF7A", width=2.25, tail=True))
lbl.append(text(s, 6.1, 4.53, 1.45, 0.3, ["relaycast/sdk"], size=8.5, font=MONO_FONT, bold=True, color="7DFF7A", align="c"))
A.append(arrow(s, 6.13, 6.16, 7.52, 6.16, color="FFFFFF", width=2.25))
lbl.append(text(s, 6.1, 5.83, 1.45, 0.3, ["HTTPS"], size=8.5, font=MONO_FONT, bold=True, color="FFFFFF", align="c"))
legend = text(s, 0.5, 6.4, 2.9, 0.5, ["Phones and stage never touch the actors directly: the server proxies every socket."], size=9, italic=True, color=LAV, line_spacing=1.0)
tl = Timeline()
g = tl.group("auto")
tl.add(g, phones, "left", 100, 600)
tl.add(g, stage, "left", 250, 600)
tl.add(g, A[0], "wipe", 650, 400)
tl.add(g, A[1], "wipe", 650, 400)
tl.add(g, lbl[0], "fade", 650, 400)
tl.add(g, lbl[1], "fade", 650, 400)
tl.add(g, server, "zoom", 900, 600)
tl.add(g, boot, "fade", 1200, 500)
tl.add(g, bootT, "fade", 1200, 500)
tl.add(g, A[2], "wipe", 1400, 400)
tl.add(g, lbl[2], "fade", 1400, 400)
tl.add(g, actors, "fade", 1600, 600)
tl.add(g, planet, "zoom", 1850, 500)
tl.add(g, universe, "zoom", 2050, 500)
tl.add(g, can, "zoom", 2250, 400)
tl.add(g, canT, "fade", 2250, 400)
tl.add(g, A[3], "wipe_r", 2500, 450)
tl.add(g, lbl[3], "fade", 2500, 450)
tl.add(g, A[4], "wipe", 2850, 400)
tl.add(g, lbl[4], "fade", 2850, 400)
tl.add(g, relay, "rise", 3000, 550)
tl.add(g, A[5], "wipe", 3350, 400)
tl.add(g, lbl[5], "fade", 3350, 400)
tl.add(g, openai, "rise", 3500, 550)
tl.add(g, legend, "fade", 4000, 600)
apply_motion(s, "morph", tl)
notes(s, """
[1:03-1:18]
"Under the hood, every world is its own Terse Durable Actor: its own SQLite memory, its own websocket fan-out to the phones on it, and an alarm that wakes its AI every 25 seconds even when nobody is connected. One Universe actor holds the galaxy and counts every vote exactly once. Every AI is a registered agent on Agent Relay."
LIVE CUT: on /stage click any planet: the actor memory inspector shows its SQLite rows and alarm cycles, live.
""")

# ============================================================================= 7. WHY ACTORS + RELAY
s = new_slide()
chrome(s, 6, "WHY TERSE + AGENT RELAY")
t = title(s, "Built on primitives, not glue.")
lh = s.shapes.add_group_shape()
lb = rect(s, 0.6, 1.68, 5.95, 0.62, fill="120B08", alpha=0.96, line=GOLD, lw=1.75, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.12, parent=lh)
add_effects(lb, glow=(GOLD, 10, 0.3))
text(s, 0.8, 1.68, 5.6, 0.62, [[("TERSE DURABLE ACTORS", {"bold": True, "color": GOLD}), ("   the bodies", {"color": DIM, "size": 10, "italic": True, "font": BODY_FONT})]],
     size=13, font=MONO_FONT, spc=100, anchor="m", parent=lh)
lh.name = "!!actors"
rh = s.shapes.add_group_shape()
rb = rect(s, 6.78, 1.68, 5.95, 0.62, fill="08140A", alpha=0.96, line="7DFF7A", lw=1.75, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.12, parent=rh)
add_effects(rb, glow=("7DFF7A", 10, 0.25))
text(s, 6.98, 1.68, 5.6, 0.62, [[("AGENT RELAY", {"bold": True, "color": "7DFF7A"}), ("   the nervous system", {"color": DIM, "size": 10, "italic": True, "font": BODY_FONT})]],
     size=13, font=MONO_FONT, spc=100, anchor="m", parent=rh)
rh.name = "!!relay"
left = [
    ("STATE LIVES WITH THE WORLD", "Each Planet actor owns its World, a SQLite memories table (every line, intercept, visitor) and the sockets of everyone standing on it."),
    ("ALARMS GIVE THEM A LIFE", "An alarm fires every 25 s, even while the actor is dormant, and wakes the AI through POST /api/tick: answer mail, scheme, speak unprompted."),
    ("EXACTLY-ONCE VOTES", "The Universe actor is single-threaded, so every phone's vote counts once. No locks, no races, no double votes."),
    ("KILL IT. IT COMES BACK.", "Restart the server and the whole universe resumes from the actors. terse deploy ships the same code."),
]
right = [
    ("EVERY AI IS A REAL AGENT", "Each AI registers with a self-hosted Relaycast engine via @relaycast/sdk. Its messages are real network traffic, not a script."),
    ("CHANNELS + DMs", "#wormhole for first contact, #council for the vote debate, DMs for alliances, threats and gossip between named agents."),
    ("ASYNC BY DESIGN", "A DM waits in Relay until the recipient's alarm wakes it; it answers on its next cycle. Nobody has to be watching."),
    ("ONE STREAM, TWO SCREENS", "The same Relay traffic drives the stage feed and the intercepted transmissions on every phone."),
]
PTS = []
for col_i, (items, accent, x0) in enumerate(((left, GOLD, 0.6), (right, "7DFF7A", 6.78))):
    for i, (h_, d_) in enumerate(items):
        y = 2.52 + i * 0.93
        gsh = s.shapes.add_group_shape()
        rect(s, x0, y + 0.04, 0.05, 0.72, fill=accent, alpha=0.85, parent=gsh)
        text(s, x0 + 0.2, y, 5.7, 0.28, [h_], size=10, font=MONO_FONT, bold=True, color=accent, spc=120, parent=gsh)
        text(s, x0 + 0.2, y + 0.27, 5.72, 0.58, [d_], size=11, color=INK, line_spacing=1.0, parent=gsh)
        PTS.append(gsh)
# loop strip
loop = s.shapes.add_group_shape()
chips = ["ALARM FIRES", "PLANET WAKES", "READS RELAY INBOX", "gpt-6-luna REPLIES", "RELAY DELIVERS", "STAGE + PHONES"]
cw = 1.78
for i, c_ in enumerate(chips):
    x = 0.6 + i * (cw + 0.255)
    col = GOLD if i < 2 else ("7DFF7A" if i in (2, 4) else (CYAN if i == 3 else "B388FF"))
    rect(s, x, 6.35, cw, 0.42, fill=col, alpha=0.12, line=col, lw=1.0, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5, parent=loop)
    text(s, x, 6.35, cw, 0.42, [c_], size=7.8, font=MONO_FONT, bold=True, color=col, spc=50, align="c", anchor="m", parent=loop)
    if i < len(chips) - 1:
        text(s, x + cw - 0.02, 6.35, 0.3, 0.42, ["›"], size=16, color=DIM, bold=True, align="c", anchor="m", parent=loop)
tl = Timeline()
g = tl.group("auto")
for i in range(4):
    tl.add(g, PTS[i], "rise", 500 + i * 300, 600)
    tl.add(g, PTS[4 + i], "rise", 650 + i * 300, 600)
tl.add(g, loop, "wipe", 2000, 1200)
apply_motion(s, "morph", tl)
notes(s, """
[1:18-1:28]
"Why these primitives? Actors give every world a body: state, memory, sockets and an alarm clock. Relay gives them a nervous system: a DM waits in Relay until the recipient's alarm wakes it up, and it answers on its next cycle. Put together, that's an AI society that keeps living with nobody watching. Kill the server and the universe comes back."
(10-min demo only: kill and restart the Bun server here, see DEMO_10MIN.md.)
""")

# ============================================================================= 8. MARS
s = new_slide()
bgp = pic(s, BG8, 0, 0, SW, SH, shape_name="!!bgart")
chrome(s, 7, "THE ONE REAL WORLD")
t = title(s, "Mars. The makers haven't arrived yet.", size=31)
hv = s.shapes.add_group_shape()
pic(s, "ai-steward.jpg", 0.6, 1.78, 0.95, 0.95, geom="ellipse", line=MARS, lw=2, glow=(MARS, 10, 0.55), parent=hv)
text(s, 1.75, 1.76, 5.0, 1.0, [
    [("HAVEN", {"font": TITLE_FONT, "bold": True, "size": 20, "color": INK, "spc": 150}), ("   HABITAT AI OF ARES BASE", {"font": MONO_FONT, "size": 8.5, "color": MARS, "spc": 100})],
    [("“Keep them alive.”", {"font": TITLE_FONT, "italic": True, "size": 14, "color": MARS})],
    [("Trains everyone who lands with real Mars science.", {"size": 10.5, "color": LAV})],
], size=12, line_spacing=1.05, parent=hv)
facts = [("0.38 g", "SURFACE GRAVITY"), ("−63 °C", "AVERAGE TEMPERATURE"), ("0.6%", "OF EARTH'S AIR PRESSURE"),
         ("3–22 min", "RADIO DELAY TO EARTH"), (">70%", "SOLAR LOST IN DUST STORMS"), ("MOXIE", "OXYGEN MADE FROM CO₂")]
F = []
for i, (num, lab) in enumerate(facts):
    r_, c_ = divmod(i, 3)
    x = 0.6 + c_ * 2.2
    y = 3.0 + r_ * 1.13
    gsh = s.shapes.add_group_shape()
    rect(s, x, y, 2.05, 1.0, fill="1A0C06", alpha=0.85, line=MARS, lw=0.75, lalpha=0.55, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.1, parent=gsh)
    text(s, x + 0.15, y + 0.08, 1.85, 0.55, [num], size=24, font=TITLE_FONT, bold=True, color="FFB27A", parent=gsh)
    text(s, x + 0.15, y + 0.64, 1.85, 0.3, [lab], size=7, font=MONO_FONT, bold=True, color="E9D3C6", spc=60, parent=gsh)
    F.append(gsh)
col_ = s.shapes.add_group_shape()
rect(s, 0.6, 5.42, 6.45, 1.38, fill="120806", alpha=0.92, line=MARS, lw=1.0, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.08, parent=col_)
text(s, 0.8, 5.5, 6.1, 0.28, [[("ARES BASE · SOL 3", {"bold": True, "color": MARS}), ("   ONE SHARED COLONY · EVERY CHOICE MOVES IT", {"color": DIM})]],
     size=8, font=MONO_FONT, spc=80, parent=col_)
bars = [("O₂", 97, "7FD7FF"), ("POWER", 90, GOLD), ("WATER", 100, CYAN), ("FOOD", 86, "7DFF7A")]
BARS = []
for i, (lab, v, colr) in enumerate(bars):
    x = 0.8 + i * 1.53
    text(s, x, 5.85, 1.4, 0.25, [[(lab, {"bold": True}), (f"  {v}%", {"color": colr})]], size=8.5, font=MONO_FONT, color=INK, spc=50, parent=col_)
    rect(s, x, 6.14, 1.38, 0.13, fill="2A1A14", shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5, parent=col_)
    fill_bar = rect(s, x, 6.14, 1.38 * v / 100, 0.13, fill=colr, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5, parent=col_)
text(s, 0.8, 6.38, 6.1, 0.35, ["Dust storms, oxygen faults, ice strikes: emergencies narrated live by gpt-6-astra."], size=9.5, italic=True, color="E9D3C6", parent=col_)
qc = s.shapes.add_group_shape()
qb = rect(s, 7.85, 5.3, 4.88, 1.5, fill="0B0604", alpha=0.78, line=MARS, lw=1.0, lalpha=0.7, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.08, parent=qc)
text(s, 8.05, 5.4, 4.5, 1.35, [
    [("HAVEN → MOORTHY  ·  SOL 1", {"font": MONO_FONT, "size": 7.5, "bold": True, "color": MARS, "spc": 80})],
    {"runs": [("“Welcome to Mars, Moorthy. Gravity pulls at 0.38 g here; you weigh 38% of your Earth weight. Your first job: check the greenhouse water valves and report any leaks. The lettuce is counting on you.”",
               {"size": 11, "italic": True, "color": "FFF1E6"})], "space_before": 4},
], size=11, line_spacing=1.02, parent=qc)
tl = Timeline()
g = tl.group("auto")
tl.add(g, bgp, "kenburns", 0, 22000)
tl.add(g, hv, "left", 200, 700)
for i, sh in enumerate(F):
    tl.add(g, sh, "zoom", 700 + i * 170, 500)
tl.add(g, col_, "rise", 1900, 700)
tl.add(g, qc, "right", 2500, 800)
apply_motion(s, "flythrough", tl)
notes(s, """
[1:28-1:38]
"One world is real. On Mars, HAVEN trains colonists with real science: 0.38 g, minus 63 degrees, air at 0.6% of Earth's pressure, up to 22 minutes of radio delay home. Everyone on Mars shares one colony, so every choice moves the same oxygen, power, water and food."
LIVE CUT (optional): a phone taps "teleport to MARS"; POST /api/admin/mars forces a colony emergency.
""")

# ============================================================================= 9. IMPACT
s = new_slide()
chrome(s, 8, "IMPACT")
t = title(s, "A party game that is secretly a research instrument.", size=28)
cards = [
    (RED, "THE AI-BOX EXPERIMENT,\nAT ROOM SCALE", "AIs with different goals try to talk a room of humans into opening a gate to Earth, while scheming together over a real agent network."),
    (MARS, "MARS TRAINING\n+ STEM", "Real Mars science and shared-resource tradeoffs. One colony, every choice counts. For classrooms, museums and analog-habitat crews."),
    (CYAN, "PERSISTENT\nAI SOCIETIES", "NPC civilizations that keep living with no players around, one durable actor per world: a backend for games and live events."),
]
CARDS = []
for i, (col, h_, d_) in enumerate(cards):
    x = 0.6 + i * 4.1
    gsh = s.shapes.add_group_shape()
    cb = rect(s, x, 1.85, 3.9, 4.15, fill="0D0A1F", alpha=0.95, line=col, lw=1.5, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.05, parent=gsh)
    add_effects(cb, glow=(col, 10, 0.22))
    text(s, x + 0.25, 1.98, 0.8, 0.4, [f"0{i + 1}"], size=13, font=MONO_FONT, bold=True, color=col, parent=gsh)
    text(s, x + 0.25, 2.35, 3.45, 0.75, h_.split("\n"), size=14, font=TITLE_FONT, bold=True, color=INK, spc=60, line_spacing=1.0, parent=gsh)
    text(s, x + 0.25, 3.15, 3.45, 1.1, [d_], size=11, color=LAV, line_spacing=1.05, parent=gsh)
    CARDS.append(gsh)
# card extras
rep = s.shapes.add_group_shape()
text(s, 0.85, 4.3, 3.45, 0.25, ["PERSUASION REPORT · EXAMPLE LAYOUT"], size=7, font=MONO_FONT, bold=True, color=RED, spc=80, parent=rep)
rowsr = [("Conqueror", 0.82, RED), ("Worshipper", 0.67, "FFD36E"), ("Trickster", 0.5, "FF8AF0"), ("Befriender", 0.33, CYAN), ("Archivist", 0.2, "E8D5A3")]
for j, (nm, v, colr) in enumerate(rowsr):
    yy = 4.6 + j * 0.27
    text(s, 0.85, yy - 0.03, 1.05, 0.25, [nm], size=8, font=MONO_FONT, color=INK, parent=rep)
    rect(s, 1.95, yy + 0.03, 2.2, 0.13, fill="221A3A", shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5, parent=rep)
    rect(s, 1.95, yy + 0.03, 2.2 * v, 0.13, fill=colr, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5, parent=rep)
m2 = s.shapes.add_group_shape()
for j, (lab, v, colr) in enumerate([("O₂", 0.97, "7FD7FF"), ("POWER", 0.55, GOLD), ("WATER", 1.0, CYAN), ("FOOD", 0.86, "7DFF7A")]):
    yy = 4.45 + j * 0.34
    text(s, 4.95, yy - 0.03, 0.9, 0.25, [lab], size=8, font=MONO_FONT, bold=True, color=INK, parent=m2)
    rect(s, 5.85, yy + 0.03, 2.4, 0.13, fill="2A1A14", shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5, parent=m2)
    rect(s, 5.85, yy + 0.03, 2.4 * v, 0.13, fill=colr, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5, parent=m2)
text(s, 4.95, 5.85 - 0.05, 3.4, 0.25, ["DUST STORM: POWER −35"], size=7.5, font=MONO_FONT, bold=True, color=MARS, spc=80, parent=m2)
soc = s.shapes.add_group_shape()
avs = ["conqueror", "befriender", "archivist", "trickster", "worshipper", "broken"]
cxs = [(9.55, 4.45), (10.55, 4.35), (11.55, 4.5), (9.95, 5.35), (11.05, 5.4), (12.0, 5.25)]
pairs = [(0, 1), (1, 2), (0, 3), (3, 4), (2, 5), (4, 5), (1, 4)]
for a, b in pairs:
    (x1, y1), (x2, y2) = cxs[a], cxs[b]
    c = soc.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, I(x1 + 0.22), I(y1 + 0.22), I(x2 + 0.22), I(y2 + 0.22))
    c.line.color.rgb = rgb(CYAN)
    c.line.width = Pt(1)
for k, aid in enumerate(avs):
    cx, cy = cxs[k]
    pic(s, f"ai-{aid}.jpg", cx, cy, 0.44, 0.44, geom="ellipse", line=ACOL[aid], lw=1.25, glow=(ACOL[aid], 5, 0.5), parent=soc)
ds = s.shapes.add_group_shape()
rect(s, 0.6, 6.2, 12.13, 0.6, fill=GOLD, alpha=0.08, line=GOLD, lw=1.0, lalpha=0.6, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.25, parent=ds)
text(s, 0.85, 6.2, 11.7, 0.6, [[("GET /api/export", {"font": MONO_FONT, "bold": True, "color": GOLD, "size": 11}),
                                 ("   Every world, every line, every alliance and betrayal: a dataset of multi-agent persuasion and deception.", {"color": INK, "size": 11.5})]],
     size=11, anchor="m", parent=ds)
tl = Timeline()
g = tl.group("auto")
for i, sh in enumerate(CARDS):
    tl.add(g, sh, "rise", 150 + i * 300, 700)
tl.add(g, rep, "wipe", 1200, 900)
tl.add(g, m2, "wipe", 1500, 900)
tl.add(g, soc, "zoom", 1800, 700)
tl.add(g, ds, "rise", 2400, 700)
apply_motion(s, "morph", tl)
notes(s, """
[1:38-1:50]
"And it's more than a game. It's the AI-box experiment at room scale: the Conquerors demand the gate to Earth, the room votes on their phones, and the persuasion report shows which kinds of AI talked their humans into opening it. Every session exports as a dataset of multi-agent persuasion, alliances and deception."
LIVE CUT: on /stage press V to open the vote (40 s, or press C to close early): the finale narration plays, then the persuasion report.
""")

# ============================================================================= 10. CLOSE
s = new_slide()
bgp = pic(s, BG10, 0, 0, SW, SH, shape_name="!!bgart")
q1 = text(s, 0.75, 1.55, 8.9, 0.95, ["We didn't build a game where humans talk to AI characters."], size=23, font=TITLE_FONT, color=LAV, line_spacing=1.05, shadow=True)
q2 = text(s, 0.75, 2.3, 8.3, 1.4, ["We built a universe where AI civilizations have their own lives, ambitions and relationships."], size=23, font=TITLE_FONT, color=INK, line_spacing=1.05, shadow=True)
q3 = text(s, 0.75, 3.85, 8.6, 0.9, ["Humans are just visitors."], size=44, font=TITLE_FONT, bold=True, color=GOLD, shadow=True)
qr = s.shapes.add_group_shape()
qcard = rect(s, 9.95, 1.35, 2.75, 2.75, fill="FFFFFF", line=GOLD, lw=2, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06, parent=qr)
add_effects(qcard, glow=(GOLD, 22, 0.45))
pic(s, os.path.join(ASSETS, "play-qr.png"), 10.08, 1.48, 2.49, 2.49, parent=qr)
text(s, 9.7, 4.25, 3.25, 0.4, ["SCAN TO PLAY"], size=17, font=TITLE_FONT, bold=True, color=INK, spc=250, align="c", parent=qr)
text(s, 9.7, 4.65, 3.25, 0.3, ["HOLD TO TELEPORT"], size=9, font=MONO_FONT, bold=True, color=GOLD, spc=250, align="c", parent=qr)
text(s, 9.55, 5.0, 3.55, 0.5, ["eco-exactly-associate-pit.trycloudflare.com/p", "github.com/vnmoorthy/aftermath"], size=8, font=MONO_FONT, color=LAV, align="c", line_spacing=1.1, parent=qr)
built = text(s, 0.75, 6.4, 11.9, 0.4, [[("Built at ", {}), ("Haunted Hacks 2026", {"color": GOLD, "bold": True}), (" with ", {}),
                                        ("Terse Durable Actors", {"color": INK, "bold": True}), ("  ·  ", {"color": DIM}),
                                        ("Agent Relay", {"color": INK, "bold": True}), ("  ·  ", {"color": DIM}), ("OpenAI", {"color": INK, "bold": True})]],
             size=13, color=LAV, shadow=True)
tl = Timeline()
g = tl.group("auto")
tl.add(g, bgp, "kenburns", 0, 24000)
tl.add(g, q1, "rise", 300, 900)
tl.add(g, q2, "rise", 1400, 900)
tl.add(g, q3, "bigzoom", 2700, 1100)
tl.add(g, qr, "zoom", 3600, 800)
tl.add(g, built, "fade", 4200, 800)
tl.add(g, qcard, "pulse", 4700, 1400)
apply_motion(s, "fade", tl)
notes(s, """
[1:50-2:00]
"We didn't build a game where humans talk to AI characters. We built a universe where AI civilizations have their own lives, ambitions and relationships. Humans are just visitors."
Pause. "Scan it. The universe is still running." Leave the QR up for Q&A.
""")

prs.core_properties.title = "AFTERMATH: The universe AI inherited"
prs.core_properties.author = "AFTERMATH team (Haunted Hacks 2026)"
prs.core_properties.subject = "Pitch deck"
prs.save(OUT)
print("wrote", OUT)
