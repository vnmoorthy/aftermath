/*!
 * AFTERMATH · CosmicZoom
 * A Powers-of-Ten style "cosmic address" viewer. Two routes through reality:
 *   - journey (default when cosmos.journey exists): Earth -> ... -> the world, where every step
 *     says how it relates to the previous one: dir 'start' | 'out' | 'in' | 'across'.
 *   - path: cosmos.path, the Omniverse straight down to the world (every step 'in').
 * Plain JavaScript. No modules, no libraries. Exposes window.CosmicZoom.
 *
 *   var ctl = CosmicZoom.open(cosmos, {
 *     mode: 'journey' | 'path', // default: 'journey' when cosmos.journey has steps, else 'path'
 *     autoplay: true,          // fly the whole route in ~7-10 s (tap anywhere to skip to the end)
 *     msPerStep: 1100,         // pace hint; total autoplay is clamped to 7-10 s
 *     onDone: fn(cosmos),      // ENTER button: the overlay closes, then onDone is called
 *     enterLabel: "ENTER WORLD",
 *     onClose: fn(reason),     // optional: every close ("enter" | "escape" | "button" | "api")
 *     autoEnterMs: 0,          // optional: press ENTER automatically this long after landing
 *     assetBase: "/assets/",   // optional, for fallback art
 *     loadFonts: true          // optional: inject Inter + JetBrains Mono (Google Fonts)
 *   });                        // ctl = { close(), skip(), seek(stepIndex) }
 *   CosmicZoom.close();
 *
 * Every step may carry `image` (always preferred) and `filter` (a CSS filter string, baked into
 * the layer once). Missing or failed images fall back to built-in art, then to procedural art.
 * Rendering is a single <canvas> drawing pre-baked sprites (no per-frame filters or layout).
 */
