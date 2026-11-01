/* AFTERMATH wormhole warp: an Interstellar-style lensed wormhole in one WebGL1 fragment shader.
 * window.Wormhole = { supported, start, setDestination, arrive, stop }. No dependencies. */
(function () {
  'use strict';

  const DEFAULT_SKY = 'assets/verse-universe.webp';
  const T_APPROACH = 1.6;      // s: the sphere grows in the middle of the screen
  const T_EXIT = 1.1;          // s: the tunnel opens and the destination fills the screen
  const ARRIVE_CAP_MS = 1550;  // arrive() always resolves by then, even with throttled rAF
  const DEST_WAIT_MS = 320;    // arrive() waits this long for a still-loading destination image
  const FLOW_P = 8;            // tunnel phase period; every tunnel pattern tiles with it, so the loop is seamless

  const VS = 'attribute vec2 aPos;\nvoid main(){ gl_Position = vec4(aPos, 0.0, 1.0); }';

  const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uP;
uniform float uFall;
uniform float uExit;
uniform float uFlow;
uniform float uSpeed;
uniform float uRoll;
uniform float uFlick;
uniform float uSkyAmt;
uniform float uDestAmt;
uniform float uDestMix;
uniform vec2 uDrift;
uniform vec3 uTint;
uniform vec3 uAsp;
uniform vec3 uDestAvg;
uniform vec3 uSkyAvg;
uniform sampler2D uSky;
uniform sampler2D uDestA;
uniform sampler2D uDestB;

const float PI = 3.14159265;
const float TAU = 6.28318531;
const vec2 NT = vec2(289.0);

float h12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
vec2 h22(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}
// value noise; per tiles the lattice so tunnel patterns wrap seamlessly
float vn(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec2 j = mod(i + 1.0, per);
  i = mod(i, per);
  return mix(mix(h12(i), h12(vec2(j.x, i.y)), f.x), mix(h12(vec2(i.x, j.y)), h12(j), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int k = 0; k < 4; k++) {
    s += a * vn(p, NT);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return s;
}
vec2 mir(vec2 u) { return 1.0 - abs(1.0 - mod(u, 2.0)); }
vec2 cover(vec2 q, float ta, vec2 sc) {
  float k = max(sc.y, sc.x / ta);
  return q / vec2(ta * k, k) + 0.5;
}
vec2 circ(vec2 q, float ta) { return 0.5 + q * vec2(min(1.0, 1.0 / ta), min(1.0, ta)); }
// view through the throat: centre = straight ahead in the other universe, rim = everything behind it
vec2 fish(vec2 dir, float r) {
  float a = PI * pow(clamp(r, 0.0, 1.0), 1.35);
  return dir * 0.5 * sin(0.5 * a);
}
vec3 starL(vec2 q, float cells, float px, float seed) {
  vec2 g = q * cells;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = h12(id + seed);
  vec2 o = (h22(id + seed + 5.17) - 0.5) * 0.5;
  vec2 dp = (f - o) / (cells * px);
  float b = smoothstep(0.6, 1.0, h);
  b *= b;
  float sz = 0.7 + 2.0 * b;
  float tw = 0.75 + 0.25 * sin(uTime * (1.3 + 4.0 * h) + h * 50.0);
  vec3 tc = mix(vec3(1.0, 0.8, 0.62), vec3(0.7, 0.83, 1.0), fract(h * 7.13));
  return tc * (2.4 * b * tw * exp(-dot(dp, dp) / (sz * sz)));
}
// our universe, sampled at the (lensed) source position s
vec3 sky(vec2 s, vec2 sc, float px, float mu) {
  vec2 t = s - uDrift * 0.35;
  vec3 c = vec3(0.0);
  if (uSkyAmt < 0.999) {
    float n = fbm(t * 2.1 + vec2(3.1, 1.7));
    float m = vn(t * 5.3 + n * 2.0, NT);
    float dens = smoothstep(0.42, 0.95, n * 0.85 + m * 0.35);
    c = (mix(uTint * 0.7, vec3(0.22, 0.32, 0.95), m) * dens * 0.5 + vec3(0.012, 0.01, 0.03)) * (1.0 - uSkyAmt);
  }
  if (uSkyAmt > 0.001) c += texture2D(uSky, mir(cover(t * 0.94, uAsp.x, sc))).rgb * uSkyAmt;
  c += (starL(t, 34.0, px, 0.0) + 0.7 * starL(t, 71.0, px, 11.0)) * mu * (1.0 - 0.45 * uSkyAmt);
  return c;
}
// the other universe before its picture is known
vec3 otherU(vec2 q, float px) {
  float n = fbm(q * 3.0 + vec2(7.3, 2.1));
  vec3 o = mix(vec3(0.03, 0.02, 0.08), uTint * 1.2, smoothstep(0.3, 0.9, n)) * (0.3 + 0.7 * n);
  o += texture2D(uSky, mir(0.5 - q * 0.9)).bgr * (0.5 + 0.6 * uTint) * uSkyAmt * 0.55;
  o += starL(q, 40.0, px * 1.5, 23.0);
  return o;
}
vec3 destFish(vec2 q, float px) {
  vec3 o = vec3(0.0);
  vec3 d = vec3(0.0);
  if (uDestAmt < 0.999) o = otherU(q, px);
  if (uDestAmt > 0.001) d = mix(texture2D(uDestA, mir(circ(q, uAsp.y))).rgb, texture2D(uDestB, mir(circ(q, uAsp.z))).rgb, uDestMix);
  return mix(o, d, uDestAmt);
}
vec3 destFlat(vec2 fp, vec2 sc, float px) {
  vec3 o = vec3(0.0);
  vec3 d = vec3(0.0);
  if (uDestAmt < 0.999) o = otherU(fp * 0.45, px);
  if (uDestAmt > 0.001) d = mix(texture2D(uDestA, mir(cover(fp, uAsp.y, sc))).rgb, texture2D(uDestB, mir(cover(fp, uAsp.z, sc))).rgb, uDestMix);
  return mix(o, d, uDestAmt);
}
// phase 1: a spherical throat showing the destination, our sky lensed around it
vec3 approach(vec2 p, vec2 sc, float px, float R) {
  vec2 c = uDrift;
  vec2 d = p - c;
  float th = length(d);
  vec2 dir = d / max(th, 1e-4);
  float tE = R * 1.3;
  float aa = px * 1.5;
  vec3 outC = vec3(0.0);
  vec3 inC = vec3(0.0);
  if (th > R - aa) {
    float tc = max(th, R * 0.5);
    float beta = tc - tE * tE / tc;               // point-mass lens: beta = theta - thetaE^2 / theta
    float x = tE / tc;
    float x2 = x * x;
    float mu = min(1.0 / max(abs(1.0 - x2 * x2), 0.02), 6.0);
    outC = sky(c + dir * beta, sc, px, mu);
    float sec = 1.0 - smoothstep(tE - 2.0 * px, tE + 2.0 * px, th);
    outC *= 1.0 - 0.55 * sec;                     // faint inverted secondary image inside the ring
    outC *= 1.0 - 0.7 * exp(-(th - R) / (px * 3.0 + R * 0.045));
    float w = (th - tE) / (px * 1.3 + R * 0.028);
    float sp = 0.65 + 0.7 * vn(dir * 3.5 + vec2(uTime * 0.15, 0.0), NT);
    vec3 rc = mix(vec3(0.82, 0.9, 1.0), uSkyAvg * 2.0 + uTint * 0.25, 0.35);
    outC += rc * (exp(-w * w) * 1.3 * sp + exp(-max(th - tE, 0.0) / (R * 0.5)) * 0.12);
    float wr = (th - R) / (px * 1.2 + R * 0.01);
    outC += vec3(0.85, 0.92, 1.0) * exp(-wr * wr) * 0.45;
    outC += uDestAvg * 0.35 * exp(-max(th - R, 0.0) / (R * 0.22));
  }
  if (th < R + aa) {
    float r = th / R;
    inC = destFish(fish(dir, r) - uDrift * 0.2, px);
    float limb = smoothstep(0.7, 1.0, r);
    inC = inC * (1.0 - 0.5 * limb) + uDestAvg * 0.18 * limb;
  }
  return mix(inC, outC, smoothstep(R - aa, R + aa, th));
}
float streak(float u, float v, float n, float sd) {
  float x = u * n;
  float i = mod(floor(x), n);
  float fx = fract(x) - 0.5;
  float h = h12(vec2(i, sd));
  float h2 = h12(vec2(sd + 3.7, i));
  float f = (1.0 + floor(h * 3.0)) * 0.25;
  float ph = fract(v * f + h2 * 7.0);
  return step(0.42, h2) * exp(-fx * fx * 30.0) * pow(max(1.0 - ph, 0.0), mix(9.0, 2.2, uSpeed)) * (0.35 + 0.65 * h);
}
float ringf(float v, float wob) {
  return pow(max(0.5 + 0.5 * cos(TAU * (v * 0.5 + wob)), 0.0), 28.0);
}
// phase 2: inside the throat
vec3 tunnel(vec2 p, float px, float open) {
  vec2 d = p - uDrift * 0.5;
  float r = max(length(d), 1e-4);
  vec2 dir = d / r;
  float rw = r / (1.0 + 7.0 * open * open);
  float z = min(0.3 / max(rw, 1e-3), 30.0);
  float v = z + uFlow;
  float sw = sin(TAU * uFlow / 8.0);
  float cw = cos(TAU * uFlow / 8.0);
  float u = atan(d.y, d.x) / TAU + 0.035 * z + 0.02 * sw;
  float near = smoothstep(0.02, 0.55, rw);
  float far = smoothstep(0.015, 0.2, rw);
  vec2 wuv = vec2(u * 2.0, v * 0.25);
  vec3 wall = mix(uSkyAvg, texture2D(uSky, mir(wuv)).rgb, uSkyAmt);
  vec3 wd = mix(texture2D(uDestA, mir(wuv + 0.5)).rgb, texture2D(uDestB, mir(wuv + 0.5)).rgb, uDestMix);
  wall = mix(wall, mix(uDestAvg * 1.3, wd, uDestAmt), 0.55);
  float n1 = vn(vec2(u * 14.0, v * 2.0), vec2(14.0, 16.0));
  float n2 = vn(vec2(u * 28.0 + 3.0, v * 4.0 + 1.0), vec2(28.0, 32.0));
  float cs = pow(max(1.0 - abs(2.0 * (0.62 * n1 + 0.38 * n2) - 1.0), 0.0), 10.0);
  float ca = 0.01 + 0.025 * uSpeed;
  float vr = z * (1.0 - ca) + uFlow;
  float vb = z * (1.0 + ca) + uFlow;
  float wob = 0.12 * vn(dir * 2.2 + vec2(sw, cw) * 0.6, NT);
  vec3 rg = vec3(ringf(vr, wob), ringf(v, wob), ringf(vb, wob));
  vec3 st = vec3(streak(u, vr, 96.0, 1.0), streak(u, v, 96.0, 1.0), streak(u, vb, 96.0, 1.0));
  st += 0.6 * vec3(streak(u, vr + 3.0, 61.0, 7.0), streak(u, v + 3.0, 61.0, 7.0), streak(u, vb + 3.0, 61.0, 7.0));
  vec3 lc = mix(vec3(0.75, 0.86, 1.0), uTint, 0.35);
  vec3 col = wall * (0.12 + 0.55 * near) * (0.55 + 0.9 * cs);
  col += lc * cs * 0.45 * near;
  col += rg * lc * 0.55 * near;
  col += st * vec3(0.85, 0.92, 1.0) * 1.6 * far;
  float rp = 0.075 + 2.6 * open * open;
  float g0 = exp(-r / (rp * 1.6 + 0.04));
  col += (uDestAvg * 1.6 + vec3(0.12, 0.16, 0.25)) * g0;
  if (r < rp + 2.0 * px) {
    vec3 pc = destFish(fish(dir, r / rp) - uDrift * 0.15, px) * 1.15;
    col = mix(pc, col, smoothstep(rp - 2.0 * px, rp + 2.0 * px, r));
  }
  return col;
}
void main() {
  float m = min(uRes.x, uRes.y);
  vec2 sc = uRes / m;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / m;
  float cr = cos(uRoll);
  float sr = sin(uRoll);
  p = vec2(cr * p.x - sr * p.y, sr * p.x + cr * p.y);
  float px = 1.0 / m;
  float open = smoothstep(0.0, 0.62, uExit);
  float R = 0.045 / (1.0 - 0.86 * uP) + uFall * uFall * 2.6 + open * open * 3.0;
  float tw = smoothstep(0.45, 0.95, uFall);
  vec3 col = vec3(0.0);
  if (tw < 0.999) col = approach(p, sc, px, R);
  if (tw > 0.001) col = mix(col, tunnel(p, px, open), tw);
  float fb = (uFall - 0.58) / 0.1;
  col += vec3(0.72, 0.84, 1.0) * exp(-fb * fb) * 0.3;
  col *= uFlick;
  float fin = smoothstep(0.6, 1.0, uExit);
  if (uExit > 0.001) {
    float k = smoothstep(0.42, 0.62, uExit);
    if (k > 0.001) col = mix(col, destFlat(p * mix(1.2, 1.0, fin), sc, px), k);
    float fl = (uExit - 0.5) / 0.13;
    col += vec3(0.8, 0.9, 1.0) * exp(-fl * fl) * 1.35;
  }
  vec3 raw = col;
  vec3 hi = max(col - 0.75, 0.0);
  col = col - hi + hi / (1.0 + hi * 1.5);
  vec2 pv = p / sc;
  col *= 1.0 - 0.6 * dot(pv, pv);
  col += (h12(gl_FragCoord.xy + fract(uTime) * 437.0) - 0.5) * 0.035;
  gl_FragColor = vec4(mix(col, raw, fin), 1.0);
}
`;

  const UNIFORMS = ['uRes', 'uTime', 'uP', 'uFall', 'uExit', 'uFlow', 'uSpeed', 'uRoll', 'uFlick', 'uSkyAmt', 'uDestAmt', 'uDestMix',
    'uDrift', 'uTint', 'uAsp', 'uDestAvg', 'uSkyAvg', 'uSky', 'uDestA', 'uDestB'];
  const ATTRS = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };

  let S = null;        // the running warp
  let idle = null;     // last stopped canvas: GL objects freed, context kept so a restart on it is instant
  let supp = null;
  const guarded = typeof WeakSet === 'function' ? new WeakSet() : null;

  const now = () => (window.performance && performance.now ? performance.now() : Date.now());
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

  function parseTint(hex) {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return [0.5, 0.55, 1.0];
    let h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function ctxOf(canvas) {
    try { return canvas.getContext('webgl', ATTRS) || canvas.getContext('experimental-webgl', ATTRS); } catch (e) { return null; }
  }

  function loseIdle() {
    const i = idle;
    idle = null;
    if (i && i.ext) { try { i.ext.loseContext(); } catch (e) { /* already lost */ } }
  }

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      if (!gl.isContextLost()) console.warn('[wormhole] shader compile failed:\n' + gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function mkTex(gl) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return t;
  }

  function upload(s, slot, src) {
    const gl = s.gl;
    if (!gl || s.lost || gl.isContextLost() || !s.tex) return;
    try {
      gl.activeTexture(gl.TEXTURE0 + slot);
      gl.bindTexture(gl.TEXTURE_2D, s.tex[slot]);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    } catch (e) { console.warn('[wormhole] texture upload failed', e); }
  }

  function freeGL(s) {
    const gl = s.gl;
    if (!gl || gl.isContextLost()) return;
    try {
      if (s.tex) s.tex.forEach((t) => gl.deleteTexture(t));
      if (s.buf) gl.deleteBuffer(s.buf);
      if (s.prog) gl.deleteProgram(s.prog);
    } catch (e) { /* ignore */ }
    s.tex = s.buf = s.prog = null;
  }

  function initGL(s) {
    const gl = s.gl;
    const vs = compile(gl, gl.VERTEX_SHADER, VS);
    const fs = vs && compile(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { if (vs) gl.deleteShader(vs); return false; }
    const pr = gl.createProgram();
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.bindAttribLocation(pr, 0, 'aPos');
    gl.linkProgram(pr);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      if (!gl.isContextLost()) console.warn('[wormhole] program link failed:\n' + gl.getProgramInfoLog(pr));
      gl.deleteProgram(pr);
      return false;
    }
    s.prog = pr;
    s.u = {};
    UNIFORMS.forEach((n) => { s.u[n] = gl.getUniformLocation(pr, n); });
    s.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, s.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(pr);
    gl.uniform1i(s.u.uSky, 0);
    gl.uniform1i(s.u.uDestA, 1);
    gl.uniform1i(s.u.uDestB, 2);
    s.tex = [mkTex(gl), mkTex(gl), mkTex(gl)];   // sky, destination A, destination B (crossfade target)
    s.maxTex = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048, 2048);
    if (s.img.sky) upload(s, 0, s.img.sky.src);  // re-upload after a context restore
    if (s.img.A) upload(s, 1, s.img.A.src);
    if (s.img.B) upload(s, 2, s.img.B.src);
    return true;
  }

  function load(url, cb) {
    const im = new Image();
    let done = false;
    const fin = (ok) => { if (!done) { done = true; cb(ok ? im : null); } };
    im.onload = () => { if (im.decode) im.decode().then(() => fin(true), () => fin(true)); else fin(true); };
    im.onerror = () => fin(false);
    im.src = url;
  }

  // Downscale oversize images and measure the average colour (used for glows).
  function prep(s, img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    let src = img;
    const max = s.maxTex || 2048;
    if (w > max || h > max) {
      const k = max / Math.max(w, h);
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k));
      c.height = Math.max(1, Math.round(h * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      src = c;
    }
    let avg = [0.2, 0.2, 0.3];
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 4;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, 4, 4);
      const d = x.getImageData(0, 0, 4, 4).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < 64; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      avg = [r / 4080, g / 4080, b / 4080];
    } catch (e) { /* tainted or unsupported: keep the default */ }
    return { src, asp: w / h, avg };
  }

  function finishMix(s) {
    if (!s.img.B) { s.mixT = 0; return; }
    const t = s.tex[1]; s.tex[1] = s.tex[2]; s.tex[2] = t;
    s.img.A = s.img.B;
    s.img.B = null;
    s.mixT = 0;
  }

  function finishArrive(s) {
    clearTimeout(s.arriveTimer);
    s.arriveTimer = 0;
    const r = s.arriveResolve;
    s.arriveResolve = null;
    if (r) r();
  }

  function resize(s) {
    const c = s.canvas;
    const vw = window.innerWidth || 360, vh = window.innerHeight || 640;
    const cw = c.clientWidth || vw, ch = c.clientHeight || vh;
    const k = s.scale * Math.min(window.devicePixelRatio || 1, 2);
    // Clamped to the viewport so a canvas without CSS size cannot grow itself every frame.
    const w = Math.max(1, Math.round(Math.min(cw, vw) * k));
    const h = Math.max(1, Math.round(Math.min(ch, vh) * k));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    s.measure = false;
  }

  function draw(s, tn) {
    const gl = s.gl;
    if (!gl || s.lost || !s.prog) return;
    s.frames++;
    if (s.measure || s.frames % 30 === 0) resize(s);
    const last = s.last || tn;
    s.last = tn;
    const step = tn - last;
    // Adaptive quality: drop to a lower render scale once if the phone cannot hold ~40 fps.
    if (step > 0 && step < 120 && s.frames > 8) {
      s.ema = s.ema ? s.ema * 0.92 + step * 0.08 : step;
      if (s.frames > 40 && s.ema > 26 && s.scale > 0.5) { s.scale = 0.5; s.measure = true; }
    }
    const dt = Math.min(0.05, Math.max(0, step / 1000));
    const t = (tn - s.t0) / 1000;

    if (s.arriveReq && !s.exitT && (!s.destLoading || tn - s.arriveReq >= DEST_WAIT_MS)) s.exitT = tn;
    const e = s.exitT ? clamp01((tn - s.exitT) / (T_EXIT * 1000)) : 0;
    const P = clamp01(t / T_APPROACH);
    const fall = smooth((t - 1.15) / 1.35);
    const open = smooth(e / 0.62);
    const speed = Math.min(1, smooth((fall - 0.35) / 0.65) * (0.88 + 0.12 * Math.sin(t * 1.7)) * (1 - open) + open);
    s.flow = (s.flow + dt * (0.15 + 2.4 * speed)) % FLOW_P;
    const calm = (1 - 0.65 * fall) * (1 - open);
    const shake = speed * 0.0035 * (1 - open);
    const dx = (0.03 * Math.sin(t * 0.61) + 0.012 * Math.sin(t * 1.73 + 1)) * calm + shake * (Math.sin(t * 23.1) + Math.sin(t * 37.3));
    const dy = (0.022 * Math.sin(t * 0.47 + 2) + 0.01 * Math.sin(t * 1.31)) * calm + shake * (Math.sin(t * 29.7 + 1) + Math.sin(t * 41.9));
    const roll = (0.035 * Math.sin(t * 0.33) + 0.12 * fall * Math.sin(t * 0.21 + 0.5)) * (1 - smooth(e));
    const flick = 1 + fall * (0.05 * Math.sin(t * 31) + 0.06 * (Math.random() - 0.5)) * (1 - e);

    const skyAmt = s.skyT ? smooth((tn - s.skyT) / 500) : 0;
    const destAmt = s.destT ? smooth((tn - s.destT) / s.destDur) : 0;
    let mixK = 0;
    if (s.mixT) {
      const m = (tn - s.mixT) / s.mixDur;
      if (m >= 1) finishMix(s); else mixK = smooth(m);
    }
    const A = s.img.A, B = s.img.B, SK = s.img.sky;
    const fallbackAvg = [s.tint[0] * 0.4, s.tint[1] * 0.4, s.tint[2] * 0.45];
    const destAvg = mix3(fallbackAvg, A ? (B ? mix3(A.avg, B.avg, mixK) : A.avg) : fallbackAvg, destAmt);
    const skyAvg = mix3([0.12, 0.1, 0.25], SK ? SK.avg : [0.12, 0.1, 0.25], skyAmt);

    const u = s.u;
    gl.viewport(0, 0, s.canvas.width, s.canvas.height);
    gl.useProgram(s.prog);
    for (let i = 0; i < 3; i++) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, s.tex[i]); }
    gl.uniform2f(u.uRes, s.canvas.width, s.canvas.height);
    gl.uniform1f(u.uTime, t % 32);
    gl.uniform1f(u.uP, P);
    gl.uniform1f(u.uFall, fall);
    gl.uniform1f(u.uExit, e);
    gl.uniform1f(u.uFlow, s.flow);
    gl.uniform1f(u.uSpeed, speed);
    gl.uniform1f(u.uRoll, roll);
    gl.uniform1f(u.uFlick, flick);
    gl.uniform1f(u.uSkyAmt, skyAmt);
    gl.uniform1f(u.uDestAmt, destAmt);
    gl.uniform1f(u.uDestMix, mixK);
    gl.uniform2f(u.uDrift, dx, dy);
    gl.uniform3f(u.uTint, s.tint[0], s.tint[1], s.tint[2]);
    gl.uniform3f(u.uAsp, SK ? SK.asp : 1, A ? A.asp : 1, B ? B.asp : 1);
    gl.uniform3f(u.uDestAvg, destAvg[0], destAvg[1], destAvg[2]);
    gl.uniform3f(u.uSkyAvg, skyAvg[0], skyAvg[1], skyAvg[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (e >= 1) { s.done = true; finishArrive(s); }
  }

  function loop(s) {
    const fr = () => {
      s.raf = 0;
      if (S !== s || s.lost) return;
      draw(s, now());
      if (!s.done && S === s) s.raf = requestAnimationFrame(fr);
    };
    if (!s.raf) s.raf = requestAnimationFrame(fr);
  }

  const api = {
    supported() {
      if (supp !== null) return supp;
      try {
        if (!window.WebGLRenderingContext) return (supp = false);
        const c = document.createElement('canvas');
        const gl = ctxOf(c);
        supp = !!(gl && !gl.isContextLost());
        if (gl) { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); }
      } catch (e) { supp = false; }
      return supp;
    },

    start(canvas, opts) {
      try {
        if (S) api.stop();
        if (!canvas || typeof canvas.getContext !== 'function') return false;
        if (idle && idle.canvas !== canvas) loseIdle();
        if (idle && idle.canvas === canvas) idle = null;
        const gl = ctxOf(canvas);
        if (!gl || gl.isContextLost()) return false;
        opts = opts || {};
        const s = {
          canvas, gl, ext: gl.getExtension('WEBGL_lose_context'), u: null, prog: null, buf: null, tex: null,
          img: { sky: null, A: null, B: null }, tint: parseTint(opts.tint),
          t0: now(), last: 0, frames: 0, ema: 0, scale: 0.7, measure: true, flow: 0,
          skyT: 0, destT: 0, destDur: 700, mixT: 0, mixDur: 800, destToken: 0, destLoading: false,
          arriveReq: 0, exitT: 0, arrivePromise: null, arriveResolve: null, arriveTimer: 0,
          raf: 0, lost: false, done: false
        };
        if (!initGL(s)) {
          freeGL(s);
          if (s.ext) { try { s.ext.loseContext(); } catch (e) { /* ignore */ } }
          return false;
        }
        s.onResize = () => {
          s.measure = true;
          if (s.done && S === s && !s.lost) requestAnimationFrame(() => { if (S === s && !s.lost) { resize(s); draw(s, now()); } });
        };
        s.onLost = (ev) => {
          ev.preventDefault();   // lets the browser restore the context
          s.lost = true;
          if (s.raf) cancelAnimationFrame(s.raf);
          s.raf = 0;
        };
        s.onRestored = () => {
          if (S !== s) return;
          s.lost = false;
          s.tex = s.buf = s.prog = null;
          if (!initGL(s)) return;
          s.measure = true;
          if (s.done) draw(s, now()); else loop(s);
        };
        window.addEventListener('resize', s.onResize);
        window.addEventListener('orientationchange', s.onResize);
        canvas.addEventListener('webglcontextlost', s.onLost);
        canvas.addEventListener('webglcontextrestored', s.onRestored);
        if (guarded && !guarded.has(canvas)) {
          guarded.add(canvas);
          canvas.addEventListener('webglcontextlost', (ev) => ev.preventDefault());   // idle contexts may be restored too
        }
        S = s;
        load(opts.sky || DEFAULT_SKY, (im) => {
          if (S !== s || !im) { if (!im) console.warn('[wormhole] sky failed to load'); return; }
          const pi = prep(s, im);
          if (!pi) return;
          s.img.sky = pi;
          upload(s, 0, pi.src);
          s.skyT = now();
        });
        if (opts.dest) api.setDestination(opts.dest);
        draw(s, now());   // frame 1 right away: procedural stars and nebula
        loop(s);
        return true;
      } catch (e) {
        console.warn('[wormhole] start failed', e);
        try { api.stop(); } catch (e2) { /* ignore */ }
        return false;
      }
    },

    setDestination(url) {
      const s = S;
      if (!s || !url) return;
      const token = ++s.destToken;
      s.destLoading = true;
      load(String(url), (im) => {
        if (S !== s || token !== s.destToken) return;
        s.destLoading = false;
        if (!im) { console.warn('[wormhole] destination failed to load: ' + url); return; }
        const pi = prep(s, im);
        if (!pi) return;
        const fast = !!(s.arriveReq || s.exitT);
        if (!s.img.A) {
          s.img.A = pi;
          upload(s, 1, pi.src);
          s.destT = now();
          s.destDur = fast ? 250 : 700;
        } else {
          if (s.mixT) finishMix(s);
          s.img.B = pi;
          upload(s, 2, pi.src);
          s.mixT = now();
          s.mixDur = fast ? 250 : 800;
        }
        if (s.done && !s.lost) draw(s, now());
      });
    },

    arrive() {
      const s = S;
      if (!s) return Promise.resolve();
      if (s.arrivePromise) return s.arrivePromise;
      s.arriveReq = now();
      s.arrivePromise = new Promise((res) => { s.arriveResolve = res; });
      s.arriveTimer = setTimeout(() => finishArrive(s), ARRIVE_CAP_MS);
      return s.arrivePromise;
    },

    stop() {
      const s = S;
      if (!s) return;
      S = null;
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
      finishArrive(s);   // never leave an arrive() caller hanging
      window.removeEventListener('resize', s.onResize);
      window.removeEventListener('orientationchange', s.onResize);
      s.canvas.removeEventListener('webglcontextlost', s.onLost);
      s.canvas.removeEventListener('webglcontextrestored', s.onRestored);
      freeGL(s);
      s.img = { sky: null, A: null, B: null };
      // Free the drawing buffer now. The empty context stays on this canvas so the next start() on it is
      // instant; it is released with WEBGL_lose_context as soon as the canvas is detached or another canvas starts.
      try { if (!s.gl.isContextLost()) { s.canvas.width = 1; s.canvas.height = 1; } } catch (e) { /* ignore */ }
      idle = { canvas: s.canvas, ext: s.ext };
      if (!s.canvas.isConnected) loseIdle();
    }
  };

  window.Wormhole = api;
})();