(function (W) {
  'use strict';
  if (!W || !W.document) return;
  var D = W.document;

  var TAU = Math.PI * 2;
  var ZF = 8;                 // on-screen magnification between consecutive path steps
  var LNZ = Math.log(ZF);
  var BR = '184,155,94';      // brass #b89b5e
  var INK = '236,230,214';    // warm white
  var DWELL = 0.55;           // autoplay slows to (1 - DWELL) of mean speed on each step

  var LADDER = [
    ['omniverse', 'Omniverse', 'All possible realities'],
    ['megaverse', 'Megaverse', 'An enormous collection of multiverses'],
    ['multiverse', 'Multiverse', 'Multiple universes'],
    ['hyperverse', 'Hyperverse', 'Higher-dimensional realities'],
    ['metaverse', 'Metaverse', 'Interconnected reality systems'],
    ['xenoverse', 'Xenoverse', 'Alien or fundamentally different realities'],
    ['macroverse', 'Macroverse', 'Vast cosmic structures'],
    ['gigaverse', 'Gigaverse', 'Massive collections of universes'],
    ['teraverse', 'Teraverse', 'A larger cosmic domain'],
    ['universe', 'Universe C-137', 'Our universe'],
    ['microverse', 'Microverse', 'A microscopic universe'],
    ['milliverse', 'Milliverse', 'A smaller reality'],
    ['nanoverse', 'Nanoverse', 'A nanoscale reality'],
    ['picoverse', 'Picoverse', 'A sub-nanoscopic reality'],
    ['femtoverse', 'Femtoverse', 'A subatomic-scale reality'],
    ['attoverse', 'Attoverse', 'An extremely tiny reality'],
    ['zeptoverse', 'Zeptoverse', 'An even smaller reality'],
    ['yoctoverse', 'Yoctoverse', 'An extraordinarily tiny reality'],
    ['quantumverse', 'Quantumverse', 'The Planck-scale foam beneath everything']
  ];
  var TIER = {};
  for (var ti = 0; ti < LADDER.length; ti++) TIER[LADDER[ti][0]] = ti;

  // One visual per path kind. "image" layers use /assets/verse-<img>.webp (feathered, optionally tinted).
  var VIS = {
    omniverse: { draw: 'image', img: 'omniverse' },
    megaverse: { draw: 'image', img: 'megaverse' },
    multiverse: { draw: 'image', img: 'multiverse' },
    hyperverse: { draw: 'image', img: 'hyperverse' },
    metaverse: { draw: 'image', img: 'hyperverse', tint: 178, amt: 0.55, motif: 'net', flip: true },
    xenoverse: { draw: 'image', img: 'xenoverse' },
    macroverse: { draw: 'image', img: 'supercluster', tint: 36, amt: 0.5, motif: 'rings', flip: true },
    gigaverse: { draw: 'image', img: 'megaverse', tint: 292, amt: 0.5, motif: 'lattice', flip: true },
    teraverse: { draw: 'image', img: 'universe', tint: 205, amt: 0.45, motif: 'domain', flip: true },
    universe: { draw: 'image', img: 'universe' },
    supercluster: { draw: 'image', img: 'supercluster' },
    group: { draw: 'group' },
    galaxy: { draw: 'galaxy' },
    star: { draw: 'star' },
    object: { draw: 'object' },
    microverse: { draw: 'image', img: 'microverse' },
    milliverse: { draw: 'image', img: 'nanoverse', tint: 30, amt: 0.32, flip: true },
    nanoverse: { draw: 'image', img: 'nanoverse' },
    picoverse: { draw: 'atom' },
    femtoverse: { draw: 'nucleus' },
    attoverse: { draw: 'quarks' },
    zeptoverse: { draw: 'image', img: 'quantumverse', tint: 262, amt: 0.38, flip: true },
    yoctoverse: { draw: 'image', img: 'quantumverse', tint: 328, amt: 0.38 },
    quantumverse: { draw: 'image', img: 'quantumverse' },
    world: { draw: 'world' },
    nebula: { draw: 'image' }
  };
  var DIRS = {
    start: { g: '◉', w: 'START' },
    out: { g: '▲', w: 'OUT' },
    'in': { g: '▼', w: 'IN' },
    across: { g: '⇄', w: 'ACROSS' }
  };
  var SYN = {
    earth: 'world', home: 'world', planet: 'world', moon: 'world', homeworld: 'world', system: 'star', solarsystem: 'star', starsystem: 'star',
    sun: 'star', localgroup: 'group', galaxygroup: 'group', cluster: 'supercluster', galaxycluster: 'supercluster',
    filament: 'supercluster', cosmicweb: 'universe', battery: 'object', host: 'object', crystal: 'object',
    grain: 'object', dust: 'object', device: 'object', atom: 'picoverse', nucleus: 'femtoverse', quark: 'attoverse',
    quarks: 'attoverse', foam: 'quantumverse', planck: 'quantumverse'
  };
  var HUE = {
    omniverse: 42, megaverse: 285, multiverse: 222, hyperverse: 190, metaverse: 176, xenoverse: 128, macroverse: 34,
    gigaverse: 300, teraverse: 205, universe: 214, supercluster: 30, microverse: 262, milliverse: 160, nanoverse: 150,
    zeptoverse: 262, yoctoverse: 328, quantumverse: 248, world: 200
  };

  // ------------------------------------------------------------------ small helpers
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function str(v) { return v == null ? '' : String(v); }
  function isObj(v) { return !!v && typeof v === 'object'; }
  function slug(v) { return str(v).toLowerCase().replace(/[^a-z]/g, ''); }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function nowMs() { return W.performance && W.performance.now ? W.performance.now() : Date.now(); }
  function hash(s) {
    var h = 2166136261; s = str(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mk(w, h) { var c = D.createElement('canvas'); c.width = w; c.height = h; return c; }
  function el(tag, cls, parent, text) {
    var e = D.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  // Canvas `filter` (Chrome, Firefox). Elsewhere CSS filters are baked with a colour matrix.
  var CANVAS_FILTER = (function () {
    try {
      var c = D.createElement('canvas').getContext('2d');
      if (!c || !('filter' in c)) return false;
      c.filter = 'saturate(2)';
      return c.filter === 'saturate(2)';
    } catch (e) { return false; }
  })();
  var raf = W.requestAnimationFrame ? function (f) { return W.requestAnimationFrame(f); } : function (f) { return W.setTimeout(function () { f(nowMs()); }, 16); };
  var caf = W.cancelAnimationFrame ? function (id) { W.cancelAnimationFrame(id); } : function (id) { W.clearTimeout(id); };
  function mq(q) { try { return !!(W.matchMedia && W.matchMedia(q).matches); } catch (e) { return false; } }

  // ------------------------------------------------------------------ scale text ("10²⁶ m")
  var SUP_IN = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };
  var SUP_OUT = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function parseScale(s) {
    s = str(s).trim();
    var m = /^(.*?)10\s*([⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*(.*)$/.exec(s), e = NaN;
    if (m) e = Number(m[2].split('').map(function (c) { return SUP_IN[c] || ''; }).join(''));
    else {
      m = /^(.*?)10\s*\^\s*\(?\s*([-+−]?\d+)\s*\)?\s*(.*)$/.exec(s);
      if (m) e = Number(m[2].replace('−', '-'));
    }
    if (!m || !isFinite(e)) return null;
    return { pre: m[1], e: e, unit: m[3] };
  }
  function supNum(n) { return String(n).split('').map(function (c) { return SUP_OUT[c] || c; }).join(''); }

  // ------------------------------------------------------------------ image cache (shared by sessions, bounded by asset count)
  var IMG = {};
  function loadImage(url) {
    var e = IMG[url];
    if (e && (e.state === 'ok' || e.state === 'loading')) return e;
    var retry = !!e;                              // a failed image may have finished rendering since
    e = IMG[url] = { state: 'loading', img: null };
    var img = new W.Image(), settled = false;
    img.decoding = 'async';
    var ok = function () {
      if (settled) return; settled = true;
      if (img.naturalWidth > 0) { e.img = img; e.state = 'ok'; } else e.state = 'fail';
    };
    img.onload = function () { if (img.decode) img.decode().then(ok, ok); else ok(); };
    img.onerror = function () { if (!settled) { settled = true; e.state = 'fail'; } };
    img.src = retry ? url + (url.indexOf('?') < 0 ? '?' : '&') + 'r=' + Date.now() : url;
    return e;
  }

  // ------------------------------------------------------------------ path -> layers
  function resolveKind(st) {
    var c = [slug(st.kind), slug(st.label)], i, j, keys = Object.keys(VIS), syn = Object.keys(SYN);
    for (i = 0; i < c.length; i++) {
      if (!c[i]) continue;
      if (VIS.hasOwnProperty(c[i]) && c[i] !== 'nebula') return c[i];
      if (SYN.hasOwnProperty(c[i])) return SYN[c[i]];
    }
    for (i = 0; i < c.length; i++) {
      if (!c[i]) continue;
      for (j = 0; j < keys.length; j++) if (keys[j] !== 'nebula' && c[i].indexOf(keys[j]) === 0) return keys[j];
      for (j = 0; j < syn.length; j++) if (c[i].indexOf(syn[j]) === 0) return SYN[syn[j]];
    }
    var n = slug(st.name);
    if (n && n !== 'nebula' && VIS.hasOwnProperty(n)) return n;
    return 'nebula';
  }

  function buildLayers(steps, cosmos, base, journey) {
    var world = isObj(cosmos.world) ? cosmos.world : {};
    steps = (Array.isArray(steps) ? steps : []).filter(isObj);
    if (!steps.length) {
      steps = [{ label: 'WORLD', name: str(world.planetName) || 'Unknown world', note: str(world.aiName), scale: '', kind: 'world' }];
    }
    var terrain = str(world.terrain).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    var arch = str(world.archetype).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    var out = [], last = steps.length - 1, z = 0, x = 0;
    for (var k = 0; k < steps.length; k++) {
      var st = steps[k], vk = resolveKind(st), vis = VIS[vk];
      var dir = k === 0 ? 'start' : journey ? str(st.dir).toLowerCase() : 'in';
      if (k > 0 && dir !== 'out' && dir !== 'across') dir = 'in';
      if (k > 0) { if (dir === 'out') z -= 1; else if (dir === 'in') z += 1; else x += 1; }
      var L = {
        k: k, vk: vk, vis: vis, dir: dir, z: z, x: x,
        label: str(st.label).trim() || vk.toUpperCase(),
        name: str(st.name).trim() || str(st.label).trim() || 'Unnamed',
        note: str(st.note).trim(), scale: str(st.scale).trim(),
        tier: TIER.hasOwnProperty(vk) ? TIER[vk] : -1,
        seed: hash(vk + '|' + str(st.name) + '|' + k), spin: k % 2 ? -1 : 1,
        urls: [], filter: str(st.filter).trim(), badge: null, aiName: '',
        proc: vis.draw === 'image' ? null : vis.draw
      };
      L.rot0 = (L.seed % 6283) / 1000;
      L.sc = parseScale(L.scale);
      L.hue = HUE.hasOwnProperty(vk) ? HUE[vk] : L.seed % 360;
      L.vkey = [vis.tint == null ? '' : vis.tint, vis.motif || '', vis.flip ? 1 : 0].join('|');
      var img = typeof st.image === 'string' ? st.image.trim() : '';
      if (img && !/^\s*javascript:/i.test(img)) L.urls.push(img);   // the step's own art always wins
      L.primary = L.urls[0] || '';
      var isWorld = vk === 'world' && k === last;
      if (isWorld) {
        if (terrain) L.urls.push(base + 'world-' + terrain + '.webp');
        if (arch) L.badge = base + 'ai-' + arch + '.webp';
        L.aiName = str(world.aiName).trim();
        L.hue = hash(terrain || L.name) % 360;
      } else if (vis.img) {
        L.urls.push(base + 'verse-' + vis.img + '.webp');            // built-in fallback art
      }
      L.urls = L.urls.filter(function (u, i, a) { return a.indexOf(u) === i; });
      L.draw = isWorld ? 'world' : L.urls.length || vis.draw === 'image' ? 'image' : vis.draw;
      if (vk === 'object') {
        var txt = (L.name + ' ' + L.note + ' ' + L.label).toLowerCase();
        L.obj = /crystal|gem|shard|quartz|prism/.test(txt) ? 'crystal' : /dust|grain|mote|sand|pebble|speck/.test(txt) ? 'grain' : 'battery';
      }
      out.push(L);
    }
    return out;
  }

  // ------------------------------------------------------------------ CSS filter -> colour matrix (for canvases without ctx.filter)
  function mat(A, B) {   // A after B, both 3x4 affine (offsets in 0..255)
    var R = [], r, c;
    for (r = 0; r < 3; r++) {
      for (c = 0; c < 3; c++) R[r * 4 + c] = A[r * 4] * B[c] + A[r * 4 + 1] * B[4 + c] + A[r * 4 + 2] * B[8 + c];
      R[r * 4 + 3] = A[r * 4] * B[3] + A[r * 4 + 1] * B[7] + A[r * 4 + 2] * B[11] + A[r * 4 + 3];
    }
    return R;
  }
  function filterMatrix(f) {
    var M = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0], re = /([a-z-]+)\(\s*(-?[\d.]+)\s*(deg|rad|turn|grad|%)?\s*\)/gi, m, any = false;
    while ((m = re.exec(str(f)))) {
      var fn = m[1].toLowerCase(), v = parseFloat(m[2]), unit = (m[3] || '').toLowerCase(), A = null;
      if (!isFinite(v)) continue;
      if (unit === '%') v /= 100;
      if (fn === 'hue-rotate') {
        var rad = unit === 'rad' ? v : unit === 'turn' ? v * TAU : unit === 'grad' ? v * Math.PI / 200 : v * Math.PI / 180;
        var co = Math.cos(rad), si = Math.sin(rad);
        A = [0.213 + co * 0.787 - si * 0.213, 0.715 - co * 0.715 - si * 0.715, 0.072 - co * 0.072 + si * 0.928, 0,
          0.213 - co * 0.213 + si * 0.143, 0.715 + co * 0.285 + si * 0.14, 0.072 - co * 0.072 - si * 0.283, 0,
          0.213 - co * 0.213 - si * 0.787, 0.715 - co * 0.715 + si * 0.715, 0.072 + co * 0.928 + si * 0.072, 0];
      } else if (fn === 'saturate' || fn === 'grayscale') {
        var q = fn === 'saturate' ? Math.max(0, v) : 1 - clamp(v, 0, 1);
        A = [0.213 + 0.787 * q, 0.715 - 0.715 * q, 0.072 - 0.072 * q, 0,
          0.213 - 0.213 * q, 0.715 + 0.285 * q, 0.072 - 0.072 * q, 0,
          0.213 - 0.213 * q, 0.715 - 0.715 * q, 0.072 + 0.928 * q, 0];
      } else if (fn === 'sepia') {
        var p = 1 - clamp(v, 0, 1);
        A = [0.393 + 0.607 * p, 0.769 - 0.769 * p, 0.189 - 0.189 * p, 0,
          0.349 - 0.349 * p, 0.686 + 0.314 * p, 0.168 - 0.168 * p, 0,
          0.272 - 0.272 * p, 0.534 - 0.534 * p, 0.131 + 0.869 * p, 0];
      } else if (fn === 'brightness') {
        A = [v, 0, 0, 0, 0, v, 0, 0, 0, 0, v, 0];
      } else if (fn === 'contrast') {
        var o = (0.5 - 0.5 * v) * 255;
        A = [v, 0, 0, o, 0, v, 0, o, 0, 0, v, o];
      } else if (fn === 'invert') {
        var n = clamp(v, 0, 1), sc = 1 - 2 * n, of = n * 255;
        A = [sc, 0, 0, of, 0, sc, 0, of, 0, 0, sc, of];
      }
      if (A) { M = mat(A, M); any = true; }
    }
    return any ? M : null;
  }
  function applyMatrix(g, N, M) {
    var id = g.getImageData(0, 0, N, N), d = id.data, r, gr, b;
    for (var i = 0; i < d.length; i += 4) {
      r = d[i]; gr = d[i + 1]; b = d[i + 2];
      d[i] = M[0] * r + M[1] * gr + M[2] * b + M[3];
      d[i + 1] = M[4] * r + M[5] * gr + M[6] * b + M[7];
      d[i + 2] = M[8] * r + M[9] * gr + M[10] * b + M[11];
    }
    g.putImageData(id, 0, 0);
  }

  // ------------------------------------------------------------------ offscreen sprites
  function feather(g, N) {
    g.globalCompositeOperation = 'destination-in';
    var m = N / 2, gr = g.createRadialGradient(m, m, m * 0.42, m, m, m);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.5, 'rgba(0,0,0,0.8)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, N, N);
    g.globalCompositeOperation = 'source-over';
  }
  function glowDot(g, x, y, r, rgb) {
    if (!(r > 0)) return;
    var gr = g.createRadialGradient(x, y, 0, x, y, r * 3);
    gr.addColorStop(0, 'rgba(' + rgb + ',0.95)');
    gr.addColorStop(0.3, 'rgba(' + rgb + ',0.35)');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr;
    g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  }

  // vis: the built-in variant (tint / motif / flip) when falling back to shared art, else null.
  function buildImageSprite(img, filter, vis, seed) {
    var iw = img.naturalWidth, ih = img.naturalHeight, M = filter && !CANVAS_FILTER ? filterMatrix(filter) : null;
    var N = Math.min(M ? 768 : 1024, Math.max(256, Math.max(iw, ih)));   // matrix path is CPU work: keep it lighter
    var c = mk(N, N), g = c.getContext('2d');
    var sc = Math.max(N / iw, N / ih);                                   // cover-crop: subjects are centred
    vis = vis || {};
    if (vis.flip) { g.translate(N, 0); g.scale(-1, 1); }
    if (filter && CANVAS_FILTER) g.filter = filter;
    g.drawImage(img, (N - iw * sc) / 2, (N - ih * sc) / 2, iw * sc, ih * sc);
    if (filter && CANVAS_FILTER) g.filter = 'none';
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (M) { try { applyMatrix(g, N, M); } catch (err) { /* tainted or unsupported: keep the unfiltered art */ } }
    if (vis.tint != null) {
      g.globalCompositeOperation = 'color';
      if (g.globalCompositeOperation === 'color') {   // skip the tint where the blend mode is unsupported
        g.globalAlpha = vis.amt || 0.5;
        g.fillStyle = 'hsl(' + vis.tint + ',58%,52%)';
        g.fillRect(0, 0, N, N);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    if (vis.motif) drawMotif(g, vis.motif, N, seed);
    feather(g, N);
    return c;
  }

  function drawMotif(g, motif, N, seed) {
    var R = rng(seed ^ 0x2f6b), m = N / 2, i, j;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    if (motif === 'net') {
      var P = [];
      for (i = 0; i < 34; i++) { var a = R() * TAU, d = Math.sqrt(R()) * N * 0.42; P.push([m + Math.cos(a) * d, m + Math.sin(a) * d]); }
      g.strokeStyle = 'rgba(140,230,222,0.30)';
      g.lineWidth = N / 700;
      g.beginPath();
      for (i = 0; i < P.length; i++) {
        var near = [];
        for (j = 0; j < P.length; j++) if (j !== i) { var dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1]; near.push([dx * dx + dy * dy, j]); }
        near.sort(function (x, y) { return x[0] - y[0]; });
        for (j = 0; j < 2; j++) { var q = P[near[j][1]]; g.moveTo(P[i][0], P[i][1]); g.lineTo(q[0], q[1]); }
      }
      g.stroke();
      for (i = 0; i < P.length; i++) glowDot(g, P[i][0], P[i][1], N * (0.004 + R() * 0.006), '170,245,238');
    } else if (motif === 'rings') {
      g.lineWidth = N / 600;
      for (i = 1; i <= 7; i++) {
        g.strokeStyle = 'rgba(232,196,128,' + (0.1 + (i % 2) * 0.1).toFixed(2) + ')';
        if (g.setLineDash) g.setLineDash(i % 2 ? [] : [N / 90, N / 120]);
        g.beginPath(); g.arc(m, m, N * 0.062 * i, 0, TAU); g.stroke();
      }
      if (g.setLineDash) g.setLineDash([]);
      g.strokeStyle = 'rgba(232,196,128,0.22)';
      g.beginPath();
      for (i = 0; i < 72; i++) {
        var a3 = i * TAU / 72, r1 = N * 0.44, r2 = r1 - (i % 6 ? N * 0.008 : N * 0.022);
        g.moveTo(m + Math.cos(a3) * r1, m + Math.sin(a3) * r1);
        g.lineTo(m + Math.cos(a3) * r2, m + Math.sin(a3) * r2);
      }
      g.stroke();
    } else if (motif === 'lattice') {
      var sp = N * 0.072, rad = sp * 0.36;
      g.lineWidth = N / 800;
      for (var row = -8; row <= 8; row++) {
        for (var col = -8; col <= 8; col++) {
          var x = m + (col + (row % 2 ? 0.5 : 0)) * sp, y = m + row * sp * 0.866;
          var dist = Math.sqrt((x - m) * (x - m) + (y - m) * (y - m)) / (N * 0.46);
          if (dist > 1) continue;
          g.strokeStyle = 'rgba(222,180,255,' + ((1 - dist) * 0.5).toFixed(3) + ')';
          g.beginPath(); g.arc(x, y, rad * (0.6 + R() * 0.5), 0, TAU); g.stroke();
          if (R() < 0.12) glowDot(g, x, y, rad * 0.45, '240,210,255');
        }
      }
    } else if (motif === 'domain') {
      g.lineWidth = N / 260; g.strokeStyle = 'rgba(160,210,255,0.16)';
      g.beginPath(); g.arc(m, m, N * 0.4, 0, TAU); g.stroke();
      g.lineWidth = N / 900; g.strokeStyle = 'rgba(200,230,255,0.45)';
      g.beginPath(); g.arc(m, m, N * 0.4, 0, TAU); g.stroke();
      for (i = 0; i < 5; i++) {
        var a4 = R() * TAU, d4 = N * (0.12 + R() * 0.2), r4 = N * (0.04 + R() * 0.06);
        g.strokeStyle = 'rgba(200,230,255,0.25)';
        g.beginPath(); g.arc(m + Math.cos(a4) * d4, m + Math.sin(a4) * d4, r4, 0, TAU); g.stroke();
      }
    }
    g.restore();
  }

  // Procedural stand-in for an image that is missing, failed or still loading.
  function buildFallback(L) {
    var N = 384, c = mk(N, N), g = c.getContext('2d'), R = rng(L.seed ^ 0x51ed27), h = L.hue, m = N / 2, i, a, d;
    g.globalCompositeOperation = 'lighter';
    for (i = 0; i < 7; i++) {
      var x = m + (R() - 0.5) * N * 0.42, y = m + (R() - 0.5) * N * 0.42, r = N * (0.14 + R() * 0.26);
      var hh = Math.round((h + (R() - 0.5) * 70 + 360) % 360);
      var gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'hsla(' + hh + ',70%,62%,' + (0.18 + R() * 0.2).toFixed(2) + ')');
      gr.addColorStop(1, 'hsla(' + hh + ',70%,40%,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, N, N);
    }
    for (i = 0; i < 170; i++) {
      g.fillStyle = 'rgba(' + INK + ',' + (0.2 + R() * 0.7).toFixed(2) + ')';
      var sz = R() < 0.1 ? 2 : 1;
      g.fillRect(R() * N, R() * N, sz, sz);
    }
    var vk = L.vk, style = /^(omniverse|megaverse|multiverse|gigaverse)$/.test(vk) ? 'bubbles'
      : /^(universe|supercluster|macroverse|teraverse)$/.test(vk) ? 'web'
      : /^(quantumverse|zeptoverse|yoctoverse|nanoverse|milliverse)$/.test(vk) ? 'foam' : 'nebula';
    g.lineWidth = 1.2;
    if (style === 'bubbles' || style === 'foam') {
      var n = style === 'foam' ? 90 : 16;
      for (i = 0; i < n; i++) {
        a = R() * TAU; d = Math.sqrt(R()) * N * 0.4;
        var br = style === 'foam' ? N * (0.008 + R() * 0.03) : N * (0.03 + R() * 0.1);
        g.strokeStyle = 'hsla(' + h + ',60%,78%,' + (0.18 + R() * 0.3).toFixed(2) + ')';
        g.beginPath(); g.arc(m + Math.cos(a) * d, m + Math.sin(a) * d, br, 0, TAU); g.stroke();
      }
    } else if (style === 'web') {
      var P = [];
      for (i = 0; i < 46; i++) { a = R() * TAU; d = Math.sqrt(R()) * N * 0.42; P.push([m + Math.cos(a) * d, m + Math.sin(a) * d]); }
      g.strokeStyle = 'hsla(' + h + ',55%,75%,0.22)';
      g.beginPath();
      for (i = 0; i < P.length; i++) {
        for (var j = i + 1; j < P.length; j++) {
          var dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1];
          if (dx * dx + dy * dy < N * N * 0.012) { g.moveTo(P[i][0], P[i][1]); g.lineTo(P[j][0], P[j][1]); }
        }
      }
      g.stroke();
      g.fillStyle = 'rgba(255,240,215,0.7)';
      for (i = 0; i < P.length; i++) g.fillRect(P[i][0] - 1, P[i][1] - 1, 2, 2);
    }
    feather(g, N);
    return c;
  }

  function buildGalaxy(N, seed) {
    var c = mk(N, N), g = c.getContext('2d'), R = rng(seed), m = N / 2, i;
    var halo = g.createRadialGradient(m, m, 0, m, m, m);
    halo.addColorStop(0, 'rgba(255,238,205,0.5)');
    halo.addColorStop(0.1, 'rgba(230,200,150,0.2)');
    halo.addColorStop(0.38, 'rgba(120,124,175,0.06)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, N, N);
    g.globalCompositeOperation = 'lighter';
    var cols = ['255,236,210', '214,224,255', '255,226,180', '184,155,94'];
    for (i = 0; i < 5200; i++) {
      var arm = i % 2, rr = Math.pow(R(), 0.55);
      var spread = (R() + R() + R() - 1.5) * 0.42 * (1 - rr * 0.45);
      var ang = arm * Math.PI + rr * 5.2 + spread;
      var x = m + Math.cos(ang) * rr * m * 0.94, y = m + Math.sin(ang) * rr * m * 0.94;
      var col = rr < 0.22 ? cols[2] : cols[R() < 0.12 ? 3 : R() < 0.55 ? 1 : 0];
      var al = (0.22 + R() * 0.5) * (1 - rr * 0.45), s = R() < 0.035 ? 2.2 : 0.7 + R() * 1.1;
      g.fillStyle = 'rgba(' + col + ',' + al.toFixed(3) + ')';
      g.fillRect(x, y, s, s);
    }
    for (i = 0; i < 46; i++) {           // star-forming knots along the arms
      var rk = 0.3 + R() * 0.62, ak = (i % 2) * Math.PI + rk * 5.2 + (R() - 0.5) * 0.3;
      glowDot(g, m + Math.cos(ak) * rk * m * 0.94, m + Math.sin(ak) * rk * m * 0.94, N * (0.002 + R() * 0.003), R() < 0.5 ? '255,180,190' : '200,220,255');
    }
    var core = g.createRadialGradient(m, m, 0, m, m, N * 0.1);
    core.addColorStop(0, 'rgba(255,250,236,1)');
    core.addColorStop(0.35, 'rgba(255,222,172,0.55)');
    core.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = core;
    g.fillRect(0, 0, N, N);
    return c;
  }

  function buildCloud(N) {
    var c = mk(N, N), g = c.getContext('2d'), R = rng(99), m = N / 2;
    var gr = g.createRadialGradient(m, m, 0, m, m, m);
    gr.addColorStop(0, 'rgba(150,180,255,0.35)');
    gr.addColorStop(0.5, 'rgba(110,130,220,0.1)');
    gr.addColorStop(1, 'rgba(80,90,200,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, N, N);
    for (var i = 0; i < 2600; i++) {
      var u = Math.max(1e-6, R()), a = R() * TAU, rad = Math.sqrt(-2 * Math.log(u)) * N * 0.15;
      if (R() > 0.35 + 0.65 * Math.abs(Math.cos(a * 2))) continue;   // p-orbital lobes
      var x = m + Math.cos(a) * rad, y = m + Math.sin(a) * rad;
      if (x < 0 || y < 0 || x > N || y > N) continue;
      g.fillStyle = 'rgba(200,215,255,' + (0.08 + R() * 0.25).toFixed(2) + ')';
      g.fillRect(x, y, 1.2, 1.2);
    }
    return c;
  }

  // Walk the step's image candidates (its own `image` first, then built-in art); fallbacks load lazily.
  function resolveImg(s, L) {
    for (var i = 0; i < L.urls.length; i++) {
      var u = L.urls[i];
      if (!s.req[u]) { s.req[u] = 1; loadImage(u); }
      var e = IMG[u];
      if (!e || e.state === 'loading') return null;
      if (e.state === 'ok') { L.dead = false; return { url: u, e: e, mapped: u !== L.primary }; }
    }
    L.dead = true;
    return null;
  }
  function spriteFor(s, L) {
    var r = resolveImg(s, L);
    if (!r) return null;
    var key = r.url + '|' + L.filter + '|' + (r.mapped ? L.vkey : '');
    var sp = s.sprites[key];
    if (sp) return sp;
    if (s.budget <= 0) return null;     // at most one big sprite build per frame
    s.budget--;
    try {
      sp = s.sprites[key] = { c: buildImageSprite(r.e.img, L.filter, r.mapped ? L.vis : null, L.seed), born: L.usedFb ? s.clock : 0 };
    } catch (err) {
      r.e.state = 'fail';
      return null;
    }
    return sp;
  }
  function fallbackFor(s, L) {
    var key = L.vk + '|' + L.hue;
    return s.fb[key] || (s.fb[key] = buildFallback(L));
  }
  function galaxy(s) { return s.gal || (s.gal = buildGalaxy(640, 20251031)); }
  function cloud(s) { return s.cloud || (s.cloud = buildCloud(256)); }

  // ------------------------------------------------------------------ layer painters (size = layer diameter in CSS px)
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function spikes(g, x, y, len, al) {
    if (!(len > 1) || !(al > 0.004)) return;
    var c0 = 'rgba(255,240,214,0)', c1 = 'rgba(255,240,214,' + Math.min(1, al).toFixed(3) + ')';
    g.lineWidth = Math.max(0.6, len * 0.012);
    var gh = g.createLinearGradient(x - len, y, x + len, y);
    gh.addColorStop(0, c0); gh.addColorStop(0.5, c1); gh.addColorStop(1, c0);
    g.strokeStyle = gh;
    g.beginPath(); g.moveTo(x - len, y); g.lineTo(x + len, y); g.stroke();
    var gv = g.createLinearGradient(x, y - len, x, y + len);
    gv.addColorStop(0, c0); gv.addColorStop(0.5, c1); gv.addColorStop(1, c0);
    g.strokeStyle = gv;
    g.beginPath(); g.moveTo(x, y - len); g.lineTo(x, y + len); g.stroke();
  }

  function drawImageLayer(s, g, L, cx, cy, size, a, t) {
    var sp = spriteFor(s, L), f = 1;
    if (sp && sp.born) f = clamp((t - sp.born) / 0.6, 0, 1);
    if (!sp) L.usedFb = true;
    if (!sp || f < 1) {                       // loading or missing: procedural art for this kind
      var fa = a * (sp ? 1 - f : 1);
      if (L.proc && PAINT[L.proc]) {
        g.save();
        try { PAINT[L.proc](s, g, L, cx, cy, size, fa, t); } finally { g.restore(); }
      } else {
        g.save();
        g.translate(cx, cy);
        g.rotate(L.rot0 + t * 0.014 * L.spin);
        g.globalAlpha = fa;
        g.drawImage(fallbackFor(s, L), -size / 2, -size / 2, size, size);
        g.restore();
      }
    }
    if (sp) {
      g.translate(cx, cy);
      g.rotate(L.rot0 + t * 0.014 * L.spin);
      g.globalAlpha = a * f;
      g.drawImage(sp.c, -size / 2, -size / 2, size, size);
    }
  }

  function drawGalaxy(s, g, L, cx, cy, size, a, t) {
    var gal = galaxy(s), gs = size * 0.96;
    g.globalAlpha = a;
    g.translate(cx + size * 0.15, cy + size * 0.05);   // the address sits out in a spiral arm, not the core
    g.scale(1, 0.8);
    g.rotate(L.rot0 - t * 0.03);
    g.drawImage(gal, -gs / 2, -gs / 2, gs, gs);
  }

  function groupItems(L) {
    if (L.items) return L.items;
    var R = rng(L.seed), it = [{ x: 0.019, y: 0.006, s: 0.13, rot: R() * TAU, tilt: 0.8, spiral: true, sp: 1 }];
    for (var i = 0; i < 9; i++) {
      var a = R() * TAU, d = 0.17 + R() * 0.25;
      it.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.85, s: 0.035 + R() * 0.07, rot: R() * TAU, tilt: 0.35 + R() * 0.6, spiral: R() < 0.55, sp: (R() < 0.5 ? -1 : 1) * (0.5 + R()) });
    }
    return (L.items = it);
  }
  function drawGroup(s, g, L, cx, cy, size, a, t) {
    var gal = galaxy(s), it = groupItems(L);
    g.globalAlpha = a * 0.6;
    g.strokeStyle = 'rgba(' + BR + ',0.6)';
    g.lineWidth = 1;
    if (g.setLineDash) g.setLineDash([3, 6]);
    g.beginPath(); g.arc(cx, cy, size * 0.46, 0, TAU); g.stroke();
    if (g.setLineDash) g.setLineDash([]);
    for (var i = it.length - 1; i >= 0; i--) {
      var o = it[i], d = o.s * size;
      if (d < 0.8) continue;
      g.save();
      g.globalAlpha = a;
      g.translate(cx + o.x * size, cy + o.y * size);
      g.rotate(o.rot);
      g.scale(1, o.tilt);
      if (o.spiral) {
        g.rotate(t * 0.04 * o.sp);
        g.drawImage(gal, -d / 2, -d / 2, d, d);
      } else {
        var gr = g.createRadialGradient(0, 0, 0, 0, 0, d * 0.5);
        gr.addColorStop(0, 'rgba(255,240,214,0.9)');
        gr.addColorStop(0.25, 'rgba(236,206,160,0.35)');
        gr.addColorStop(1, 'rgba(200,170,120,0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(0, 0, d * 0.5, 0, TAU); g.fill();
      }
      g.restore();
    }
  }

  function drawStar(s, g, L, cx, cy, size, a, t) {
    // Star sits off-centre; the highlighted planet (the address) is exactly at the zoom centre.
    var sx = cx - size * 0.3, sy = cy - size * 0.07, k = 0.42;
    var dx = cx - sx, dy = (cy - sy) / k, rT = Math.sqrt(dx * dx + dy * dy), fs = [0.36, 0.62, 1, 1.42];
    g.globalAlpha = a;
    g.lineWidth = Math.max(0.6, size * 0.0011);
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i], rx = rT * f;
      g.strokeStyle = f === 1 ? 'rgba(' + BR + ',0.75)' : 'rgba(' + INK + ',0.16)';
      g.beginPath(); g.ellipse(sx, sy, rx, rx * k, 0, 0, TAU); g.stroke();
      if (f !== 1) {
        var th = L.rot0 * (i + 1) * 1.7 + t * 0.22 / Math.pow(f, 1.5), pr = Math.max(0.8, size * 0.0042 * (0.7 + f * 0.5));
        g.fillStyle = 'rgba(' + INK + ',0.75)';
        g.beginPath(); g.arc(sx + Math.cos(th) * rx, sy + Math.sin(th) * rx * k, pr, 0, TAU); g.fill();
      }
    }
    g.globalCompositeOperation = 'lighter';
    var R0 = size * 0.28, gr = g.createRadialGradient(sx, sy, 0, sx, sy, R0);
    gr.addColorStop(0, 'rgba(255,250,236,1)');
    gr.addColorStop(0.05, 'rgba(255,232,186,0.9)');
    gr.addColorStop(0.18, 'rgba(226,182,108,0.32)');
    gr.addColorStop(0.5, 'rgba(' + BR + ',0.08)');
    gr.addColorStop(1, 'rgba(' + BR + ',0)');
    g.fillStyle = gr;
    g.fillRect(sx - R0, sy - R0, R0 * 2, R0 * 2);
    spikes(g, sx, sy, size * 0.22, 0.4);
    var pp = Math.max(1.6, size * 0.0075);
    glowDot(g, cx, cy, pp * 1.6, '232,212,170');
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#f3ead6';
    g.beginPath(); g.arc(cx, cy, pp, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(' + BR + ',0.9)';
    g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, pp * 2.8, 0, TAU); g.stroke();
  }

  function drawObject(s, g, L, cx, cy, size, a, t) {
    g.globalAlpha = a;
    var amb = g.createRadialGradient(cx, cy, 0, cx, cy, size * 0.45);
    amb.addColorStop(0, 'rgba(' + BR + ',0.22)');
    amb.addColorStop(0.5, 'rgba(120,100,170,0.07)');
    amb.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = amb;
    g.fillRect(cx - size * 0.45, cy - size * 0.45, size * 0.9, size * 0.9);
    if (L.obj === 'crystal') return drawCrystal(s, g, cx, cy, size, t);
    if (L.obj === 'grain') return drawGrain(s, g, L, cx, cy, size, t);
    var w = size * 0.25, h = size * 0.5, x = cx - w / 2, y = cy - h / 2, r = w * 0.14;
    var body = g.createLinearGradient(x, 0, x + w, 0);
    body.addColorStop(0, '#141416'); body.addColorStop(0.18, '#4a4740'); body.addColorStop(0.32, '#8d8778');
    body.addColorStop(0.5, '#2a2926'); body.addColorStop(0.8, '#121214'); body.addColorStop(1, '#3a362e');
    g.fillStyle = body;
    rr(g, x, y, w, h, r); g.fill();
    var wx = x + w * 0.13, wy = y + h * 0.17, ww = w * 0.74, wh = h * 0.66;
    g.save();
    rr(g, wx, wy, ww, wh, w * 0.06); g.clip();
    g.fillStyle = '#04050a';
    g.fillRect(wx, wy, ww, wh);
    g.globalCompositeOperation = 'lighter';
    g.save();
    g.translate(cx, cy); g.rotate(t * 0.3); g.scale(1, 0.85);
    var gs = ww * 1.3;
    g.drawImage(galaxy(s), -gs / 2, -gs / 2, gs, gs);
    g.restore();
    var core = g.createRadialGradient(cx, cy, 0, cx, cy, ww * 0.6);
    core.addColorStop(0, 'rgba(255,244,220,0.95)');
    core.addColorStop(0.25, 'rgba(200,170,255,0.35)');
    core.addColorStop(1, 'rgba(120,90,200,0)');
    g.fillStyle = core;
    g.fillRect(wx, wy, ww, wh);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.fillRect(wx + ww * 0.12, wy, ww * 0.07, wh);
    g.restore();
    var cap = g.createLinearGradient(x, 0, x + w, 0);
    cap.addColorStop(0, '#5a4826'); cap.addColorStop(0.3, '#d8bf86'); cap.addColorStop(0.5, '#a88a50');
    cap.addColorStop(0.8, '#4a3a1e'); cap.addColorStop(1, '#7a6235');
    g.fillStyle = cap;
    rr(g, x - w * 0.02, y, w * 1.04, h * 0.11, r * 0.6); g.fill();
    rr(g, x - w * 0.02, y + h * 0.89, w * 1.04, h * 0.11, r * 0.6); g.fill();
    rr(g, cx - w * 0.16, y - h * 0.05, w * 0.32, h * 0.06, w * 0.04); g.fill();
    g.strokeStyle = 'rgba(' + INK + ',0.2)';
    g.lineWidth = Math.max(0.5, size * 0.001);
    rr(g, x, y, w, h, r); g.stroke();
  }
  function drawCrystal(s, g, cx, cy, size, t) {
    var w = size * 0.26, h = size * 0.56, sh = w * 0.42;
    var pts = [[cx, cy - h / 2], [cx + w / 2, cy - h / 2 + sh], [cx + w / 2, cy + h / 2 - sh], [cx, cy + h / 2], [cx - w / 2, cy + h / 2 - sh], [cx - w / 2, cy - h / 2 + sh]];
    var fill = g.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
    fill.addColorStop(0, 'rgba(150,220,215,0.55)'); fill.addColorStop(0.5, 'rgba(40,70,80,0.75)'); fill.addColorStop(1, 'rgba(' + BR + ',0.5)');
    g.fillStyle = fill;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(220,250,245,0.45)'; g.lineWidth = Math.max(0.6, size * 0.0015); g.stroke();
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(cx, cy + h / 2);
    g.moveTo(pts[1][0], pts[1][1]); g.lineTo(cx, cy - h / 2 + sh * 1.6); g.lineTo(pts[5][0], pts[5][1]);
    g.strokeStyle = 'rgba(220,250,245,0.2)'; g.stroke();
    g.globalCompositeOperation = 'lighter';
    glowDot(g, cx, cy, size * (0.03 + 0.004 * Math.sin(t * 2)), '255,240,214');
  }
  function drawGrain(s, g, L, cx, cy, size, t) {
    var R = rng(L.seed), r = size * 0.2, n = 22, ph = [];
    for (var i = 0; i < n; i++) ph.push(0.82 + R() * 0.3);
    var gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.1);
    gr.addColorStop(0, '#6e6150'); gr.addColorStop(0.6, '#2b251d'); gr.addColorStop(1, '#0f0d0a');
    g.fillStyle = gr;
    g.beginPath();
    for (i = 0; i <= n; i++) {
      var a = i / n * TAU, rad = r * ph[i % n];
      if (i === 0) g.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); else g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(' + BR + ',0.35)'; g.lineWidth = Math.max(0.6, size * 0.0015); g.stroke();
    g.globalCompositeOperation = 'lighter';
    glowDot(g, cx, cy, size * (0.02 + 0.003 * Math.sin(t * 2.3)), '255,236,200');
  }

  function drawAtom(s, g, L, cx, cy, size, a, t) {
    var R = size * 0.4, cs = R * 2.3;
    g.globalAlpha = a;
    g.globalCompositeOperation = 'lighter';
    g.save();
    g.globalAlpha = a * 0.6;
    g.translate(cx, cy); g.rotate(t * 0.05);
    g.drawImage(cloud(s), -cs / 2, -cs / 2, cs, cs);
    g.restore();
    g.lineWidth = Math.max(0.6, size * 0.0016);
    for (var i = 0; i < 3; i++) {
      g.save();
      g.translate(cx, cy); g.rotate(i * Math.PI / 3 + t * 0.06);
      g.strokeStyle = 'rgba(214,226,255,0.3)';
      g.beginPath(); g.ellipse(0, 0, R * 0.92, R * 0.32, 0, 0, TAU); g.stroke();
      var th = t * (1.4 + i * 0.35) + i * 2.1;
      glowDot(g, Math.cos(th) * R * 0.92, Math.sin(th) * R * 0.32, Math.max(1.2, R * 0.022), '200,222,255');
      g.restore();
    }
    var nu = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.2);
    nu.addColorStop(0, 'rgba(255,246,226,1)');
    nu.addColorStop(0.3, 'rgba(232,200,140,0.6)');
    nu.addColorStop(1, 'rgba(' + BR + ',0)');
    g.fillStyle = nu;
    g.fillRect(cx - R * 0.2, cy - R * 0.2, R * 0.4, R * 0.4);
  }

  function drawNucleus(s, g, L, cx, cy, size, a, t) {
    if (!L.nuc) {
      var R = rng(L.seed), list = [];
      for (var i = 0; i < 18; i++) {
        var u = R() * 2 - 1, ph = R() * TAU, rad = 0.26 * Math.cbrt(R()), q = Math.sqrt(1 - u * u);
        list.push({ x: rad * q * Math.cos(ph), y: rad * q * Math.sin(ph), z: rad * u, p: i % 2 === 0, w: R() * TAU });
      }
      list.sort(function (m, n) { return m.z - n.z; });
      L.nuc = list;
    }
    g.globalAlpha = a;
    g.globalCompositeOperation = 'lighter';
    var halo = g.createRadialGradient(cx, cy, 0, cx, cy, size * 0.45);
    halo.addColorStop(0, 'rgba(' + BR + ',0.35)');
    halo.addColorStop(0.4, 'rgba(160,120,200,0.1)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo;
    g.fillRect(cx - size * 0.45, cy - size * 0.45, size * 0.9, size * 0.9);
    g.globalCompositeOperation = 'source-over';
    var nr = size * 0.075;
    for (var j = 0; j < L.nuc.length; j++) {
      var o = L.nuc[j], px = cx + o.x * size + Math.sin(t * 3 + o.w) * size * 0.003, py = cy + o.y * size + Math.cos(t * 2.6 + o.w) * size * 0.003;
      var gr = g.createRadialGradient(px - nr * 0.35, py - nr * 0.35, nr * 0.08, px, py, nr);
      if (o.p) { gr.addColorStop(0, '#f6e2b0'); gr.addColorStop(0.5, '#b8924e'); gr.addColorStop(1, '#3a2a12'); }
      else { gr.addColorStop(0, '#eef2f8'); gr.addColorStop(0.5, '#8a96a8'); gr.addColorStop(1, '#1e2430'); }
      g.fillStyle = gr;
      g.beginPath(); g.arc(px, py, nr, 0, TAU); g.fill();
    }
  }

  function drawQuarks(s, g, L, cx, cy, size, a, t) {
    var R = size * 0.28, rot = t * 0.2 + L.rot0, cols = ['226,122,104', '128,200,150', '120,160,236'], P = [], i;
    for (i = 0; i < 3; i++) P.push([cx + Math.cos(rot + i * TAU / 3) * R, cy + Math.sin(rot + i * TAU / 3) * R]);
    g.globalAlpha = a;
    g.globalCompositeOperation = 'lighter';
    var fg = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
    fg.addColorStop(0, 'rgba(236,222,190,0.22)');
    fg.addColorStop(1, 'rgba(236,222,190,0)');
    g.fillStyle = fg;
    g.fillRect(cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8);
    for (var pass = 0; pass < 2; pass++) {
      g.lineWidth = Math.max(0.6, size * (pass ? 0.003 : 0.012));
      g.strokeStyle = pass ? 'rgba(255,244,222,0.55)' : 'rgba(' + BR + ',0.18)';
      g.beginPath();
      for (i = 0; i < 3; i++) {
        var p0 = P[i], p1 = P[(i + 1) % 3], ex = p1[0] - p0[0], ey = p1[1] - p0[1], len = Math.sqrt(ex * ex + ey * ey) || 1, nx = -ey / len, ny = ex / len;
        for (var j = 0; j <= 24; j++) {
          var u = j / 24, off = Math.sin(u * Math.PI * 3 + t * 4 + i) * Math.sin(u * Math.PI) * R * 0.06;
          var x = p0[0] + ex * u + nx * off, y = p0[1] + ey * u + ny * off;
          if (j === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
      }
      g.stroke();
    }
    for (i = 0; i < 3; i++) {
      glowDot(g, P[i][0], P[i][1], size * 0.03, cols[i]);
      var qr = size * 0.045, qg = g.createRadialGradient(P[i][0] - qr * 0.3, P[i][1] - qr * 0.3, qr * 0.1, P[i][0], P[i][1], qr);
      qg.addColorStop(0, 'rgba(255,255,255,0.9)');
      qg.addColorStop(0.4, 'rgba(' + cols[i] + ',0.9)');
      qg.addColorStop(1, 'rgba(' + cols[i] + ',0)');
      g.fillStyle = qg;
      g.beginPath(); g.arc(P[i][0], P[i][1], qr, 0, TAU); g.fill();
    }
  }

  function drawWorld(s, g, L, cx, cy, size, a, t) {
    var r = size * s.planetK;
    if (r < 0.4) return;
    g.globalAlpha = a;
    var halo = g.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.75);
    halo.addColorStop(0, 'rgba(240,226,196,0.34)');
    halo.addColorStop(0.3, 'rgba(' + BR + ',0.14)');
    halo.addColorStop(1, 'rgba(' + BR + ',0)');
    g.fillStyle = halo;
    g.beginPath(); g.arc(cx, cy, r * 1.75, 0, TAU); g.fill();
    g.save();
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
    var ri = L.urls.length ? resolveImg(s, L) : null;
    if (ri) {
      var img = ri.e.img, iw = img.naturalWidth, ih = img.naturalHeight, side = Math.min(iw, ih), slack = Math.max(iw, ih) - side;
      var off = slack * (0.5 + 0.42 * Math.sin(t * 0.045 + L.rot0));
      if (L.filter && CANVAS_FILTER) g.filter = L.filter;
      g.drawImage(img, iw >= ih ? off : 0, iw >= ih ? 0 : off, side, side, cx - r, cy - r, r * 2, r * 2);
      if (L.filter && CANVAS_FILTER) g.filter = 'none';
    } else {
      var hh = L.hue, pg = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      pg.addColorStop(0, 'hsl(' + hh + ',32%,48%)');
      pg.addColorStop(1, 'hsl(' + ((hh + 30) % 360) + ',38%,12%)');
      g.fillStyle = pg;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
      g.globalAlpha = a * 0.18;
      g.fillStyle = 'hsl(' + ((hh + 180) % 360) + ',30%,70%)';
      for (var b = 0; b < 6; b++) {
        var by = cy - r + (b + 0.5) * r / 3 + Math.sin(t * 0.2 + b) * r * 0.03;
        g.beginPath(); g.ellipse(cx, by, r * 1.1, r * 0.05 * (1 + (b % 3)), 0, 0, TAU); g.fill();
      }
      g.globalAlpha = a;
    }
    var sh = g.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.05, cx, cy, r * 1.02);
    sh.addColorStop(0, 'rgba(255,244,222,0.16)');
    sh.addColorStop(0.5, 'rgba(0,0,0,0)');
    sh.addColorStop(0.82, 'rgba(0,0,0,0.42)');
    sh.addColorStop(1, 'rgba(0,0,0,0.86)');
    g.fillStyle = sh;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
    g.lineWidth = Math.max(1, r * 0.014);
    g.strokeStyle = 'rgba(236,222,190,0.5)';
    g.beginPath(); g.arc(cx, cy, r, Math.PI * 0.95, Math.PI * 1.75); g.stroke();
    g.lineWidth = Math.max(0.6, r * 0.005);
    g.strokeStyle = 'rgba(' + BR + ',0.35)';
    g.beginPath(); g.arc(cx, cy, r * 1.07, 0, TAU); g.stroke();
    drawBadge(g, L, cx + r * 0.7, cy + r * 0.7, r * 0.21, a);
  }
  function drawBadge(g, L, x, y, br, a) {
    if (!(br >= 3)) return;
    var e = L.badge ? IMG[L.badge] : null;
    g.globalAlpha = a;
    g.fillStyle = '#0b0a08';
    g.beginPath(); g.arc(x, y, br * 1.14, 0, TAU); g.fill();
    g.save();
    g.beginPath(); g.arc(x, y, br, 0, TAU); g.clip();
    if (e && e.state === 'ok') {
      var im = e.img, sd = Math.min(im.naturalWidth, im.naturalHeight);
      g.drawImage(im, (im.naturalWidth - sd) / 2, (im.naturalHeight - sd) / 2, sd, sd, x - br, y - br, br * 2, br * 2);
    } else {
      var gr = g.createRadialGradient(x - br * 0.3, y - br * 0.3, 0, x, y, br);
      gr.addColorStop(0, 'rgba(' + BR + ',0.55)');
      gr.addColorStop(1, 'rgba(20,18,14,1)');
      g.fillStyle = gr;
      g.fillRect(x - br, y - br, br * 2, br * 2);
      if (L.aiName && br > 8) {
        g.fillStyle = 'rgba(' + INK + ',0.9)';
        g.font = '300 ' + Math.round(br * 0.8) + 'px Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(L.aiName.charAt(0).toUpperCase(), x, y + br * 0.04);
      }
    }
    g.restore();
    g.strokeStyle = 'rgb(' + BR + ')';
    g.lineWidth = Math.max(1, br * 0.06);
    g.beginPath(); g.arc(x, y, br * 1.07, 0, TAU); g.stroke();
    if (L.aiName && br > 15) {
      g.font = '600 ' + Math.round(clamp(br * 0.3, 8, 15)) + 'px "JetBrains Mono", Menlo, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.fillStyle = 'rgba(' + BR + ',0.95)';
      g.fillText(L.aiName.toUpperCase(), x, y + br * 1.3);
    }
  }

  var PAINT = {
    image: drawImageLayer, galaxy: drawGalaxy, group: drawGroup, star: drawStar, object: drawObject,
    atom: drawAtom, nucleus: drawNucleus, quarks: drawQuarks, world: drawWorld
  };

  // ------------------------------------------------------------------ frame rendering
  function makeStars(n, seed) {
    var R = rng(seed), out = [];
    for (var i = 0; i < n; i++) {
      var a = R() * TAU;
      out.push({ c: Math.cos(a), s: Math.sin(a), u: R(), m: 0.25 + R() * 0.75, tw: 0.6 + R() * 2.2, p: R() * TAU });
    }
    return out;
  }
  function blob(g, x, y, r, col) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function drawBackdrop(s, g) {
    var w = s.w, h = s.h, t = s.clock, R = s.diag * 0.6;
    g.fillStyle = '#050505';
    g.fillRect(0, 0, w, h);
    blob(g, s.cx + Math.cos(t * 0.05) * w * 0.18, s.cy + Math.sin(t * 0.07) * h * 0.12, R, 'rgba(' + BR + ',0.075)');
    blob(g, s.cx - Math.cos(t * 0.04 + 1) * w * 0.25, s.cy + Math.sin(t * 0.06 + 2) * h * 0.2, R * 0.8, 'rgba(70,92,140,0.07)');
    // Warp starfield in log-polar space: stars stream outward as you zoom in, inward as you zoom out.
    var st = s.stars, cx = s.cx, cy = s.cy, rMin = 2, rMax = s.diag * 0.6, LR = Math.log(rMax / rMin);
    var shift = s.zc * 0.45, v = s.vz, av = Math.abs(v), streak = av > 0.25 && !s.reduced;
    var lv = s.reduced ? 0 : s.vxl, lat = Math.abs(lv) > 0.2, lx = -s.xc * w * 0.9;
    g.fillStyle = 'rgb(' + INK + ')';
    g.strokeStyle = 'rgb(' + INK + ')';
    g.lineCap = 'round';
    for (var i = 0; i < st.length; i++) {
      var o = st[i], ph = o.u + shift;
      ph -= Math.floor(ph);
      var al = o.m * sstep(0, 0.22, ph) * (1 - sstep(0.88, 1, ph)) * (0.7 + 0.3 * Math.sin(t * o.tw + o.p));
      if (al < 0.02) continue;
      var r = rMin * Math.exp(LR * ph), x = cx + o.c * r, y = cy + o.s * r, sz = 0.6 + o.m * 1.5 * (0.4 + ph);
      if (s.xc) { x = ((x + lx * (0.4 + o.m)) % w + w) % w; }      // parallax drift through ACROSS steps
      g.globalAlpha = al;
      if (lat) {                                                  // sideways: horizontal streaks
        var dl = clamp(lv * w * 0.06 * (0.4 + o.m), -w * 0.3, w * 0.3);
        g.lineWidth = sz;
        g.beginPath(); g.moveTo(x + dl, y); g.lineTo(x, y); g.stroke();
      } else if (streak) {                                        // in: stream outward, out: stream inward
        var dr = Math.min(r * 0.8, r * LR * 0.45 * av * 0.06) * (v > 0 ? 1 : -1);
        g.lineWidth = sz;
        g.beginPath(); g.moveTo(x - o.c * dr, y - o.s * dr); g.lineTo(x, y); g.stroke();
      } else {
        g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
    }
    g.globalAlpha = 1;
  }
  function seam(s, g, x, k) {
    if (k < 0.02) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    var hw = 40 + 140 * k, gr = g.createLinearGradient(x - hw, 0, x + hw, 0);
    gr.addColorStop(0, 'rgba(' + BR + ',0)');
    gr.addColorStop(0.5, 'rgba(236,222,190,' + (0.32 * k).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(' + BR + ',0)');
    g.fillStyle = gr;
    g.fillRect(x - hw, 0, hw * 2, s.h);
    g.fillStyle = 'rgba(255,246,228,' + (0.75 * k).toFixed(3) + ')';
    g.fillRect(x - 0.75, 0, 1.5, s.h);
    g.restore();
  }
  function glint(s, g, cx, cy, size, k) {
    var r = clamp(size * 0.35, 5, s.minDim * 0.2);
    g.save();
    g.globalCompositeOperation = 'lighter';
    var gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, 'rgba(255,248,232,' + (0.85 * k).toFixed(3) + ')');
    gr.addColorStop(0.2, 'rgba(232,210,160,' + (0.32 * k).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(' + BR + ',0)');
    g.fillStyle = gr;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    spikes(g, cx, cy, r * 1.6, 0.5 * k);
    g.restore();
  }
  function drawScope(s, g) {
    var R = s.scopeR, cx = s.cx, cy = s.cy, rot = -s.pos * 0.32, i;
    g.save();
    g.globalAlpha = 1;
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(' + BR + ',0.16)';
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    g.beginPath();
    for (i = 0; i < 120; i++) {
      var a = rot + i * TAU / 120, l = i % 10 === 0 ? 9 : 4, ca = Math.cos(a), sa = Math.sin(a);
      g.moveTo(cx + ca * R, cy + sa * R);
      g.lineTo(cx + ca * (R - l), cy + sa * (R - l));
    }
    g.stroke();
    var gap = s.rs * 0.5 + 10, ext = R + 28;
    g.strokeStyle = 'rgba(' + INK + ',0.09)';
    g.beginPath();
    if (gap < ext) {
      g.moveTo(cx - ext, cy); g.lineTo(cx - gap, cy);
      g.moveTo(cx + gap, cy); g.lineTo(cx + ext, cy);
      g.moveTo(cx, cy - ext); g.lineTo(cx, cy - gap);
    }
    if (gap + 40 < ext) { g.moveTo(cx, cy + gap + 40); g.lineTo(cx, cy + ext); }
    g.stroke();
    g.restore();
  }

  function render(s) {
    var g = s.g;
    if (!g || s.w < 2 || s.h < 2) return;
    g.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    drawBackdrop(s, g);
    var pos = s.pos, cx = s.cx, cy = s.cy, t = s.clock, k, vis = [];
    // Across segments: both realms dip slightly while they slide past each other.
    var across = s.seg === 'across' ? s.segF : 0, breathe = across ? 1 - 0.1 * Math.sin(Math.PI * across) : 1;
    var k0 = Math.max(0, Math.floor(pos) - 2), k1 = Math.min(s.last, Math.floor(pos) + 3);
    for (k = k0; k <= k1; k++) {
      var w = idxW(s, k, pos);
      if (w <= 0.003) continue;
      var L = s.L[k], d = s.zc - L.z, lx = L.x - s.xc;
      if (d > 1.02 || d < -1.95 || Math.abs(lx) >= 1) continue;
      // Larger layer swells past the screen and fades; smaller layer grows out of a bright point.
      var az = d >= 0 ? 1 - sstep(0.28, 1.0, d) : sstep(-1.95, -0.85, d);
      var wx = w * (1 - sstep(0.15, 0.95, Math.abs(lx)));
      vis.push({ L: L, d: d, lx: lx, a: az * wx, w: wx });
    }
    vis.sort(function (m, n) { return (m.L.z - n.L.z) || (Math.abs(n.lx) - Math.abs(m.lx)); });
    for (k = 0; k < vis.length; k++) {
      var v = vis[k], size = s.Dm * Math.exp(v.d * LNZ) * breathe, x = cx + v.lx * s.w * 0.75;
      if (v.a > 0.004 && size > 0.6) {
        g.save();
        try { PAINT[v.L.draw](s, g, v.L, x, cy, size, v.a, t); }
        finally { g.restore(); }
      }
      if (v.d < -0.3) {
        var gi = sstep(-1.95, -1.55, v.d) * (1 - sstep(-1.2, -0.6, v.d)) * 0.7 * v.w;
        if (gi > 0.02) glint(s, g, x, cy, size, gi);
      }
    }
    if (across) seam(s, g, cx + (s.L[s.segI + 1].x - 0.5 - s.xc) * s.w * 0.75, Math.sin(Math.PI * across));
    // Warm the next sprites ahead of the zoom (budgeted: one big build per frame).
    for (k = Math.max(0, Math.floor(pos)); k <= Math.min(s.last, Math.floor(pos) + 4) && s.budget > 0; k++) {
      if (s.L[k].draw === 'image') spriteFor(s, s.L[k]);
      else if (s.L[k].urls.length) resolveImg(s, s.L[k]);
    }
    if (s.needGal && !s.gal && s.budget > 0) { s.budget--; galaxy(s); }
    drawScope(s, g);
  }

  // Which layers may share the frame at position p. Adjacent steps always may; a step two away only
  // when it nests inside the chain (a dot inside a dot). At a turn (out then in, or in then out) the
  // two steps on either side sit at the same scale, so they cross-fade through the turn instead.
  function isTurn(s, t) {
    if (t <= 0 || t >= s.last) return false;
    var a = s.L[t].dir, b = s.L[t + 1].dir;
    return (a === 'out' && b === 'in') || (a === 'in' && b === 'out');
  }
  function idxW(s, j, p) {
    var L = s.L;
    if (p >= j - 1 && p <= j + 1) {
      var w = 1;
      if (p < j && isTurn(s, j - 1)) w *= sstep(j - 1, j - 0.55, p);
      if (p > j && isTurn(s, j + 1)) w *= 1 - sstep(j + 0.55, j + 1, p);
      return w;
    }
    if (p < j - 1) {
      if (p < j - 2 || j < 2) return 0;
      return L[j].dir === 'in' && (L[j - 1].dir === 'in' || L[j - 1].dir === 'across') ? 1 : 0;
    }
    if (p > j + 2 || j + 2 > s.last) return 0;
    return L[j + 1].dir === 'out' && (L[j + 2].dir === 'out' || L[j + 2].dir === 'across') ? 1 : 0;
  }
  function camera(s) {
    var p = s.pos, i = s.last > 0 ? clamp(Math.floor(p), 0, s.last - 1) : 0, f = s.last > 0 ? clamp(p - i, 0, 1) : 0;
    var A = s.L[i], B = s.L[Math.min(s.last, i + 1)];
    s.segI = i;
    s.segF = f;
    s.seg = s.last > 0 ? B.dir : 'in';
    s.zc = lerp(A.z, B.z, f);
    s.xc = lerp(A.x, B.x, f);
  }

  // ------------------------------------------------------------------ motion
  // One ease over the whole route (slow at the start and on arrival, fast in the middle), with a
  // gentle dwell on each step so the names can be read; the total is clamped to 7-10 s.
  function autoPos(s) {
    var u = s.autoMs / s.total;
    if (u >= 1) return -1;
    var e = u * u * u * (u * (u * 6 - 15) + 10), p = e * s.last, i = Math.floor(p), f = p - i;
    return Math.min(s.last, i + f - DWELL * 0.35 * Math.sin(TAU * f) / TAU);
  }
  function ready(s) {
    var n = 0;
    for (var k = 0; k < s.N && n < 2; k++) {
      var u = s.L[k].urls[0];
      if (!u) continue;
      n++;
      if (IMG[u] && IMG[u].state === 'loading') return false;
    }
    return true;
  }
  function update(s, dt) {
    var prev = s.pos;
    if (s.mode === 'auto') {
      if (!s.started) {
        s.lead += dt;
        if ((s.lead > 0.5 && ready(s)) || s.lead > 1.6) s.started = true;
      } else {
        s.autoMs += dt * 1000;
        var p = autoPos(s);
        if (p < 0) finish(s); else s.pos = s.target = p;
      }
    } else if (s.mode === 'rush') {
      var f = clamp((s.clock - s.rush.t0) / s.rush.dur, 0, 1);
      var e = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
      s.pos = s.target = lerp(s.rush.from, s.last, e);
      if (f >= 1) finish(s);
    } else if (s.tw) {
      var tf = clamp((s.clock - s.tw.t0) / s.tw.dur, 0, 1), te = tf < 0.5 ? 4 * tf * tf * tf : 1 - Math.pow(-2 * tf + 2, 3) / 2;
      s.pos = lerp(s.tw.from, s.tw.to, te);
      if (tf >= 1) { s.pos = s.target = s.tw.to; s.tw = null; }
    } else if (s.ptr == null && !s.sliding && !s.pinch) {
      if (s.inertia) {
        s.pos += s.inertia * dt;
        s.inertia *= Math.exp(-dt / 0.33);
        if (s.pos <= 0 || s.pos >= s.last) { s.pos = clamp(s.pos, 0, s.last); s.inertia = 0; s.target = Math.round(s.pos); }
        else if (Math.abs(s.inertia) < 0.35) { s.inertia = 0; s.target = Math.round(s.pos); }
        else s.target = s.pos;
      } else {
        s.pos += (s.target - s.pos) * (1 - Math.exp(-dt / 0.14));
        if (Math.abs(s.target - s.pos) < 0.0004) s.pos = s.target;
      }
    }
    s.pos = clamp(s.pos, 0, s.last);
    var pz = s.zc, px = s.xc, k = 1 - Math.exp(-dt / 0.09);
    camera(s);
    if (dt > 0 && prev != null) {
      s.vz += ((s.zc - pz) / dt - s.vz) * k;
      s.vxl += ((s.xc - px) / dt - s.vxl) * k;
    }
  }
  function finish(s) {
    s.mode = 'free';
    s.pos = s.target = s.last;
    s.inertia = 0;
    var ms = Number(s.opts.autoEnterMs);
    if (ms > 0 && !s.enterT) s.enterT = W.setTimeout(function () { if (S === s) enter(); }, ms);
  }
  function grab(s) {
    if (s.mode !== 'free') { s.mode = 'free'; s.target = s.pos; }
    s.inertia = 0;
    s.sliding = false;
    s.tw = null;
    if (s.enterT) { W.clearTimeout(s.enterT); s.enterT = 0; }
  }
  function skip(s) {
    if (s.mode !== 'auto') return;
    s.mode = 'rush';
    s.rush = { t0: s.clock, from: s.pos, dur: clamp(0.3 + (s.last - s.pos) * 0.04, 0.35, 0.95) };
  }
  function tweenTo(s, k) {
    var base = s.tw ? s.tw.to : Math.abs(s.target - s.pos) > 0.02 ? s.target : s.pos;
    grab(s);
    k = clamp(k, 0, s.last);
    var dist = Math.abs(k - s.pos);
    s.target = k;
    if (dist > 0.0005) s.tw = { from: s.pos, to: k, t0: s.clock, dur: clamp(0.45 + Math.sqrt(dist) * 0.32, 0.45, 1.8) };
    return base;
  }
  function nudge(s, dir) {
    var base = s.tw ? s.tw.to : Math.abs(s.target - s.pos) > 0.02 ? s.target : s.pos;
    tweenTo(s, dir > 0 ? Math.min(s.last, Math.floor(base + 0.02) + 1) : Math.max(0, Math.ceil(base - 0.02) - 1));
  }
  function seek(s, k) {
    tweenTo(s, clamp(Math.round(Number(k) || 0), 0, s.last));
  }

  // ------------------------------------------------------------------ HUD
  function setStep(s, i) {
    var L = s.L[i], u = s.ui, k;
    s.hudIdx = i;
    var dd = s.journey && DIRS[L.dir] ? DIRS[L.dir].g + ' ' + DIRS[L.dir].w + '  ·  ' : '';
    u.lbl.textContent = pad2(i + 1) + ' / ' + pad2(s.N) + '  ·  ' + dd + L.label;
    u.name.textContent = L.name;
    u.note.textContent = L.note;
    u.note.style.display = L.note ? '' : 'none';
    u.title.classList.remove('cz-swap');
    void u.title.offsetWidth;                 // restart the text rise animation
    u.title.classList.add('cz-swap');
    for (k = 0; k < u.crumbs.length; k++) u.crumbs[k].className = 'k' + (k < i ? ' past' : k === i ? ' on' : '');
  }
  function scaleText(s, pos) {
    var i = clamp(Math.floor(pos), 0, s.last), j = Math.min(s.last, i + 1), f = pos - i, a = s.L[i], b = s.L[j];
    if (i !== j && f > 0.02 && f < 0.98 && a.sc && b.sc && a.sc.unit === b.sc.unit && a.sc.pre === b.sc.pre) {
      return a.sc.pre + '10' + supNum(Math.round(lerp(a.sc.e, b.sc.e, f))) + (a.sc.unit ? ' ' + a.sc.unit : '');
    }
    return s.L[clamp(Math.round(pos), 0, s.last)].scale || '—';
  }
  function hud(s) {
    var u = s.ui, pos = s.pos, i = clamp(Math.round(pos), 0, s.last), k;
    if (i !== s.hudIdx) setStep(s, i);
    var i0 = clamp(Math.floor(pos), 0, s.last), i1 = Math.min(s.last, i0 + 1);
    // journey: one rung per step; path: the 19-tier ladder
    var rf = s.journey ? pos : lerp(s.rungOf[i0], s.rungOf[i1], pos - i0), ri = s.journey ? i : s.rungOf[i];
    if (Math.abs(rf - s.rf) > 0.002) { s.rf = rf; u.ladder.style.setProperty('--r', rf.toFixed(3)); }
    if (ri !== s.rung) {
      s.rung = ri;
      for (k = 0; k < u.rungs.length; k++) u.rungs[k].classList.toggle('cur', k === ri);
    }
    var moving = s.journey && s.last > 0 ? (s.segF > 0.04 && s.segF < 0.96 ? s.seg : '') : '';
    if (moving !== s.movCls) {
      if (s.movCls) s.root.classList.remove('cz-mv-' + s.movCls);
      if (moving) s.root.classList.add('cz-mv-' + moving);
      s.movCls = moving;
    }
    var tag = !s.journey ? 'YOU ARE HERE' : pos > s.last - 0.4 ? 'YOU HAVE ARRIVED' : pos < 0.35 ? 'YOU ARE HERE'
      : s.seg === 'out' ? '▲ ZOOMING OUT' : s.seg === 'across' ? '⇄ CROSSING OVER' : '▼ ZOOMING IN';
    if (tag !== s.tag) { s.tag = tag; u.tag.textContent = tag; }
    var st = scaleText(s, pos);
    if (st !== s.scaleTxt) { s.scaleTxt = st; u.stxt.textContent = st; }
    var end = pos > s.last - 0.4;
    if (end !== s.endOn) { s.endOn = end; s.root.classList.toggle('cz-end', end); }
    if (!s.sliding && Math.abs(Number(u.rng.value) - pos) > 0.0005) u.rng.value = pos.toFixed(3);
    var pct = s.last > 0 ? pos / s.last * 100 : 100;
    if (Math.abs(pct - s.pct) > 0.05) { s.pct = pct; u.rng.style.setProperty('--p', pct.toFixed(2) + '%'); }
    var hint = s.mode === 'free' ? (s.coarse ? 'DRAG ↕ TO ZOOM' : 'SCROLL · DRAG · ← →') : 'TAP TO SKIP';
    if (hint !== s.hint) { s.hint = hint; u.hint.textContent = hint; }
    // The reticle frames whatever is emerging; on the final world it opens up to frame the planet.
    var rs = s.rsBase;
    var LW = s.L[s.last];
    if (LW.draw === 'world' && pos > s.last - 1.5) rs = Math.max(rs, 2.36 * s.Dm * Math.exp(clamp(s.zc - LW.z, -3, 1) * LNZ) * s.planetK);
    if (Math.abs(rs - s.rs) > 0.5 || s.retDirty) {
      s.rs = rs;
      s.retDirty = false;
      var rst = u.ret.style;
      rst.width = rst.height = rs.toFixed(1) + 'px';
      rst.transform = 'translate3d(' + (s.cx - rs / 2).toFixed(1) + 'px,' + (s.cy - rs / 2).toFixed(1) + 'px,0)';
    }
  }

  function resize(s) {
    if (s.dead) return;
    var r = s.root.getBoundingClientRect ? s.root.getBoundingClientRect() : null;
    var w = Math.max(1, Math.round((r && r.width) || W.innerWidth || 1)), h = Math.max(1, Math.round((r && r.height) || W.innerHeight || 1));
    var dpr = Math.min(2, Math.max(1, W.devicePixelRatio || 1));
    if (w === s.w && h === s.h && dpr === s.dpr) return;
    s.w = w; s.h = h; s.dpr = dpr;
    s.cv.width = Math.round(w * dpr);
    s.cv.height = Math.round(h * dpr);
    s.minDim = Math.min(w, h);
    s.diag = Math.sqrt(w * w + h * h);
    var portrait = h > w * 1.05;
    s.cx = w * (portrait ? 0.5 : 0.53);
    s.cy = h * (portrait ? 0.41 : 0.5);
    s.Dm = Math.max(w, h) * 1.08;                      // layer diameter when it fills the frame
    s.planetK = Math.min(0.19, 0.34 * s.minDim / s.Dm);
    s.rsBase = clamp(s.Dm / ZF * 1.05, Math.min(86, s.minDim * 0.24), s.minDim * 0.24);
    s.scopeR = portrait ? Math.min(w * 0.45, h * 0.3) : Math.min(h * 0.42, w * 0.3);
    s.stepPx = clamp(h * 0.2, 110, 260);
    s.retDirty = true;
  }

  // ------------------------------------------------------------------ DOM
  var CSS = [
    '.cz-root{position:fixed;top:0;right:0;bottom:0;left:0;z-index:200;overflow:hidden;background:#050505;color:#ece6d6;opacity:0;transition:opacity .5s ease;outline:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:none;overscroll-behavior:contain;--ink:#ece6d6;--dim:rgba(236,230,214,.6);--faint:rgba(236,230,214,.2);--rule:rgba(236,230,214,.12);--brass:#b89b5e;--mono:"JetBrains Mono",Menlo,"SFMono-Regular",Consolas,ui-monospace,monospace;--sans:Inter,"Helvetica Neue",Helvetica,Arial,sans-serif;font-family:var(--sans);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}',
    '.cz-root *,.cz-root *::before,.cz-root *::after{box-sizing:border-box}',
    '.cz-root.cz-on{opacity:1}.cz-root.cz-bye{opacity:0;transition-duration:.28s}',
    '.cz-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block;cursor:grab;touch-action:none}.cz-cv:active{cursor:grabbing}',
    '.cz-vig{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;background:linear-gradient(180deg,rgba(5,5,5,.82) 0,rgba(5,5,5,.35) 14%,rgba(5,5,5,0) 27%),linear-gradient(0deg,rgba(5,5,5,.94) 0,rgba(5,5,5,.6) 26%,rgba(5,5,5,0) 48%),radial-gradient(ellipse 80% 70% at 50% 42%,rgba(0,0,0,0) 50%,rgba(0,0,0,.55) 100%)}',
    '.cz-ret{position:absolute;left:0;top:0;width:120px;height:120px;pointer-events:none;will-change:transform}',
    '.cz-ret i{position:absolute;width:18%;height:18%;min-width:10px;min-height:10px;max-width:26px;max-height:26px;border:0 solid var(--brass)}',
    '.cz-ret .a{left:0;top:0;border-left-width:1.5px;border-top-width:1.5px}.cz-ret .b{right:0;top:0;border-right-width:1.5px;border-top-width:1.5px}.cz-ret .c{left:0;bottom:0;border-left-width:1.5px;border-bottom-width:1.5px}.cz-ret .d{right:0;bottom:0;border-right-width:1.5px;border-bottom-width:1.5px}',
    '.cz-retl{position:absolute;left:50%;top:calc(100% + 11px);transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:7px;white-space:nowrap}',
    '.cz-retl b{font:500 clamp(9px,1.2vmin,13px)/1 var(--mono);letter-spacing:.34em;padding-left:.34em;color:var(--brass);text-shadow:0 0 12px #000}',
    '.cz-retl u{text-decoration:none;font:400 clamp(8.5px,1.05vmin,12px)/1 var(--mono);letter-spacing:.22em;padding-left:.22em;color:var(--dim);text-shadow:0 0 10px #000}',
    '.cz-hud{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;display:grid;padding:calc(env(safe-area-inset-top,0px) + 14px) calc(env(safe-area-inset-right,0px) + 16px) calc(env(safe-area-inset-bottom,0px) + 14px) calc(env(safe-area-inset-left,0px) + 16px);grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto minmax(0,1fr) auto auto auto auto;grid-template-areas:"top top" "title ladder" "view ladder" "scale scale" "epoch epoch" "crumbs crumbs" "ctl ctl";column-gap:14px}',
    '.cz-top{grid-area:top;display:flex;align-items:center;gap:12px;min-width:0;padding-bottom:12px;margin-bottom:16px;border-bottom:1px solid var(--rule);font:500 clamp(9px,1.12vmin,13px)/1 var(--mono);letter-spacing:.22em;text-transform:uppercase;color:var(--dim)}',
    '.cz-brand{display:flex;align-items:center;white-space:nowrap}.cz-brand b{color:var(--ink);font-weight:600}.cz-brand span{margin-left:.9em;padding-left:.9em;border-left:1px solid var(--faint)}',
    '.cz-tier{margin-left:auto;color:var(--brass);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.cz-tier em{font-style:normal;color:var(--dim);margin-left:.8em}',
    '.cz-title{grid-area:title;min-width:0;align-self:start}',
    '.cz-lbl{font:500 clamp(9.5px,1.3vmin,15px)/1.2 var(--mono);letter-spacing:.24em;color:var(--brass);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cz-name{margin:.34em 0 0;font:300 clamp(28px,6.6vmin,86px)/1.04 var(--sans);letter-spacing:-.025em;color:var(--ink);overflow-wrap:anywhere;text-shadow:0 2px 24px rgba(0,0,0,.6)}',
    '.cz-note{margin:.55em 0 0;font:400 clamp(13px,1.95vmin,22px)/1.4 var(--sans);color:var(--dim);max-width:30em;text-shadow:0 1px 14px rgba(0,0,0,.7)}',
    '.cz-swap .cz-lbl,.cz-swap .cz-name,.cz-swap .cz-note{animation:cz-rise .55s cubic-bezier(.2,.7,.2,1) both}.cz-swap .cz-name{animation-delay:.04s}.cz-swap .cz-note{animation-delay:.08s}',
    '@keyframes cz-rise{from{opacity:0;transform:translate3d(0,10px,0)}to{opacity:1;transform:none}}',
    '.cz-ladder{grid-area:ladder;position:relative;align-self:start;padding-left:16px;--rh:clamp(14px,2.6vmin,30px)}',
    '.cz-ladder::before{content:"";position:absolute;left:3px;top:calc(var(--rh) / 2);bottom:calc(var(--rh) / 2);width:1px;background:var(--rule)}',
    '.cz-mark{position:absolute;left:0;top:calc(var(--rh) / 2 - 3.5px);width:7px;height:7px;background:var(--brass);box-shadow:0 0 12px rgba(184,155,94,.9);transform:translateY(calc(var(--r,0) * var(--rh))) rotate(45deg)}',
    '.cz-rung{position:relative;display:flex;align-items:center;gap:.7em;height:var(--rh);font:500 clamp(8.5px,1.12vmin,13px)/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;color:rgba(236,230,214,.24);transition:color .35s ease}',
    '.cz-rung i{position:absolute;left:-13px;top:50%;width:5px;height:1px;background:currentColor;transition:width .35s,background-color .35s}',
    '.cz-rung .n{min-width:1.8em;opacity:.65}.cz-rung .s{font-style:normal;color:var(--brass)}',
    '.cz-rung.path{color:rgba(236,230,214,.58);pointer-events:auto;cursor:pointer}.cz-rung.path i{width:8px}.cz-rung.star .t{color:var(--brass)}',
    '.cz-rung.cur{color:var(--ink)}.cz-rung.cur i{width:12px;background:var(--brass)}',
    '.cz-rung .t{max-width:20ch;overflow:hidden;text-overflow:ellipsis}',
    '.cz-rung .g{width:1.1em;text-align:center;letter-spacing:0;font-size:.95em;color:rgba(236,230,214,.45)}',
    '.cz-rung.d-out .g{color:rgba(184,155,94,.75)}.cz-rung.d-across .g{color:rgba(150,210,205,.8)}.cz-rung.cur .g{color:var(--brass)}',
    '.cz-arr{grid-column:1/-1;color:var(--brass);font-weight:600;letter-spacing:.24em;text-transform:uppercase;padding-bottom:6px;margin-bottom:2px;border-bottom:1px solid var(--rule)}',
    '.cz-mv-across .cz-ret i{border-color:rgba(150,210,205,.9)}',
    '.cz-scale{grid-area:scale;display:flex;align-items:center;gap:12px;margin-top:14px;font:500 clamp(10px,1.3vmin,15px)/1 var(--mono);letter-spacing:.1em;color:var(--ink);white-space:nowrap}',
    '.cz-scale small{font-size:.78em;letter-spacing:.24em;color:var(--brass)}',
    '.cz-bar{position:relative;flex:none;width:clamp(56px,11vmin,150px);height:9px;border-left:1px solid var(--ink);border-right:1px solid var(--ink)}',
    '.cz-bar::before{content:"";position:absolute;left:0;right:0;top:4px;height:1px;background:var(--ink)}.cz-bar::after{content:"";position:absolute;left:50%;top:2px;height:5px;width:1px;background:var(--dim)}',
    '.cz-epoch{grid-area:epoch;margin:0;display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:16px;row-gap:6px;align-content:start;font:400 clamp(10px,1.3vmin,15px)/1.35 var(--mono);max-height:0;opacity:0;overflow:hidden;transform:translateY(6px);transition:max-height .7s ease,opacity .6s ease,transform .6s ease,padding .6s ease}',
    '.cz-end .cz-epoch{max-height:260px;opacity:1;transform:none;padding:12px 0 2px}',
    '.cz-epoch dt{color:var(--brass);font-size:.8em;letter-spacing:.2em;text-transform:uppercase;padding-top:.18em;white-space:nowrap}.cz-epoch dd{margin:0;color:var(--ink);min-width:0;overflow-wrap:anywhere}',
    '.cz-crumbs{grid-area:crumbs;margin-top:12px;font:400 clamp(9px,1.12vmin,13px)/1.75 var(--mono);letter-spacing:.05em;color:rgba(236,230,214,.36);min-width:0}',
    '.cz-crumbs .k{pointer-events:auto;cursor:pointer;white-space:nowrap;transition:color .3s}.cz-crumbs .k:hover{color:var(--ink)}.cz-crumbs .k.past{color:rgba(184,155,94,.85)}.cz-crumbs .k.on{color:var(--ink)}.cz-crumbs .sep{margin:0 .25em;color:rgba(236,230,214,.28)}',
    '.cz-ctl{grid-area:ctl;display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:14px;pointer-events:auto}',
    '.cz-btn{-webkit-appearance:none;appearance:none;margin:0;border:1px solid rgba(236,230,214,.24);border-radius:2px;background:rgba(10,10,10,.5);color:var(--ink);height:clamp(42px,5.4vmin,56px);padding:0 1.1em;font:500 clamp(10px,1.2vmin,13.5px)/1 var(--mono);letter-spacing:.16em;white-space:nowrap;cursor:pointer;touch-action:manipulation;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transition:border-color .2s,background-color .2s,color .2s}',
    '.cz-btn:hover{border-color:rgba(184,155,94,.75)}.cz-btn:active{background:rgba(184,155,94,.18)}.cz-btn:focus{outline:none}.cz-btn:focus-visible{outline:1px solid var(--brass);outline-offset:3px}.cz-btn:disabled{opacity:.3;cursor:default}',
    '.cz-x{pointer-events:auto;flex:none;height:32px;padding:0 .9em;font-size:inherit;letter-spacing:.18em}',
    '.cz-go{flex:1 0 100%;border-color:rgba(184,155,94,.85);color:var(--brass);background:rgba(184,155,94,.08);font-weight:600;letter-spacing:.22em}',
    '.cz-end .cz-go{background:var(--brass);color:#0b0a08;animation:cz-pulse 2.4s ease-out infinite}',
    '@keyframes cz-pulse{0%{box-shadow:0 0 0 0 rgba(184,155,94,.55)}70%{box-shadow:0 0 0 14px rgba(184,155,94,0)}100%{box-shadow:0 0 0 0 rgba(184,155,94,0)}}',
    '.cz-slide{position:relative;flex:1 1 120px;min-width:80px;height:44px}',
    '.cz-ticks{position:absolute;left:9px;right:9px;top:50%;height:0;pointer-events:none}.cz-ticks i{position:absolute;top:-5px;width:1px;height:10px;background:rgba(236,230,214,.28)}.cz-ticks i.w{background:var(--brass);height:14px;top:-7px}',
    '.cz-rng{-webkit-appearance:none;appearance:none;position:absolute;left:0;top:0;width:100%;height:100%;margin:0;padding:0;background:transparent;cursor:pointer;touch-action:none}.cz-rng:focus{outline:none}.cz-rng:disabled{opacity:.3}',
    '.cz-rng::-webkit-slider-runnable-track{height:2px;background:linear-gradient(90deg,var(--brass) 0,var(--brass) var(--p,0%),rgba(236,230,214,.22) var(--p,0%),rgba(236,230,214,.22) 100%)}',
    '.cz-rng::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;margin-top:-8px;border-radius:50%;background:#0b0a08;border:1.5px solid var(--brass);box-shadow:0 0 0 4px rgba(184,155,94,.15),0 0 14px rgba(184,155,94,.5)}',
    '.cz-rng:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 6px rgba(184,155,94,.35)}',
    '.cz-rng::-moz-range-track{height:2px;background:rgba(236,230,214,.22)}.cz-rng::-moz-range-progress{height:2px;background:var(--brass)}',
    '.cz-rng::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#0b0a08;border:1.5px solid var(--brass);box-shadow:0 0 14px rgba(184,155,94,.5)}',
    '@media (max-width:600px){.cz-tier em,.cz-rung .n{display:none}.cz-btn{padding:0 .85em}.cz-rung .t{max-width:11ch}}',
    '@media (max-width:360px){.cz-brand span{display:none}}',
    '@media (orientation:landscape) and (min-height:521px){',
    '.cz-vig{background:linear-gradient(180deg,rgba(5,5,5,.75) 0,rgba(5,5,5,0) 18%),linear-gradient(0deg,rgba(5,5,5,.9) 0,rgba(5,5,5,.4) 22%,rgba(5,5,5,0) 40%),linear-gradient(90deg,rgba(5,5,5,.72) 0,rgba(5,5,5,0) 38%),linear-gradient(270deg,rgba(5,5,5,.6) 0,rgba(5,5,5,0) 22%),radial-gradient(ellipse 70% 80% at 53% 50%,rgba(0,0,0,0) 52%,rgba(0,0,0,.5) 100%)}',
    '.cz-hud{padding:calc(env(safe-area-inset-top,0px) + 3.2vmin) calc(env(safe-area-inset-right,0px) + 3.6vmin) calc(env(safe-area-inset-bottom,0px) + 3.2vmin) calc(env(safe-area-inset-left,0px) + 3.6vmin);grid-template-rows:auto auto minmax(0,1fr) auto auto auto;grid-template-areas:"top top" "epoch ladder" "view ladder" "title ladder" "scale ladder" "crumbs ctl";column-gap:4vmin}',
    '.cz-top{margin-bottom:2.4vmin}.cz-ladder{align-self:center}.cz-title{align-self:end;max-width:42vw}',
    '.cz-epoch{max-width:40vw;border-left:1px solid var(--brass)}.cz-end .cz-epoch{padding:4px 0 4px 18px}',
    '.cz-crumbs{align-self:end;max-width:62vw}.cz-ctl{align-self:end;justify-content:flex-end;flex-wrap:nowrap}.cz-slide{flex:0 1 22vw}.cz-go{flex:0 0 auto;min-width:12em}}',
    '@media (orientation:landscape) and (max-height:520px){',
    '.cz-hud{padding:calc(env(safe-area-inset-top,0px) + 10px) calc(env(safe-area-inset-right,0px) + 14px) calc(env(safe-area-inset-bottom,0px) + 10px) calc(env(safe-area-inset-left,0px) + 14px);grid-template-rows:auto auto auto minmax(0,1fr) auto auto;grid-template-areas:"top top" "title ladder" "epoch ladder" "view ladder" "scale ladder" "ctl ctl"}',
    '.cz-top{margin-bottom:8px;padding-bottom:8px}.cz-crumbs,.cz-note{display:none}.cz-name{font-size:24px}',
    '.cz-ladder{--rh:clamp(9px,calc((100vh - 150px) / 19),16px)}.cz-rung .t,.cz-rung .n{display:none}.cz-rung.cur .t,.cz-rung.star .t{display:inline}',
    '.cz-go{flex:0 0 auto}.cz-btn{height:38px}}',
    '@media (prefers-reduced-motion:reduce){.cz-swap .cz-lbl,.cz-swap .cz-name,.cz-swap .cz-note,.cz-end .cz-go{animation:none}}'
  ].join('\n');

  function injectCss() {
    if (D.getElementById('cz-style')) return;
    var st = D.createElement('style');
    st.id = 'cz-style';
    st.textContent = CSS;
    (D.head || D.documentElement).appendChild(st);
  }
  function ensureFonts() {
    if (D.getElementById('cz-fonts')) return;
    var l = D.createElement('link');
    l.id = 'cz-fonts';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap';
    (D.head || D.documentElement).appendChild(l);
  }

  function buildDom(s) {
    var c = s.cosmos, u = {}, k;
    var root = el('div', 'cz-root');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Cosmic address' + (s.worldName ? ' of ' + s.worldName : ''));
    root.tabIndex = -1;
    var cv = el('canvas', 'cz-cv', root);
    cv.setAttribute('aria-hidden', 'true');
    el('div', 'cz-vig', root);
    u.ret = el('div', 'cz-ret', root);
    u.ret.setAttribute('aria-hidden', 'true');
    ['a', 'b', 'c', 'd'].forEach(function (q) { el('i', q, u.ret); });
    var rl = el('span', 'cz-retl', u.ret);
    u.tag = el('b', '', rl, 'YOU ARE HERE');
    u.hint = el('u', '', rl, '');

    var hud = el('div', 'cz-hud', root);
    var top = el('header', 'cz-top', hud);
    var brand = el('div', 'cz-brand', top);
    el('b', '', brand, 'Aftermath');
    el('span', '', brand, s.journey ? 'Journey' : 'Cosmic address');
    var tierName = str(c.tier) || (s.worldTier >= 0 ? LADDER[s.worldTier][1] : '');
    var tier = el('div', 'cz-tier', top, s.journey ? s.L[0].name + ' → ' + s.worldName : tierName ? '★ ' + tierName : '');
    var tnote = s.journey ? (tierName ? '★ ' + tierName : '') : str(c.tierNote) || (s.worldTier >= 0 ? LADDER[s.worldTier][2] : '');
    if (tnote) el('em', '', tier, tnote);
    u.close = el('button', 'cz-btn cz-x', top, 'ESC ✕');
    u.close.type = 'button';
    u.close.setAttribute('aria-label', 'Close');

    u.title = el('section', 'cz-title', hud);
    u.lbl = el('div', 'cz-lbl', u.title);
    u.name = el('h2', 'cz-name', u.title);
    u.note = el('p', 'cz-note', u.title);

    u.ladder = el('div', 'cz-ladder', hud);
    u.ladder.setAttribute('role', 'list');
    u.ladder.setAttribute('aria-label', s.journey ? 'Journey' : 'Tier ladder');
    el('span', 'cz-mark', u.ladder);
    u.rungs = [];
    var rg;
    if (s.journey) {
      for (k = 0; k < s.N; k++) {
        var Lk = s.L[k];
        rg = el('div', 'cz-rung path d-' + Lk.dir + (k === s.last ? ' star' : ''), u.ladder);
        rg.setAttribute('role', 'listitem');
        rg.setAttribute('data-k', String(k));
        rg.title = (DIRS[Lk.dir] ? DIRS[Lk.dir].w + ' · ' : '') + Lk.name;
        el('i', '', rg);
        el('span', 'g', rg, DIRS[Lk.dir] ? DIRS[Lk.dir].g : '·');
        el('span', 't', rg, Lk.name);
        if (k === s.last) el('em', 's', rg, '★');
        u.rungs.push(rg);
      }
    } else {
      for (k = 0; k < LADDER.length; k++) {
        rg = el('div', 'cz-rung' + (s.pathTiers[k] ? ' path' : '') + (k === s.worldTier ? ' star' : ''), u.ladder);
        rg.setAttribute('role', 'listitem');
        rg.setAttribute('data-t', String(k));
        el('i', '', rg);
        el('span', 'n', rg, pad2(k));
        el('span', 't', rg, LADDER[k][1]);
        if (k === s.worldTier) el('em', 's', rg, '★');
        u.rungs.push(rg);
      }
    }

    var sc = el('div', 'cz-scale', hud);
    el('small', '', sc, 'SCALE');
    el('span', 'cz-bar', sc);
    u.stxt = el('span', 'cz-stxt', sc);

    var ep = el('dl', 'cz-epoch', hud), rows = [['Epoch', c.epoch], ['Cosmic time', c.cosmicTime], ['Since extinction', c.sinceExtinction], ['Coordinates', c.coords]];
    el('div', 'cz-arr', ep, 'You have arrived · ' + s.worldName);
    for (k = 0; k < rows.length; k++) {
      var v = str(rows[k][1]).trim();
      if (!v) continue;
      el('dt', '', ep, rows[k][0]);
      el('dd', '', ep, v);
    }

    var cr = el('nav', 'cz-crumbs', hud);
    cr.setAttribute('aria-label', 'Cosmic address breadcrumb');
    u.crumbs = [];
    for (k = 0; k < s.N; k++) {
      if (k) { cr.appendChild(D.createTextNode(' ')); el('span', 'sep', cr, '▸'); cr.appendChild(D.createTextNode(' ')); }
      var ck = el('span', 'k', cr, s.L[k].name);
      ck.setAttribute('data-k', String(k));
      u.crumbs.push(ck);
    }

    var ctl = el('div', 'cz-ctl', hud);
    u.out = el('button', 'cz-btn cz-zo', ctl, s.journey ? '‹ BACK' : '− ZOOM OUT');
    var sl = el('div', 'cz-slide', ctl), tk = el('div', 'cz-ticks', sl);
    for (k = 0; k < s.N; k++) {
      var tick = el('i', k === s.last ? 'w' : '', tk);
      tick.style.left = (s.last > 0 ? k / s.last * 100 : 100).toFixed(3) + '%';
    }
    u.rng = el('input', 'cz-rng', sl);
    u.rng.type = 'range';
    u.rng.min = '0';
    u.rng.max = String(Math.max(1, s.last));
    u.rng.step = '0.001';
    u.rng.value = String(s.pos);
    u.rng.setAttribute('aria-label', 'Zoom depth');
    u.in = el('button', 'cz-btn cz-zi', ctl, s.journey ? 'NEXT ›' : 'ZOOM IN +');
    u.go = el('button', 'cz-btn cz-go', ctl, s.enterLabel);
    u.out.type = u.in.type = u.go.type = 'button';
    if (s.last < 1) { u.out.disabled = u.in.disabled = u.rng.disabled = true; }

    s.root = root;
    s.cv = cv;
    s.ui = u;
  }

  // ------------------------------------------------------------------ input
  function on(s, target, type, fn, opt) {
    target.addEventListener(type, fn, opt || false);
    s.off.push(function () { target.removeEventListener(type, fn, opt || false); });
  }
  function pinchDist(s) {
    var ids = Object.keys(s.ptrs);
    if (ids.length < 2) return 0;
    var a = s.ptrs[ids[0]], b = s.ptrs[ids[1]], dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function onDown(s, e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    s.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { s.cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (e.cancelable) e.preventDefault();
    if (Object.keys(s.ptrs).length >= 2) {            // second finger: pinch replaces the drag
      grab(s);
      s.ptr = null;
      s.dn = null;
      s.pinch = { d: pinchDist(s) || 1 };
      return;
    }
    if (s.ptr != null || s.pinch) return;
    s.ptr = e.pointerId;
    s.sliding = false;
    s.inertia = 0;
    var t = nowMs();
    s.dn = { x: e.clientX, y: e.clientY, t: t, pos: s.pos, moved: false, axis: 'y' };
    s.smp = [[t, s.pos]];
  }
  function onMove(s, e) {
    if (s.ptrs[e.pointerId]) { s.ptrs[e.pointerId].x = e.clientX; s.ptrs[e.pointerId].y = e.clientY; }
    if (s.pinch) {
      // Pinch is a real zoom: spread = deeper, squeeze = wider, following the current segment's direction.
      var nd = pinchDist(s);
      if (nd > 0 && s.pinch.d > 0) {
        var dz = Math.log(nd / s.pinch.d) / LNZ * 1.6, i = s.last > 0 ? clamp(Math.floor(s.pos), 0, s.last - 1) : 0;
        var sz = s.last > 0 ? s.L[i + 1].z - s.L[i].z : 0;
        s.pos = s.target = clamp(s.pos + dz * (sz || 1), 0, s.last);
        s.pinch.d = nd;
      }
      return;
    }
    if (e.pointerId !== s.ptr || !s.dn) return;
    var dn = s.dn, dx = e.clientX - dn.x, dy = e.clientY - dn.y;
    if (!dn.moved) {
      if (dx * dx + dy * dy < 64) return;
      dn.moved = true;
      dn.axis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x';
      grab(s);
      dn.pos = s.pos; dn.x = e.clientX; dn.y = e.clientY; dx = dy = 0;
    }
    var delta = dn.axis === 'y' ? -dy : -dx;           // drag up (or left) = zoom in
    s.pos = s.target = clamp(dn.pos + delta / s.stepPx, 0, s.last);
    var t = nowMs();
    s.smp.push([t, s.pos]);
    while (s.smp.length > 2 && t - s.smp[0][0] > 120) s.smp.shift();
  }
  function onUp(s, e, cancelled) {
    delete s.ptrs[e.pointerId];
    if (s.pinch) {
      if (Object.keys(s.ptrs).length < 2) { s.pinch = null; s.target = Math.round(s.pos); }
      try { s.cv.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      return;
    }
    if (e.pointerId !== s.ptr) return;
    s.ptr = null;
    try { s.cv.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    var dn = s.dn, t = nowMs();
    s.dn = null;
    if (!dn) return;
    if (!dn.moved) {
      if (!cancelled && t - dn.t < 500 && s.mode === 'auto') skip(s);
      return;
    }
    var sm = s.smp, a = sm[0], b = sm[sm.length - 1], dt = b[0] - a[0];
    var v = dt > 8 && t - b[0] < 90 ? (b[1] - a[1]) / dt * 1000 : 0;
    s.inertia = !cancelled && Math.abs(v) > 0.6 ? clamp(v, -14, 14) : 0;
    if (!s.inertia) s.target = Math.round(s.pos);
  }
  function onWheel(s, e) {
    if (e.cancelable) e.preventDefault();
    var scale = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? s.h : 1;
    var dx = (e.deltaX || 0) * scale, dy = (e.deltaY || 0) * scale;
    var z = Math.abs(dx) > Math.abs(dy) ? dx : e.ctrlKey ? -dy * 3 : dy;   // scroll down / swipe left / pinch out = zoom in
    if (!z) return;
    grab(s);
    var base = Math.abs(s.target - s.pos) < 2 ? s.target : s.pos;
    s.target = clamp(base + z / 300, 0, s.last);
    W.clearTimeout(s.wheelT);
    s.wheelT = W.setTimeout(function () { if (!s.dead) s.target = clamp(Math.round(s.target), 0, s.last); }, 200);
  }
  function onKey(s, e) {
    var k = e.key, done = true;
    if (k === 'Escape' || k === 'Esc') close('escape');
    else if (k === 'ArrowRight' || k === 'ArrowUp' || k === 'PageDown' || k === '+' || k === '=') nudge(s, 1);
    else if (k === 'ArrowLeft' || k === 'ArrowDown' || k === 'PageUp' || k === '-' || k === '_') nudge(s, -1);
    else if (k === 'Home') seek(s, 0);
    else if (k === 'End') seek(s, s.last);
    else if ((k === ' ' || k === 'Spacebar') && s.mode === 'auto') skip(s);
    else if (k === 'Enter' && s.endOn && !(D.activeElement && D.activeElement.tagName === 'BUTTON' && s.root.contains(D.activeElement))) enter();
    else done = false;
    if (done) { e.preventDefault(); e.stopPropagation(); }
  }
  function endSlide(s) {
    if (!s.sliding) return;
    s.sliding = false;
    s.target = Math.round(s.pos);
  }

  function bind(s) {
    var u = s.ui, cv = s.cv;
    on(s, cv, 'pointerdown', function (e) { onDown(s, e); });
    on(s, cv, 'pointermove', function (e) { onMove(s, e); });
    on(s, cv, 'pointerup', function (e) { onUp(s, e, false); });
    on(s, cv, 'pointercancel', function (e) { onUp(s, e, true); });
    on(s, s.root, 'wheel', function (e) { onWheel(s, e); }, { passive: false });
    on(s, s.root, 'contextmenu', function (e) { if (e.target === cv) e.preventDefault(); });
    var noGesture = function (e) { if (e.cancelable) e.preventDefault(); };
    on(s, s.root, 'gesturestart', noGesture);        // iOS Safari page pinch-zoom
    on(s, s.root, 'gesturechange', noGesture);
    on(s, s.root, 'touchmove', function (e) { if (e.target !== s.ui.rng && e.cancelable) e.preventDefault(); }, { passive: false });
    on(s, W, 'keydown', function (e) { onKey(s, e); }, true);
    on(s, W, 'resize', function () { resize(s); });
    on(s, W, 'orientationchange', function () { W.setTimeout(function () { resize(s); }, 120); });
    on(s, u.close, 'click', function () { close('button'); });
    on(s, u.out, 'click', function () { nudge(s, -1); });
    on(s, u.in, 'click', function () { nudge(s, 1); });
    on(s, u.go, 'click', function () { enter(); });
    on(s, u.rng, 'input', function () {
      var v = Number(u.rng.value);
      if (!isFinite(v)) return;
      grab(s);
      s.sliding = true;
      s.pos = s.target = clamp(v, 0, s.last);
      W.clearTimeout(s.slideT);
      s.slideT = W.setTimeout(function () { endSlide(s); }, 1500);   // safety net if no change/pointerup arrives
    });
    var stop = function () { endSlide(s); };
    on(s, u.rng, 'change', stop);
    on(s, u.rng, 'pointerup', stop);
    on(s, u.rng, 'pointercancel', stop);
    on(s, u.rng, 'blur', stop);
    var pick = function (e, attr) {
      var t = e.target;
      while (t && t !== s.root && !(t.getAttribute && t.getAttribute(attr) != null)) t = t.parentNode;
      return t && t !== s.root && t.getAttribute ? t.getAttribute(attr) : null;
    };
    on(s, u.crumbs.length ? u.crumbs[0].parentNode : s.root, 'click', function (e) {
      var k = pick(e, 'data-k');
      if (k != null) seek(s, Number(k));
    });
    on(s, u.ladder, 'click', function (e) {
      var j = pick(e, 'data-k');
      if (j != null) return seek(s, Number(j));
      var t = pick(e, 'data-t');
      if (t == null) return;
      for (var k = 0; k < s.N; k++) if (s.L[k].tier === Number(t)) return seek(s, k);
    });
    if (W.ResizeObserver) {
      try { s.ro = new W.ResizeObserver(function () { resize(s); }); s.ro.observe(s.root); } catch (err) { s.ro = null; }
    }
  }

  // ------------------------------------------------------------------ lifecycle
  var S = null;

  function open(cosmos, opts) {
    if (S) close('replaced');
    cosmos = isObj(cosmos) ? cosmos : {};
    opts = isObj(opts) ? opts : {};
    injectCss();
    if (opts.loadFonts !== false) ensureFonts();
    var base = str(opts.assetBase || '/assets/');
    if (base.slice(-1) !== '/') base += '/';
    var s = {
      cosmos: cosmos, opts: opts, base: base,
      msPerStep: clamp(Number(opts.msPerStep) || 1100, 200, 20000),
      enterLabel: str(opts.enterLabel) || 'ENTER WORLD',
      off: [], sprites: {}, fb: {}, req: {}, dead: false, budget: 1,
      pos: 0, target: 0, inertia: 0, ptr: null, ptrs: {}, pinch: null, tw: null, dn: null, smp: [], sliding: false,
      zc: 0, xc: 0, vz: 0, vxl: 0, seg: 'in', segI: 0, segF: 0,
      clock: 0, lastTs: 0, lead: 0, started: false, autoMs: 0, mode: 'auto',
      hudIdx: -1, rung: -1, rf: -1, endOn: null, scaleTxt: null, pct: -1, hint: '', tag: '', movCls: '', rs: 0, retDirty: true,
      w: 0, h: 0, dpr: 0
    };
    var hasJourney = Array.isArray(cosmos.journey) && cosmos.journey.filter(isObj).length > 0;
    var hasPath = Array.isArray(cosmos.path) && cosmos.path.filter(isObj).length > 0;
    s.journey = hasJourney && (opts.mode === 'journey' || (opts.mode !== 'path' || !hasPath));
    s.L = buildLayers(s.journey ? cosmos.journey : cosmos.path, cosmos, base, s.journey);
    s.N = s.L.length;
    s.last = s.N - 1;
    s.worldName = str(isObj(cosmos.world) ? cosmos.world.planetName : '').trim() || s.L[s.last].name;
    // Autoplay covers the whole route in ~7-10 s whatever its length (msPerStep only nudges it).
    s.total = clamp(s.msPerStep * Math.max(1, s.last), 7000, 10000);
    s.reduced = mq('(prefers-reduced-motion: reduce)');
    s.coarse = mq('(pointer: coarse)');

    // tiers: the world's rung (★), the rungs on this path, and the rung each step sits in
    var wt = Number(cosmos.tierIndex), k, lastTier = -1, firstTier = -1;
    s.pathTiers = {};
    for (k = 0; k < s.N; k++) if (s.L[k].tier >= 0) { s.pathTiers[s.L[k].tier] = true; if (firstTier < 0) firstTier = s.L[k].tier; lastTier = s.L[k].tier; }
    s.worldTier = isFinite(wt) && wt >= 0 && wt < LADDER.length && cosmos.tierIndex !== null && cosmos.tierIndex !== '' ? Math.floor(wt) : lastTier;
    s.rungOf = [];
    var cur = -1;
    for (k = 0; k < s.N; k++) {
      if (s.L[k].tier >= 0) cur = s.L[k].tier;
      s.rungOf.push(cur >= 0 ? cur : firstTier >= 0 ? firstTier : Math.max(0, s.worldTier));
    }
    s.needGal = s.L.some(function (L) { var p = L.draw === 'image' ? L.proc : L.draw; return p === 'galaxy' || p === 'group' || (p === 'object' && L.obj === 'battery'); });

    if (opts.autoplay === false || s.last < 1) s.mode = 'free';
    if (s.reduced && s.mode === 'auto') { s.mode = 'free'; s.pos = s.target = s.last; }

    buildDom(s);
    s.g = s.cv.getContext('2d');
    s.prevFocus = D.activeElement;
    s.prevOverflow = D.documentElement.style.overflow;
    D.documentElement.style.overflow = 'hidden';
    (D.body || D.documentElement).appendChild(s.root);

    for (k = 0; k < s.N; k++) {              // each step's own image now; fallbacks only if it fails
      var u0 = s.L[k].urls[0];
      if (u0 && !s.req[u0]) { s.req[u0] = 1; loadImage(u0); }
      if (s.L[k].badge && !s.req[s.L[k].badge]) { s.req[s.L[k].badge] = 1; loadImage(s.L[k].badge); }
    }
    S = s;
    camera(s);
    resize(s);
    var area = s.w * s.h;
    s.stars = makeStars(clamp(Math.round(area / 5200), 120, 360), hash(s.worldName));
    bind(s);
    s.frame = function (ts) {
      if (s.dead) return;
      s.raf = raf(s.frame);
      var tms = typeof ts === 'number' ? ts : nowMs();
      var dt = s.lastTs ? clamp((tms - s.lastTs) / 1000, 0, 0.05) : 1 / 60;
      s.lastTs = tms;
      s.clock += dt;
      s.budget = 1;
      try {
        update(s, dt);
        render(s);
        hud(s);
      } catch (err) {
        if (!s.errLogged && W.console) { s.errLogged = true; W.console.error('[CosmicZoom]', err); }
      }
    };
    hud(s);
    s.raf = raf(s.frame);
    void s.root.offsetWidth;
    s.root.classList.add('cz-on');
    try { s.root.focus({ preventScroll: true }); } catch (err) { /* ignore */ }

    return {
      close: function () { if (S === s) close('api'); },
      skip: function () { if (S === s) { if (s.mode === 'auto') skip(s); else seek(s, s.last); } },
      seek: function (k) { if (S === s) seek(s, k); }
    };
  }

  function enter() {
    var s = S;
    if (!s) return;
    var cb = s.opts.onDone, c = s.cosmos;
    close('enter');
    if (typeof cb === 'function') {
      try { cb(c); } catch (err) { if (W.console) W.console.error('[CosmicZoom] onDone', err); }
    }
  }

  function close(reason) {
    var s = S;
    if (!s) return;
    S = null;
    s.dead = true;
    if (s.raf) caf(s.raf);
    for (var i = 0; i < s.off.length; i++) { try { s.off[i](); } catch (err) { /* ignore */ } }
    s.off.length = 0;
    if (s.ro) { try { s.ro.disconnect(); } catch (err) { /* ignore */ } s.ro = null; }
    W.clearTimeout(s.wheelT);
    W.clearTimeout(s.slideT);
    W.clearTimeout(s.enterT);
    // free canvas backing stores right away (iOS keeps them alive otherwise)
    var k;
    for (k in s.sprites) if (s.sprites.hasOwnProperty(k)) { s.sprites[k].c.width = 0; s.sprites[k].c.height = 0; }
    for (k in s.fb) if (s.fb.hasOwnProperty(k)) { s.fb[k].width = 0; s.fb[k].height = 0; }
    if (s.gal) { s.gal.width = 0; s.gal.height = 0; }
    if (s.cloud) { s.cloud.width = 0; s.cloud.height = 0; }
    s.sprites = {}; s.fb = {}; s.gal = s.cloud = null; s.g = null;
    for (k = 0; k < s.L.length; k++) { s.L[k].items = null; s.L[k].nuc = null; }
    D.documentElement.style.overflow = s.prevOverflow || '';
    var root = s.root, cv = s.cv;
    root.classList.remove('cz-on');
    root.classList.add('cz-bye');
    root.style.pointerEvents = 'none';
    root.setAttribute('aria-hidden', 'true');
    var remove = function () {
      cv.width = 0; cv.height = 0;
      if (root.parentNode) root.parentNode.removeChild(root);
    };
    if (reason === 'replaced') remove(); else W.setTimeout(remove, 320);
    var pf = s.prevFocus;
    if (pf && pf.focus && pf !== D.body && D.documentElement.contains(pf)) { try { pf.focus({ preventScroll: true }); } catch (err) { /* ignore */ } }
    s.prevFocus = null;
    if (reason !== 'replaced' && typeof s.opts.onClose === 'function') {
      try { s.opts.onClose(reason || 'api'); } catch (err) { if (W.console) W.console.error('[CosmicZoom] onClose', err); }
    }
  }

  W.CosmicZoom = {
    open: open,
    close: function () { close('api'); },
    isOpen: function () { return !!S; },
    ladder: LADDER.map(function (r) { return { name: r[1], note: r[2] }; })
  };
})(typeof window !== 'undefined' ? window : this);
