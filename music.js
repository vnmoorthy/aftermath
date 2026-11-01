/*
 * AFTERMATH · music.js — procedural background scores for every world, synthesized live with WebAudio.
 * No samples, no audio files, no dependencies. Exposes window.Score:
 *
 *   Score.init(audioCtx)          reuse the page's AudioContext (safe to call repeatedly; returns Score)
 *   Score.styleFor(archetype)     -> 'phonk' | 'haunted' | 'dreamy' | 'organic' | 'ambient' | 'minimal'
 *   Score.play(style, { seed })   seed (world id) picks key, tempo ±6 %, riffs and patterns; ~1.5 s crossfade
 *   Score.stop(fadeSec = 1)
 *   Score.duck(on)                true while an AI voice speaks (master -> 0.1x in 0.15 s, back in 0.6 s)
 *   Score.setEnabled(bool), Score.enabled   persisted in localStorage 'aftermath.music' (default on)
 *   Score.warp()                  ~3 s wormhole riser
 *   Score.impact()                arrival boom + crash with a long reverb tail
 *   Score.stats()                 debug snapshot (scheduler ticks, notes, voices, output level ...)
 *
 * Every call is a safe no-op before init(), while disabled, or while the context is not running.
 * play() before init / while disabled is remembered and starts once audio is available. Nothing throws.
 *
 * The music takes only the genre vibe of Brazilian phonk / montagem (tempo, distorted 808s, cowbell
 * leads, trap hats, big claps). Every riff and pattern is generated from the seed; no existing melody
 * is reproduced.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.Score) return;

  /* ------------------------------------------------------------------ constants */
  const LS_KEY = 'aftermath.music';
  const MASTER = 0.3;      // master gain: keeps a spoken AI voice on top of the music
  const DUCK = 0.1;        // ducked level (fraction of normal)
  const TICK_MS = 25;      // scheduler interval
  const LOOKAHEAD = 0.12;  // seconds scheduled ahead of ctx.currentTime
  const XFADE = 1.5;       // crossfade between styles
  const SOFT_CAP = 40;     // above this many live voices, low-priority notes are skipped
  const HARD_CAP = 52;     // above this, nothing new starts

  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11],
    phrygdom: [0, 1, 4, 5, 7, 8, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    majpenta: [0, 2, 4, 7, 9],
    minpenta: [0, 3, 5, 7, 10],
  };

  const ARCH = {
    conqueror: 'phonk', destroyer: 'phonk', trickster: 'phonk',
    haunted: 'haunted', broken: 'haunted',
    befriender: 'dreamy', worshipper: 'dreamy', archivist: 'dreamy',
    human_gardener: 'organic', alien_gardener: 'organic',
    steward: 'ambient', mars: 'ambient', mars_colony: 'ambient',
    survivor: 'minimal',
  };

  /* ------------------------------------------------------------------ state */
  let ctx = null, comp = null, master = null, duckG = null, revS = null, revL = null;
  let noiseBuf = null, crackleBuf = null, an = null, anBuf = null;
  let curves = {};
  let players = [];          // newest last; older ones are fading out
  let timer = 0, lastWall = 0, ahead = LOOKAHEAD;
  let voices = 0;
  let wanted = null;         // last play() request { style, seed }
  let ducked = false;
  let on = readEnabled();
  const fx = { live: new Set() };  // owner of warp/impact voices
  const stats = { ticks: 0, notes: 0, skipped: 0, dropped: 0, bars: 0, errors: 0 };

  /* ------------------------------------------------------------------ utils */
  function readEnabled() {
    try { const v = window.localStorage.getItem(LS_KEY); return !(v === '0' || v === 'false' || v === 'off'); } catch (e) { return true; }
  }
  function writeEnabled(v) { try { window.localStorage.setItem(LS_KEY, v ? '1' : '0'); } catch (e) { /* storage blocked */ } }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  function deg(scale, d) { const n = scale.length, o = Math.floor(d / n); return scale[((d % n) + n) % n] + 12 * o; }
  function wallMs() { try { return window.performance.now(); } catch (e) { return Date.now(); } }
  function running() { return !!ctx && !!comp && ctx.state === 'running'; }

  function hash32(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function mulberry(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------ node helpers */
  function osc(type, hz) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz; return o; }
  function amp(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function filt(type, hz, q) { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = hz; if (q != null) f.Q.value = q; return f; }
  function keep(p, list) { for (let i = 0; i < list.length; i++) p.persist.push(list[i]); }
  function run(list) { list.forEach((n) => { if (n && typeof n.start === 'function') { try { n.start(); } catch (e) { /* already started */ } } }); }
  function lfo(p, hz, depth, param, type) {
    const o = osc(type || 'sine', hz), g = amp(depth);
    o.connect(g); g.connect(param); o.start(); keep(p, [o, g]);
    return o;
  }
  function ramp(param, to, dur) {
    const t = ctx.currentTime;
    try {
      param.cancelScheduledValues(t);
      param.setValueAtTime(param.value, t);
      param.linearRampToValueAtTime(to, t + Math.max(0.01, dur));
    } catch (e) { try { param.value = to; } catch (e2) { /* ignore */ } }
  }

  /* ------------------------------------------------------------------ shared buffers (built once per context) */
  function makeNoise(sec) {
    const sr = ctx.sampleRate, len = Math.floor(sr * sec), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  // Generated stereo impulse: decaying noise that darkens over time.
  function makeIR(sec, decay, dark) {
    const sr = ctx.sampleRate, len = Math.max(64, Math.floor(sr * sec)), b = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const x = i / len;
        lp += ((Math.random() * 2 - 1) - lp) * (1 - dark * x);
        d[i] = lp * Math.pow(1 - x, decay);
      }
    }
    return b;
  }
  function crackle() {
    if (crackleBuf) return crackleBuf;
    const sr = ctx.sampleRate, len = Math.floor(sr * 4), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.01;
    for (let k = 0; k < 90; k++) {
      const at = Math.floor(Math.random() * (len - 300)), big = Math.random() < 0.15;
      const a = (big ? 0.9 : 0.3) * (0.4 + Math.random() * 0.6), dl = 12 + Math.floor(Math.random() * (big ? 160 : 60)), sg = Math.random() < 0.5 ? -1 : 1;
      for (let j = 0; j < dl; j++) d[at + j] += sg * a * Math.exp(-j / (dl * 0.22)) * (j & 1 ? -0.55 : 1);
    }
    crackleBuf = b;
    return b;
  }
  function curve(k) {
    if (curves[k]) return curves[k];
    const n = 1024, c = new Float32Array(n), norm = Math.tanh(k);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / norm; }
    curves[k] = c;
    return c;
  }

  /* ------------------------------------------------------------------ voice bookkeeping */
  function room(prio) {
    if (voices < SOFT_CAP || (prio && voices < HARD_CAP)) return true;
    stats.skipped++;
    return false;
  }
  // srcs[0] must be the source that stops last; when it ends the whole voice is stopped and disconnected.
  function track(owner, srcs, nodes) {
    const v = { s: srcs, n: nodes, done: false };
    voices++; stats.notes++; owner.live.add(v);
    srcs[0].onended = () => endVoice(owner, v);
    return v;
  }
  function endVoice(owner, v) {
    if (v.done) return;
    v.done = true; voices = Math.max(0, voices - 1); owner.live.delete(v);
    v.s.forEach((s) => { try { s.onended = null; } catch (e) { /* */ } try { s.stop(); } catch (e) { /* */ } try { s.disconnect(); } catch (e) { /* */ } });
    v.n.forEach((n) => { try { n.disconnect(); } catch (e) { /* */ } });
  }
  function sendTo(node, bus, amt, nodes) {
    if (!(amt > 0) || !bus) return;
    const g = amp(amt); node.connect(g); g.connect(bus); nodes.push(g);
  }
  // Voice output: optional pan, dry to the player input, optional sends to the short / long reverbs.
  function route(p, node, o, nodes) {
    let n = node;
    if (o.pan && ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = clamp(o.pan, -1, 1); node.connect(pn); nodes.push(pn); n = pn; }
    n.connect(o.dest || p.in);
    sendTo(n, p.sS, o.sendS, nodes);
    sendTo(n, p.sL, o.sendL, nodes);
  }

  /* ------------------------------------------------------------------ instruments (one-shot voices) */
  function kick(p, t, o) {
    if (!room(1)) return;
    const os = osc('sine', o.f0 || 160), g = amp(0), nodes = [g], srcs = [os], dur = o.dur || 0.35;
    os.frequency.setValueAtTime(o.f0 || 160, t);
    os.frequency.exponentialRampToValueAtTime(o.f1 || 48, t + (o.sweep || 0.08));
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vol || 0.8, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g);
    route(p, g, o, nodes);
    if (o.click) {
      const n = ctx.createBufferSource(), hp = filt('highpass', o.clickHz || 3000, 0.7), ng = amp(0);
      n.buffer = noiseBuf;
      ng.gain.setValueAtTime(o.click, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
      n.connect(hp); hp.connect(ng); ng.connect(p.in);
      n.start(t, Math.random() * 1.5); n.stop(t + 0.03);
      srcs.push(n); nodes.push(hp, ng);
    }
    os.start(t); os.stop(t + dur + 0.02);
    track(p, srcs, nodes);
  }

  // Filtered noise hit (hats, claps, snares, shakers). o.bursts > 0 gives the multi-spike 808 clap envelope.
  function noise(p, t, o) {
    if (!room(o.prio)) return;
    const n = ctx.createBufferSource(), f = filt(o.type || 'highpass', o.hz || 8000, o.q), g = amp(0), nodes = [f, g];
    const vol = o.vol, end = t + o.dur, gg = g.gain;
    n.buffer = noiseBuf; n.loop = true;
    gg.setValueAtTime(0, t);
    if (o.bursts) {
      for (let k = 0; k < o.bursts; k++) {
        const b = t + k * 0.0105;
        gg.setValueAtTime(vol, b);
        gg.exponentialRampToValueAtTime(vol * 0.14, b + 0.0095);
      }
      gg.setValueAtTime(vol, t + o.bursts * 0.0105);
      gg.exponentialRampToValueAtTime(0.0001, end);
    } else {
      gg.linearRampToValueAtTime(vol, t + (o.atk || 0.001));
      gg.exponentialRampToValueAtTime(0.0001, end);
    }
    n.connect(f); f.connect(g);
    route(p, g, o, nodes);
    n.start(t, Math.random() * 1.8); n.stop(end + 0.02);
    track(p, [n], nodes);
  }

  // Reversed swell: breathy formant noise that rises and cuts off dead (a "whisper" sucked backwards).
  function whisper(p, t, dur, vol, o) {
    if (!room(0)) return;
    const n = ctx.createBufferSource(), f1 = filt('bandpass', o.f0, 6), f2 = filt('bandpass', o.f0 * 2.3, 9), g = amp(0), nodes = [f1, f2, g], end = t + dur;
    n.buffer = noiseBuf; n.loop = true;
    f1.frequency.setValueAtTime(o.f0, t); f1.frequency.exponentialRampToValueAtTime(o.f1, end);
    f2.frequency.setValueAtTime(o.f0 * 2.3, t); f2.frequency.exponentialRampToValueAtTime(o.f1 * 1.4, end);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, end);
    g.gain.linearRampToValueAtTime(0, end + 0.04);
    n.connect(f1); n.connect(f2); f1.connect(g); f2.connect(g);
    route(p, g, { pan: o.pan, sendL: 0.8 }, nodes);
    n.start(t, Math.random()); n.stop(end + 0.06);
    track(p, [n], nodes);
  }

  // Additive tone: parts = [[ratio, gain, decaySec(0 = follow envelope), type?], ...]
  function tone(p, t, hz, o) {
    if (!room(o.prio)) return;
    const g = amp(0), nodes = [g], srcs = [], end = t + o.dur;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vol, t + (o.atk || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.parts.forEach((pt) => {
      const os = osc(pt[3] || 'sine', hz * pt[0]);
      if (o.bend) { os.detune.setValueAtTime(0, t); os.detune.linearRampToValueAtTime(o.bend, end); }
      if (pt[1] !== 1 || pt[2]) {
        const pg = amp(pt[1]);
        if (pt[2]) { pg.gain.setValueAtTime(pt[1], t); pg.gain.exponentialRampToValueAtTime(Math.max(0.00001, pt[1] * 0.001), t + pt[2]); }
        os.connect(pg); pg.connect(g); nodes.push(pg);
      } else os.connect(g);
      os.start(t); os.stop(end + 0.02);
      srcs.push(os);
    });
    route(p, g, o, nodes);
    track(p, srcs, nodes);
  }

  // Two-operator FM electric piano (Rhodes-like): 1:1 modulator whose index decays from bark to mellow.
  function rhodes(p, t, hz, vel, dur, dest) {
    if (!room(0)) return;
    const car = osc('sine', hz), mod = osc('sine', hz), mg = amp(0), g = amp(0), nodes = [mg, g];
    mg.gain.setValueAtTime(hz * (1.1 + 1.5 * vel), t);
    mg.gain.exponentialRampToValueAtTime(hz * 0.16, t + 0.8);
    mod.connect(mg); mg.connect(car.frequency);
    const pk = 0.06 + 0.08 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(pk, t + 0.005);
    g.gain.exponentialRampToValueAtTime(pk * 0.35, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(g);
    route(p, g, { dest: dest, sendS: 0.25 }, nodes);
    car.start(t); mod.start(t); car.stop(t + dur + 0.02); mod.stop(t + dur + 0.02);
    track(p, [car, mod], nodes);
  }

  /* ------------------------------------------------------------------ persistent instruments (live for a player) */
  // Distorted 808: one running sine -> VCA -> tanh WaveShaper -> lowpass. Notes are automation, so glides are free.
  function make808(p, drive, level, cutoff) {
    const o = osc('sine', 55), vca = amp(0), sh = ctx.createWaveShaper(), lp = filt('lowpass', cutoff, 0.7), out = amp(level);
    sh.curve = curve(Math.round(drive * 10) / 10); sh.oversample = '2x';
    o.connect(vca); vca.connect(sh); sh.connect(lp); lp.connect(out); out.connect(p.in);
    o.start(); keep(p, [o, vca, sh, lp, out]);
    return { f: o.frequency, g: vca.gain };
  }
  function hit808(b, t, hz, o) {
    if (o.glide) {
      b.f.setTargetAtTime(hz, t, o.glide);
      b.g.setTargetAtTime(o.vel, t, 0.015);
    } else {
      b.f.setValueAtTime(hz * (o.punch || 1), t);
      if (o.punch) b.f.setTargetAtTime(hz, t + 0.002, 0.02);
      b.g.setTargetAtTime(o.vel, t, o.atk || 0.002);
    }
    b.g.setTargetAtTime(0, t + (o.hold || 0.06), o.decay || 0.3);
    if (o.dive) b.f.setTargetAtTime(hz * 0.5, t + o.dive, 0.22);
  }

  // Classic 808 cowbell: two squares (540:800 ratio) -> two-stage VCA -> bandpass. Pitched per note.
  function makeBell(p, level, sendS, sendL, detune) {
    const o1 = osc('square', 540), o2 = osc('square', 800), vca = amp(0), bp = filt('bandpass', 2600, 1.1), out = amp(level), nodes = [o1, o2, vca, bp, out];
    if (detune) { o1.detune.value = -detune; o2.detune.value = detune; }
    o1.connect(vca); o2.connect(vca); vca.connect(bp); bp.connect(out); out.connect(p.in);
    sendTo(out, p.sS, sendS, nodes);
    sendTo(out, p.sL, sendL, nodes);
    o1.start(); o2.start(); keep(p, nodes);
    return { a: o1.frequency, b: o2.frequency, bp: bp.frequency, g: vca.gain };
  }
  function bell(b, t, hz, vel, tc) {
    b.a.setValueAtTime(hz, t);
    b.b.setValueAtTime(hz * 1.4815, t);
    b.bp.setValueAtTime(Math.min(hz * 3.1, 9000), t);
    b.g.setTargetAtTime(vel, t, 0.0008);
    b.g.setTargetAtTime(vel * 0.3, t + 0.005, 0.012);
    b.g.setTargetAtTime(0, t + 0.03, tc);
  }

  // Choir pad: 3 voices x 2 detuned saws (shared vibrato) through an "ah" formant bank.
  function makeChoir(p, level) {
    const mix = amp(1), vca = amp(0), out = amp(level), nodes = [mix, vca, out];
    [[800, 7, 1], [1150, 9, 0.55], [2900, 14, 0.25]].forEach((f) => {
      const b = filt('bandpass', f[0], f[1]), g = amp(f[2] * 2.6);
      mix.connect(b); b.connect(g); g.connect(vca); nodes.push(b, g);
    });
    const body = filt('lowpass', 480, 0.5), bg = amp(0.16);
    mix.connect(body); body.connect(bg); bg.connect(vca); nodes.push(body, bg);
    vca.connect(out); out.connect(p.in);
    sendTo(out, p.sL, 0.9, nodes);
    const vib = osc('sine', 4.7), vd = amp(9);
    vib.connect(vd); nodes.push(vib, vd);
    const vs = [];
    for (let i = 0; i < 3; i++) {
      const pair = [];
      [-9, 8].forEach((dt) => { const o = osc('sawtooth', 220); o.detune.value = dt + (i - 1) * 3; vd.connect(o.detune); o.connect(mix); pair.push(o); nodes.push(o); });
      vs.push(pair);
    }
    run(nodes); keep(p, nodes);
    return { vs: vs, g: vca.gain, first: true };
  }
  // Generic warm pad: n voices x 2 detuned oscillators -> lowpass -> VCA.
  function makePad(p, n, type, det, cutoff, level, sendL) {
    const mix = amp(1), lp = filt('lowpass', cutoff, 0.6), vca = amp(0), out = amp(level), nodes = [mix, lp, vca, out];
    mix.connect(lp); lp.connect(vca); vca.connect(out); out.connect(p.in);
    sendTo(out, p.sL, sendL, nodes);
    const vs = [];
    for (let i = 0; i < n; i++) {
      const pair = [];
      [-det, det].forEach((d) => { const o = osc(type, 220); o.detune.value = d; o.connect(mix); pair.push(o); nodes.push(o); });
      vs.push(pair);
    }
    run(nodes); keep(p, nodes);
    return { vs: vs, g: vca.gain, cut: lp.frequency, first: true };
  }
  function chordTo(pad, t, notes, glide) {
    pad.vs.forEach((pair, i) => {
      const hz = mtof(notes[i % notes.length]);
      pair.forEach((o) => { if (pad.first || !glide) o.frequency.setValueAtTime(hz, t); else o.frequency.setTargetAtTime(hz, t, glide); });
    });
    pad.first = false;
  }
  function swell(param, t, peak, len) {
    param.setTargetAtTime(peak, t, len * 0.12);
    param.setTargetAtTime(peak * 0.6, t + len * 0.45, len * 0.3);
  }

  /* ------------------------------------------------------------------ styles */
  // Each style: bpm, optional swing, init(p) builds persistent voices + seeded material,
  // bar(p, barIndex) generates that bar's pattern into p.B (variation every 4 bars),
  // step(p, s, t, sd) plays 16th step s (0..15) at time t (sd = 16th duration).
  const STYLES = {};

  function hats(p, t, sd, h, hz) {
    if (h.roll) {
      const n = h.roll * h.span, dt = (sd * h.span) / n;
      for (let i = 0; i < n; i++) noise(p, t + i * dt, { hz: hz, dur: 0.028, vol: h.v * (0.5 + (0.5 * i) / n), prio: 0 });
    } else noise(p, t, { hz: h.open ? hz * 0.8 : hz, dur: h.open ? 0.2 : 0.04, vol: h.v, prio: 0 });
  }

  /* ---- phonk: ~130 BPM, distorted gliding 808s, pitched cowbell lead, trap hats with rolls, big claps */
  function phonkRiff(p) {
    const groups = p.pick([[3, 3, 2, 3, 3, 2], [3, 3, 3, 3, 2, 2], [2, 3, 3, 2, 3, 3], [3, 3, 2, 2, 3, 3], [3, 3, 4, 3, 3], [4, 3, 3, 3, 3]]);
    const dense = p.ch(0.45), ev = [], cell = [];
    let d = p.pick([0, 0, 4, 7]);
    for (let i = 0; i < groups.length; i++) {
      cell.push(d);
      const step = p.pick([0, 1, -1, 2, -2, 3, -3, 4, -4, 7, -7]);
      d = clamp(d + step, -2, 9);
      if (p.ch(0.3)) d = p.pick([0, 4, 7]);   // keep returning to root / fifth / octave
    }
    const answer = cell.slice();
    answer[answer.length - 1] = p.pick([0, 4, -1, 7, 1]);
    answer[answer.length - 2] = p.pick([1, 2, 3, 5, 6]);
    for (let b = 0; b < 2; b++) {
      let pos = b * 16;
      groups.forEach((g, gi) => {
        const dd = (b ? answer : cell)[gi];
        ev.push({ s: pos, d: dd, v: gi === 0 ? 1 : 0.78 + p.r() * 0.18, tc: 0.06 + p.r() * 0.05 });
        if (g >= 3 && p.ch(dense ? 0.75 : 0.35)) ev.push({ s: pos + 2, d: dd + p.pick([0, 1, -1, 2, 7]), v: 0.6, tc: 0.045 });
        if (g === 4 && p.ch(dense ? 0.6 : 0.25)) ev.push({ s: pos + 3, d: dd, v: 0.5, tc: 0.04 });
        pos += g;
      });
    }
    return ev;
  }
  STYLES.phonk = {
    bpm: 130,
    init(p) {
      p.root = 28 + p.ri(10);                         // 808 key: E1..C#2
      p.scale = p.pick([SCALES.phrygian, SCALES.harmonic, SCALES.minor, SCALES.phrygdom]);
      p.b808 = make808(p, 3.5 + p.r() * 2.5, 0.5, 1700 + p.ri(1500));
      p.bell = makeBell(p, 0.42, 0.16, 0, 0);
      p.bellBase = p.root + 36;
      p.riffA = phonkRiff(p);
      p.riffB = phonkRiff(p);
      p.lift = p.pick([2, 3, 4, -1]);
      p.fill = p.ch(0.75) ? p.pick([[7, 5, 4, 2], [4, 5, 6, 7], [0, 1, 0, -1], [7, 7, 4, 1], [2, 1, 0, -2], [0, 0, 7, 7]]) : null;
      p.kicks = p.pick([[0, 3, 6, 10, 13], [0, 6, 8, 11], [0, 3, 8, 11, 14], [0, 7, 10], [0, 3, 6, 8, 11], [0, 10, 13]]);
      p.kicksAlt = p.pick([[0, 3, 6, 9, 12, 14], [0, 2, 6, 8, 11, 14], [0, 6, 10, 12, 13]]);
      p.bl = [];
      const nk = p.kicks.length;
      for (let i = 0; i < nk * 2; i++) {
        let d = 0;
        if (i === nk - 1 || i === 2 * nk - 1) d = p.pick([0, 4, 7, 5, 1, -1]);
        else if (p.ch(0.22)) d = p.pick([4, 7, 2, -2]);
        p.bl.push({ d: d, g: d !== 0 && p.ch(0.55) });
      }
      p.hat16 = p.ch(0.6);
      p.openHat = p.ch(0.5) ? p.pick([2, 10, 14]) : -1;
    },
    bar(p, bi) {
      const ph = bi % 4, half = bi % 2, B = (p.B = { k: {}, b: {}, c: {}, h: {}, w: {} });
      const intro = bi === 0, brk = bi % 16 === 15, riff = Math.floor(bi / 8) % 2 ? p.riffB : p.riffA;
      const lift = ph === 2 ? p.lift : 0;
      riff.forEach((e) => {
        if (e.s >> 4 !== half) return;
        const s = e.s & 15;
        if (ph === 3 && p.fill && s >= 12) return;
        B.w[s] = { m: p.bellBase + deg(p.scale, e.d + lift), v: e.v, tc: e.tc };
      });
      if (ph === 3 && p.fill) p.fill.forEach((d, i) => { B.w[12 + i] = { m: p.bellBase + deg(p.scale, d), v: 0.85, tc: 0.05 }; });

      if (!intro && !brk) {
        ((ph === 3 && p.ch(0.5)) ? p.kicksAlt : p.kicks).forEach((s) => { B.k[s] = 1; });
        const nk = p.kicks.length;
        p.kicks.forEach((s, i) => {
          const e = p.bl[(half * nk + i) % p.bl.length], gap = (i + 1 < nk ? p.kicks[i + 1] : 16) - s;
          let d = e.d, g = e.g;
          if (ph === 3 && i === nk - 1) { d = p.pick([7, 4, 5]); g = true; }
          B.b[s] = { m: p.root + deg(p.scale, d), g: g, dec: 0.12 + gap * p.sd * 0.45, dive: gap >= 6 && p.ch(0.25) ? gap * p.sd * 0.55 : 0 };
        });
        B.c[4] = 0.5; B.c[12] = 0.55;
        if (ph === 3) { if (p.ch(0.5)) B.c[15] = 0.3; if (p.ch(0.35)) B.c[14] = 0.25; }
        if (ph === 1 && p.ch(0.3)) B.c[7] = 0.2;
      } else if (brk) {
        B.b[0] = { m: p.root, g: false, dec: 0.9, dive: 0 };
        B.b[8] = { m: p.root + deg(p.scale, p.pick([4, 7, 5])), g: true, dec: 0.9, dive: 0 };
      }
      if (!brk || p.ch(0.5)) {
        for (let s = 0; s < 16; s++) {
          if (!p.hat16 && (s & 1)) continue;
          B.h[s] = { v: s % 4 === 0 ? 0.13 : s & 1 ? 0.06 : 0.09 };
        }
        const nr = ph === 3 ? 2 : p.ch(0.55) ? 1 : 0;
        for (let i = 0; i < nr; i++) {
          const s = p.pick([6, 7, 10, 11, 14, 3]), span = s < 15 && p.ch(0.35) ? 2 : 1;
          B.h[s] = { v: 0.09, roll: p.pick([2, 3, 4, 6]), span: span };
          if (span === 2) delete B.h[s + 1];
        }
        if (p.openHat >= 0 && !B.h[p.openHat + 1] && !(B.h[p.openHat] && B.h[p.openHat].roll)) B.h[p.openHat] = { v: 0.08, open: true };
      }
    },
    step(p, s, t, sd) {
      const B = p.B;
      if (!B) return;
      if (B.k[s]) kick(p, t, { f0: 175, f1: 52, sweep: 0.065, dur: 0.3, vol: 0.85, click: 0.22 });
      const b = B.b[s];
      if (b) hit808(p.b808, t, mtof(b.m), { glide: b.g ? 0.035 : 0, vel: 1, punch: b.g ? 0 : 1.7, decay: b.dec, dive: b.dive });
      if (B.c[s]) noise(p, t, { type: 'bandpass', hz: 1300, q: 0.8, bursts: 3, dur: 0.24, vol: B.c[s], sendS: 0.7, prio: 1 });
      if (B.h[s]) hats(p, t, sd, B.h[s], 8000);
      const w = B.w[s];
      if (w) bell(p.bell, t, mtof(w.m), w.v, w.tc);
    },
  };

  /* ---- haunted: ~100 BPM half-time, detuned music box, "ah" choir, sub drone, whispers, sparse heavy 808s */
  STYLES.haunted = {
    bpm: 100,
    init(p) {
      p.root = 28 + p.ri(8);                          // E1..B1
      p.scale = p.pick([SCALES.harmonic, SCALES.phrygian, SCALES.locrian, SCALES.minor]);
      p.b808 = make808(p, 5, 0.5, 1100);
      const t = ctx.currentTime, hz = mtof(p.root + 12);
      const d1 = osc('triangle', hz), d2 = osc('sine', hz * 1.004), dl = filt('lowpass', 230, 0.8), dg = amp(0);
      d1.connect(dl); d2.connect(dl); dl.connect(dg); dg.connect(p.in);
      dg.gain.setValueAtTime(0, t); dg.gain.linearRampToValueAtTime(0.16, t + 4);
      run([d1, d2]); keep(p, [d1, d2, dl, dg]);
      lfo(p, 0.08 + p.r() * 0.05, 0.06, dg.gain);
      p.choir = makeChoir(p, 0.2);
      p.prog = p.pick([[0, 5, 3, 4], [0, 1, 0, 5], [0, 3, 5, 4], [0, 6, 5, 1], [0, 5, 1, 4]]);
      p.box = [];
      let d = p.pick([0, 4, 7]);
      for (let i = 0; i < 16; i++) {
        if (i % 4 === 0 || p.ch(0.45)) { p.box.push({ s: i * 2, d: d, v: i % 4 === 0 ? 1 : 0.7 }); d = clamp(d + p.pick([1, -1, -2, 2, -3, 3, 0, -4]), -3, 9); }
      }
      p.boxBase = p.root + 48;
      p.lift = p.pick([-2, 2, 3, 1]);
    },
    bar(p, bi) {
      const ph = bi % 4, half = bi % 2, intro = bi < 2, B = (p.B = { k: {}, b: {}, c: {}, h: {}, m: {}, x: 0, chord: null });
      const cd = p.prog[(bi >> 1) % p.prog.length];
      if (half === 0) B.chord = [0, 2, 4].map((k) => p.root + 36 + deg(p.scale, cd + k));
      p.box.forEach((e) => {
        if (e.s >> 4 !== half) return;
        B.m[e.s & 15] = { m: p.boxBase + deg(p.scale, e.d + (ph === 3 ? p.lift : 0)), v: e.v, bend: p.ch(0.12) ? -(30 + p.ri(60)) : 0 };
      });
      if (!intro) {
        B.k[0] = 1;
        if (p.ch(0.45)) B.k[p.pick([10, 11, 14])] = 1;
        B.b[0] = { m: p.root + deg(p.scale, cd), dec: 0.55, dive: ph === 3 || p.ch(0.3) ? 0.9 : 0 };
        if (p.ch(0.35)) B.b[p.pick([10, 11])] = { m: p.root + deg(p.scale, cd + p.pick([0, 4, 7])), dec: 0.3, g: p.ch(0.5) };
        B.c[8] = 0.5;
        if (ph === 3 && p.ch(0.5)) B.c[14] = 0.18;
        for (let s = 0; s < 16; s += 2) if (p.ch(0.6)) B.h[s] = { v: s % 4 === 0 ? 0.05 : 0.035 };
        if (p.ch(0.4)) B.h[p.pick([6, 12, 14])] = { v: 0.05, roll: 3, span: 2 };
      }
      if (half === 1 || p.ch(0.3)) B.x = 1;
    },
    step(p, s, t, sd) {
      const B = p.B;
      if (!B) return;
      if (s === 0 && B.chord) { chordTo(p.choir, t, B.chord, 0.12); swell(p.choir.g, t, 0.6, 32 * sd); }
      if (B.k[s]) kick(p, t, { f0: 130, f1: 42, sweep: 0.12, dur: 0.6, vol: 0.85, click: 0.1, sendL: 0.12 });
      const b = B.b[s];
      if (b) hit808(p.b808, t, mtof(b.m), { glide: b.g ? 0.06 : 0, vel: 1, punch: b.g ? 0 : 1.5, decay: b.dec, dive: b.dive });
      if (B.c[s]) noise(p, t, { type: 'bandpass', hz: 1100, q: 0.7, bursts: 3, dur: 0.3, vol: B.c[s], sendS: 0.3, sendL: 0.9, prio: 1 });
      if (B.h[s]) hats(p, t, sd, B.h[s], 7000);
      const m = B.m[s];
      if (m) tone(p, t, mtof(m.m), { parts: [[1, 1, 0], [1.0072, 0.6, 0], [3.98, 0.25, 0.3], [6.1, 0.1, 0.12]], vol: 0.1 * m.v, dur: 1.9, atk: 0.003, bend: m.bend, sendL: 0.6, pan: (p.r() - 0.5) * 0.8, prio: 0 });
      if (s === 4 && B.x) whisper(p, t, 12 * sd, 0.12, { f0: 400 + p.ri(400), f1: 1800 + p.ri(1600), pan: p.r() * 1.6 - 0.8 });
    },
  };

  /* ---- dreamy: lo-fi ~80 BPM, FM Rhodes chords, vinyl crackle, swung soft drums, gentle bass */
  const CH = { M9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], D9: [0, 4, 7, 10, 14], s9: [0, 5, 7, 10, 14], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11] };
  function voicing(tonic, root, type) {
    const tones = CH[type] || CH.M7, out = [];
    for (let i = 1; i < tones.length; i++) { let m = tonic + root + tones[i]; while (m > 76) m -= 12; while (m < 57) m += 12; out.push(m); }
    return out.sort((a, b) => a - b);
  }
  STYLES.dreamy = {
    bpm: 80,
    swing: 0.22,
    init(p) {
      p.tonic = 50 + p.ri(8);                         // D3..A3
      p.prog = p.pick([
        [[2, 'm9'], [7, 'D9'], [0, 'M9'], [9, 'm9']],
        [[0, 'M9'], [4, 'm7'], [9, 'm9'], [5, 'M9']],
        [[5, 'M9'], [4, 'm7'], [2, 'm9'], [0, 'M9']],
        [[9, 'm9'], [5, 'M9'], [0, 'M9'], [7, 's9']],
        [[0, 'M9'], [2, 'm9'], [5, 'M9'], [7, 's9']],
      ]);
      // lo-fi tone: whole player through a soft lowpass; keys through a gentle tremolo
      p.in.disconnect();
      const lp = filt('lowpass', 4200 + p.ri(1500), 0.5);
      p.in.connect(lp); lp.connect(p.out); keep(p, [lp]);
      const keys = amp(1), trem = amp(0.85);
      keys.connect(trem); trem.connect(p.in); keep(p, [keys, trem]);
      lfo(p, 4 + p.r() * 1.5, 0.12, trem.gain);
      p.keys = keys;
      const cr = ctx.createBufferSource(), chp = filt('highpass', 700, 0.5), cg = amp(0.09);
      cr.buffer = crackle(); cr.loop = true;
      cr.connect(chp); chp.connect(cg); cg.connect(p.out);
      cr.start(0, Math.random() * 3); keep(p, [cr, chp, cg]);
      p.bass = make808(p, 1.8, 0.42, 520);
      p.comp = p.pick([[0, 6, 10], [0, 7], [0, 3, 10], [0, 10, 14]]);
      p.compAlt = p.pick([[0, 4, 7, 11], [0, 6, 9], [0, 14]]);
      p.kickPat = p.pick([[0, 7, 10], [0, 10], [0, 3, 10], [0, 8, 11]]);
      p.mel = p.ch(0.75);
    },
    bar(p, bi) {
      const ph = bi % 4, B = (p.B = { k: {}, sn: {}, h: {}, ch: {}, bs: {}, ml: {} });
      const pr = p.prog[bi % p.prog.length], notes = voicing(p.tonic, pr[0], pr[1]);
      (ph === 3 ? p.compAlt : p.comp).forEach((s, i) => { B.ch[s] = { notes: notes, v: i === 0 ? 0.8 : 0.5, dur: i === 0 ? 2.8 : 1.6 }; });
      let bm = p.tonic + pr[0] - 24;
      while (bm < 33) bm += 12;
      while (bm > 44) bm -= 12;
      B.bs[0] = { m: bm, dec: 0.5 };
      if (p.ch(0.6)) B.bs[p.pick([10, 11, 14])] = { m: bm + p.pick([7, 12, 0, 5]), dec: 0.25 };
      p.kickPat.forEach((s) => { B.k[s] = 1; });
      if (ph === 3 && p.ch(0.5)) B.k[15] = 0.6;
      B.sn[4] = 0.3; B.sn[12] = 0.33;
      if (p.ch(0.4)) B.sn[p.pick([7, 15, 9])] = 0.09;
      for (let s = 0; s < 16; s += 2) { B.h[s] = s % 4 === 2 ? 0.06 : 0.045; if (p.ch(0.3)) B.h[s + 1] = 0.025; }
      if (p.mel && bi % 8 >= 4) {
        const n = 2 + p.ri(2), slots = [0, 3, 6, 8, 10, 14];
        for (let i = 0; i < n; i++) B.ml[p.pick(slots)] = p.tonic + 12 + deg(SCALES.majpenta, p.ri(7));
      }
    },
    step(p, s, t, sd) {
      const B = p.B;
      if (!B) return;
      const c = B.ch[s];
      if (c) c.notes.forEach((m, i) => rhodes(p, t + i * (c.v > 0.6 ? 0.014 : 0.006), mtof(m), c.v * (0.85 + p.r() * 0.2), c.dur, p.keys));
      const b = B.bs[s];
      if (b) hit808(p.bass, t, mtof(b.m), { vel: 0.9, decay: b.dec, atk: 0.008, hold: 0.12 });
      if (B.k[s]) kick(p, t, { f0: 110, f1: 46, sweep: 0.09, dur: 0.32, vol: 0.55 * B.k[s] });
      if (B.sn[s]) noise(p, t, { type: 'bandpass', hz: 1800, q: 0.6, dur: 0.16, vol: B.sn[s], sendS: 0.25, prio: 1 });
      if (B.h[s]) noise(p, t, { hz: 7000, dur: 0.035, vol: B.h[s], prio: 0 });
      if (B.ml[s]) rhodes(p, t, mtof(B.ml[s]), 0.75, 2.2, p.keys);
    },
  };

  /* ---- organic: pentatonic marimba / kalimba plucks, wind, soft shaker, warm pad */
  STYLES.organic = {
    bpm: 92,
    swing: 0.08,
    init(p) {
      p.scale = p.pick([SCALES.majpenta, SCALES.minpenta]);
      p.tonic = 55 + p.ri(8);                         // G3..D4
      p.parts = p.ch(0.5)
        ? [[1, 1, 0], [5.95, 0.22, 0.09], [1.004, 0.5, 0]]           // kalimba-ish
        : [[1, 1, 0], [3.99, 0.35, 0.12], [9.9, 0.06, 0.03]];        // marimba-ish
      p.pdur = p.parts[1][0] > 5 ? 1.3 : 0.75;
      const L = p.pick([5, 6, 7]);
      p.arp = [];
      let d = p.ri(3);
      for (let i = 0; i < L; i++) { p.arp.push(i && p.ch(0.18) ? null : d); d = clamp(d + p.pick([1, 2, -1, 1, -2, 3]), 0, 8); }
      p.shifts = p.pick([[0, 2, -1, 1], [0, 1, 3, 2], [0, -2, 1, 0]]);
      p.prog = p.pick([[0, 3, 1, 2], [0, 2, 3, 1], [0, 4, 3, 1], [0, 1, 3, 2]]);
      p.pad = makePad(p, 3, 'triangle', 6, 900, 0.1, 0.3);
      const t = ctx.currentTime;
      p.pad.g.setValueAtTime(0, t); p.pad.g.linearRampToValueAtTime(0.9, t + 3);
      const wn = ctx.createBufferSource(), wbp = filt('bandpass', 600, 0.8), wg = amp(0.05);
      wn.buffer = noiseBuf; wn.loop = true;
      wn.connect(wbp); wbp.connect(wg); wg.connect(p.in);
      const ws = amp(0.4); wg.connect(ws); ws.connect(p.sL);
      wn.start(0, Math.random()); keep(p, [wn, wbp, wg, ws]);
      lfo(p, 0.06 + p.r() * 0.05, 350, wbp.frequency);
      lfo(p, 0.04 + p.r() * 0.04, 0.035, wg.gain);
    },
    bar(p, bi) {
      const ph = bi % 4, B = (p.B = { thump: {}, sh: {}, low: {}, chord: null });
      B.shift = p.shifts[(bi >> 2) % p.shifts.length];
      B.sparse = ph === 3;
      if (bi % 2 === 0) {
        const r = p.tonic - 12 + deg(p.scale, p.prog[(bi >> 1) % p.prog.length]);
        B.chord = [r, r + 7, r + 14];
      }
      B.thump[0] = 1;
      if (p.ch(0.6)) B.thump[p.pick([6, 10, 11])] = 0.6;
      for (let s = 0; s < 16; s++) B.sh[s] = [0.05, 0.018, 0.03, 0.018][s % 4] * (0.8 + p.r() * 0.4);
      if (ph === 1 || ph === 3) {
        B.low[0] = p.tonic - 12 + deg(p.scale, p.ri(5));
        if (p.ch(0.6)) B.low[p.pick([6, 10])] = p.tonic - 12 + deg(p.scale, p.ri(5));
      }
    },
    step(p, s, t, sd) {
      const B = p.B;
      if (!B) return;
      if (s === 0 && B.chord) { chordTo(p.pad, t, B.chord, 0.25); swell(p.pad.g, t, 1, 32 * sd); }
      const L = p.arp.length, k = p.step % L, d = p.arp[k];
      if (d != null && !(B.sparse && p.step % 3 === 0)) {
        tone(p, t, mtof(p.tonic + deg(p.scale, d + B.shift)), { parts: p.parts, vol: s % 4 === 0 ? 0.16 : 0.11, dur: p.pdur, atk: 0.002, sendS: 0.25, sendL: 0.12, pan: (k / L - 0.5) * 0.7, prio: 0 });
      }
      if (B.low[s]) tone(p, t, mtof(B.low[s]), { parts: p.parts, vol: 0.13, dur: p.pdur * 1.4, atk: 0.002, sendL: 0.2, prio: 0 });
      if (B.thump[s]) kick(p, t, { f0: 140, f1: 70, sweep: 0.05, dur: 0.22, vol: 0.35 * B.thump[s] });
      if (B.sh[s]) noise(p, t, { hz: 6000, atk: 0.008, dur: 0.07, vol: B.sh[s], prio: 0 });
    },
  };

  /* ---- ambient: slow evolving pads, sub drone, occasional telemetry beeps (steward, Mars, unknown) */
  const AMB = { A: [0, 7, 11, 16], B: [-3, 4, 7, 12], C: [5, 9, 12, 16], D: [2, 9, 14, 17], E: [-5, 2, 7, 11] };
  STYLES.ambient = {
    bpm: 70,
    init(p) {
      p.tonic = 40 + p.ri(8);                         // E2..B2
      p.prog = p.pick([['A', 'C', 'B', 'C'], ['A', 'D', 'E', 'A'], ['B', 'C', 'A', 'E'], ['A', 'B', 'D', 'C']]);
      p.pad = makePad(p, 4, 'sawtooth', 7, 700, 0.07, 0.8);
      lfo(p, 0.025 + p.r() * 0.02, 420, p.pad.cut);
      const t = ctx.currentTime, sub = osc('sine', mtof(p.tonic - 12)), sg = amp(0);
      sub.connect(sg); sg.connect(p.in);
      sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(0.16, t + 5);
      sub.start(); keep(p, [sub, sg]);
      lfo(p, 0.05 + p.r() * 0.03, 0.05, sg.gain);
      p.beepNotes = [0, 2, 4, 7, 9].map((x) => p.tonic + 48 + x);
    },
    bar(p, bi) {
      const B = (p.B = { chord: null, beep: null });
      if (bi % 4 === 0) B.chord = AMB[p.prog[(bi >> 2) % p.prog.length]].map((x) => p.tonic + 12 + x);
      if (p.ch(0.55)) B.beep = { s: p.ri(16), n: p.pick([1, 2, 2, 3]), m: p.pick(p.beepNotes), pan: p.r() * 1.6 - 0.8 };
    },
    step(p, s, t, sd) {
      const B = p.B;
      if (!B) return;
      if (s === 0 && B.chord) { chordTo(p.pad, t, B.chord, 1.6); swell(p.pad.g, t, 1, 64 * sd); }
      if (B.beep && s === B.beep.s) {
        for (let i = 0; i < B.beep.n; i++) tone(p, t + i * 0.11, mtof(B.beep.m + (i === B.beep.n - 1 && B.beep.n > 1 ? 5 : 0)), { parts: [[1, 1, 0], [2, 0.15, 0]], vol: 0.045, dur: 0.075, atk: 0.003, sendL: 0.5, pan: B.beep.pan, prio: 0 });
      }
    },
  };

  /* ---- minimal: heartbeat kick, sparse pings, low drone (survivor) */
  STYLES.minimal = {
    bpm: 66,
    init(p) {
      p.tonic = 33 + p.ri(7);                         // A1..D#2
      p.scale = SCALES.minpenta;
      const t = ctx.currentTime, hz = mtof(p.tonic + 12);
      const saw = osc('sawtooth', hz), lp = filt('lowpass', 180, 3), dg = amp(0), sub = osc('sine', mtof(p.tonic)), sg = amp(0.12);
      saw.connect(lp); lp.connect(dg); dg.connect(p.in); sub.connect(sg); sg.connect(p.in);
      dg.gain.setValueAtTime(0, t); dg.gain.linearRampToValueAtTime(0.09, t + 4);
      run([saw, sub]); keep(p, [saw, lp, dg, sub, sg]);
      lfo(p, 0.05 + p.r() * 0.03, 80, lp.frequency);
    },
    bar(p, bi) {
      const ph = bi % 4, B = (p.B = { hb: {}, ping: {} });
      if (ph === 2 && p.ch(0.6)) { B.hb[0] = 1; B.hb[4] = 1; } else for (let s = 0; s < 16; s += 4) B.hb[s] = 1;
      for (let b = 0; b < 4; b++) if (p.ch(0.14)) B.ping[b * 4 + p.pick([0, 2])] = p.tonic + 36 + deg(p.scale, p.ri(8));
      if (ph === 3 && p.ch(0.5)) { B.ping[8] = p.tonic + 48; B.ping[10] = p.tonic + 48 + deg(p.scale, p.pick([1, 2, 3])); }
    },
    step(p, s, t, sd) {
      const B = p.B;
      if (!B) return;
      if (B.hb[s]) {
        kick(p, t, { f0: 95, f1: 44, sweep: 0.06, dur: 0.22, vol: 0.6, click: 0.04, clickHz: 900 });
        kick(p, t + 0.17, { f0: 80, f1: 40, sweep: 0.05, dur: 0.2, vol: 0.38 });
      }
      if (B.ping[s]) tone(p, t, mtof(B.ping[s]), { parts: [[1, 1, 0], [2.76, 0.12, 0.4]], vol: 0.07, dur: 2.6, atk: 0.004, sendL: 0.85, pan: p.r() * 1.2 - 0.6, prio: 0 });
    },
  };

  /* ------------------------------------------------------------------ players + scheduler */
  function makePlayer(name, seed) {
    const st = STYLES[name], r = mulberry(hash32(name + '|' + seed));
    const p = {
      name: name, seed: seed, st: st, r: r, live: new Set(), persist: [], bar: 0, step: 0, next: 0, killAt: 0, B: null,
      ri: (n) => Math.floor(r() * n),
      pick: (a) => a[Math.floor(r() * a.length)],
      ch: (x) => r() < x,
    };
    p.bpm = st.bpm * (1 + (r() * 2 - 1) * 0.06);
    p.sd = 60 / p.bpm / 4;
    p.swing = st.swing ? st.swing + (r() - 0.5) * 0.06 : 0;
    p.in = amp(1); p.out = amp(0); p.sS = amp(0); p.sL = amp(0);
    p.in.connect(p.out); p.out.connect(comp); p.sS.connect(revS); p.sL.connect(revL);
    st.init(p);
    return p;
  }
  function fade(p, to, dur) { ramp(p.out.gain, to, dur); ramp(p.sS.gain, to, dur); ramp(p.sL.gain, to, dur); }
  function kill(p) {
    p.live.forEach((v) => endVoice(p, v));
    p.persist.forEach((n) => { try { if (typeof n.stop === 'function') n.stop(); } catch (e) { /* */ } try { n.disconnect(); } catch (e) { /* */ } });
    p.persist = [];
    [p.in, p.out, p.sS, p.sL].forEach((n) => { try { n.disconnect(); } catch (e) { /* */ } });
    const i = players.indexOf(p);
    if (i >= 0) players.splice(i, 1);
  }
  function start(name, seed) {
    if (!ctx || !comp || !on) return;
    const top = players[players.length - 1];
    if (top && !top.killAt && top.name === name && top.seed === seed) return;   // already playing this score
    const t = ctx.currentTime;
    players.forEach((q) => {
      if (!q.killAt) { fade(q, 0, XFADE); q.killAt = t + XFADE + 0.15; }       // current score: full crossfade
      else { fade(q, 0, 0.12); q.killAt = Math.min(q.killAt, t + 0.15); }     // older, still fading: cut fast
    });
    let p;
    try { p = makePlayer(name, seed); } catch (e) { stats.errors++; return; }
    p.next = t + 0.06;
    fade(p, 1, top ? XFADE : 0.5);
    players.push(p);
    startTimer();
    tick();
  }
  function stopAll(f) {
    if (!ctx) return;
    const t = ctx.currentTime, d = Math.max(0.02, f);
    players.forEach((q) => { fade(q, 0, d); q.killAt = q.killAt ? Math.min(q.killAt, t + d + 0.05) : t + d + 0.05; });
  }
  function startTimer() { if (!timer) { lastWall = 0; timer = setInterval(tick, TICK_MS); } }
  function stopTimer() { if (timer) { clearInterval(timer); timer = 0; } }

  function tick() {
    try {
      stats.ticks++;
      if (!ctx) { stopTimer(); return; }
      if (ctx.state === 'closed') { players.slice().forEach(kill); players = []; stopTimer(); return; }
      // Throttled timers (background tabs) arrive late: schedule further ahead so the music never gaps.
      const w = wallMs(), gap = lastWall ? (w - lastWall) / 1000 : TICK_MS / 1000;
      lastWall = w;
      const want = clamp(gap * 1.6, LOOKAHEAD, 1.5);
      ahead = want > ahead ? want : ahead * 0.92 + want * 0.08;
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;
      for (let i = players.length - 1; i >= 0; i--) {
        const p = players[i];
        if (!p) continue;
        if (p.killAt && now >= p.killAt) { kill(p); continue; }
        if (p.next < now - 2) p.next = now + 0.05;                 // re-anchor after a long stall
        let guard = 0;
        while (p.next < now + ahead && guard++ < 512) {
          const s = p.step % 16;
          if (s === 0) { try { p.st.bar(p, p.bar); } catch (e) { stats.errors++; } stats.bars++; }
          if (p.next >= now - 0.02) {
            const t = p.next + (s & 1 ? p.swing * p.sd : 0);
            try { p.st.step(p, s, t, p.sd); } catch (e) { stats.errors++; }
          } else stats.dropped++;
          p.next += p.sd;
          p.step++;
          if (s === 15) p.bar++;
        }
      }
      if (!players.length) stopTimer();
    } catch (e) { stats.errors++; }
  }

  /* ------------------------------------------------------------------ one-shots */
  function warp() {
    const c = ctx, t = c.currentTime + 0.03, D = 3.0, end = t + D;
    const out = amp(0.9), rs = amp(0.3), nodes = [out, rs];
    out.connect(comp); out.connect(rs); rs.connect(revL);
    // filtered-noise sweep
    const n = c.createBufferSource(), bp = filt('bandpass', 200, 0.7), ng = amp(0);
    n.buffer = noiseBuf; n.loop = true;
    bp.frequency.setValueAtTime(200, t); bp.frequency.exponentialRampToValueAtTime(9500, end);
    bp.Q.setValueAtTime(0.7, t); bp.Q.linearRampToValueAtTime(7, end);
    ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.55, end - 0.04); ng.gain.linearRampToValueAtTime(0, end + 0.06);
    n.connect(bp); bp.connect(ng); ng.connect(out); nodes.push(bp, ng);
    // rising detuned saws with an accelerating tremolo
    const sg = amp(0), lp = filt('lowpass', 500, 5), trem = amp(0.65), tl = osc('sine', 3), td = amp(0.35);
    sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.14, end - 0.04); sg.gain.linearRampToValueAtTime(0, end + 0.06);
    lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(8000, end);
    tl.frequency.setValueAtTime(3, t); tl.frequency.exponentialRampToValueAtTime(22, end);
    tl.connect(td); td.connect(trem.gain);
    sg.connect(lp); lp.connect(trem); trem.connect(out); nodes.push(sg, lp, trem, td);
    const srcs = [n, tl];
    [-16, -5, 7, 15].forEach((dt) => {
      const o = osc('sawtooth', 70);
      o.detune.value = dt;
      o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(1150, end);
      o.connect(sg); srcs.push(o);
    });
    // building sub
    const sub = osc('sine', 30), subg = amp(0);
    sub.frequency.setValueAtTime(30, t); sub.frequency.exponentialRampToValueAtTime(62, end);
    subg.gain.setValueAtTime(0.0001, t); subg.gain.exponentialRampToValueAtTime(0.7, end - 0.04); subg.gain.linearRampToValueAtTime(0, end + 0.06);
    sub.connect(subg); subg.connect(out); srcs.push(sub); nodes.push(subg);
    srcs.forEach((s, i) => { if (i === 0) s.start(t, Math.random()); else s.start(t); s.stop(end + 0.1); });
    voicesFx(srcs, nodes);
  }
  function impact() {
    const c = ctx, t = c.currentTime + 0.02;
    const out = amp(1), rs = amp(0.85), nodes = [out, rs];
    out.connect(comp); rs.connect(revL);
    // sub boom (dry: low end in a reverb is mud)
    const o = osc('sine', 120), og = amp(0), sh = c.createWaveShaper();
    sh.curve = curve(2.2);
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22); o.frequency.exponentialRampToValueAtTime(26, t + 2.4);
    og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(0.95, t + 0.006); og.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    o.connect(og); og.connect(sh); sh.connect(out); nodes.push(og, sh);
    // noise crash into the long reverb
    const n = c.createBufferSource(), hp = filt('highpass', 380, 0.5), pk = filt('peaking', 4200, 0.8), ng = amp(0);
    n.buffer = noiseBuf; n.loop = true; pk.gain.value = 5;
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.7, t + 0.004);
    ng.gain.exponentialRampToValueAtTime(0.16, t + 0.25); ng.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    n.connect(hp); hp.connect(pk); pk.connect(ng); ng.connect(out); ng.connect(rs); nodes.push(hp, pk, ng);
    o.start(t); n.start(t, Math.random());
    o.stop(t + 3); n.stop(t + 3);
    voicesFx([o, n], nodes);
  }
  function voicesFx(srcs, nodes) { track(fx, srcs, nodes); }
  function killFx() { fx.live.forEach((v) => endVoice(fx, v)); }

  /* ------------------------------------------------------------------ graph */
  function build(c) {
    ctx = c;
    comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
    master = amp(on ? MASTER : 0);
    duckG = amp(ducked ? DUCK : 1);
    comp.connect(master); master.connect(duckG); duckG.connect(c.destination);
    noiseBuf = makeNoise(2);
    revS = c.createConvolver(); revS.buffer = makeIR(1.2, 2.8, 0.55); revS.connect(comp);
    revL = c.createConvolver(); revL.buffer = makeIR(3.4, 2.1, 0.75); revL.connect(comp);
  }
  function teardown() {
    stopTimer();
    players.slice().forEach((p) => { try { kill(p); } catch (e) { /* */ } });
    players = [];
    try { killFx(); } catch (e) { /* */ }
    [comp, master, duckG, revS, revL, an].forEach((n) => { try { if (n) n.disconnect(); } catch (e) { /* */ } });
    ctx = comp = master = duckG = revS = revL = an = null;
    noiseBuf = crackleBuf = anBuf = null;
    curves = {};
    voices = 0;
  }
  function resolve(style) {
    const s = String(style == null ? '' : style).toLowerCase().trim();
    return STYLES[s] ? s : Score.styleFor(s);
  }

  /* ------------------------------------------------------------------ public API */
  const Score = {
    styles: Object.keys(STYLES),

    init(audioCtx) {
      try {
        let c = audioCtx;
        if (!c) {
          if (ctx) return Score;
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return Score;
          c = new AC();
        }
        if (c === ctx) return Score;
        if (typeof c.createOscillator !== 'function' || typeof c.createDynamicsCompressor !== 'function') return Score;
        if (ctx) teardown();
        try { build(c); } catch (e) { stats.errors++; teardown(); return Score; }
        if (on && wanted) start(wanted.style, wanted.seed);
      } catch (e) { stats.errors++; }
      return Score;
    },

    styleFor(archetype) {
      try {
        const k = String(archetype == null ? '' : archetype).toLowerCase().trim().replace(/[\s-]+/g, '_');
        if (STYLES[k]) return k;
        if (ARCH[k]) return ARCH[k];
        if (k.indexOf('mars') >= 0) return 'ambient';
        return 'ambient';
      } catch (e) { return 'ambient'; }
    },

    play(style, opts) {
      try {
        const name = resolve(style);
        const seed = String(opts && opts.seed != null ? opts.seed : '');
        wanted = { style: name, seed: seed };
        if (!ctx || !on) return;
        start(name, seed);
      } catch (e) { stats.errors++; }
    },

    stop(fadeSec) {
      try {
        wanted = null;
        if (!ctx) return;
        stopAll(typeof fadeSec === 'number' && isFinite(fadeSec) && fadeSec >= 0 ? fadeSec : 1);
      } catch (e) { stats.errors++; }
    },

    duck(v) {
      try {
        ducked = !!v;
        if (!ctx || !duckG) return;
        ramp(duckG.gain, ducked ? DUCK : 1, ducked ? 0.15 : 0.6);
      } catch (e) { stats.errors++; }
    },

    setEnabled(v) {
      try {
        v = !!v;
        writeEnabled(v);
        if (v === on) return;
        on = v;
        if (!ctx || !master) return;
        if (!on) { ramp(master.gain, 0, 0.4); stopAll(0.4); }      // keep `wanted`: re-enabling resumes this world's score
        else { ramp(master.gain, MASTER, 0.1); if (wanted) start(wanted.style, wanted.seed); }
      } catch (e) { stats.errors++; }
    },
    get enabled() { return on; },
    set enabled(v) { Score.setEnabled(v); },
    get style() { const top = players[players.length - 1]; return top && !top.killAt ? top.name : null; },

    warp() {
      try { if (on && running() && noiseBuf) warp(); } catch (e) { stats.errors++; }
    },

    impact() {
      try { if (on && running() && noiseBuf) impact(); } catch (e) { stats.errors++; }
    },

    stats() {
      try {
        const top = players[players.length - 1];
        let level = null;
        if (ctx && duckG) {
          if (!an) { an = ctx.createAnalyser(); an.fftSize = 2048; duckG.connect(an); anBuf = new Float32Array(an.fftSize); }
          if (an.getFloatTimeDomainData) {
            an.getFloatTimeDomainData(anBuf);
            let sum = 0, pk = 0;
            for (let i = 0; i < anBuf.length; i++) { const x = anBuf[i]; sum += x * x; if (Math.abs(x) > pk) pk = Math.abs(x); }
            level = { rmsDb: Math.round(10 * Math.log10(sum / anBuf.length + 1e-12) * 10) / 10, peak: Math.round(pk * 1000) / 1000 };
          }
        }
        return {
          state: ctx ? ctx.state : 'no-context', enabled: on, ducked: ducked, schedulerRunning: !!timer,
          style: top ? top.name : null, seed: top ? top.seed : null, bpm: top ? Math.round(top.bpm * 10) / 10 : 0,
          bar: top ? top.bar : 0, players: players.length, voices: voices, aheadSec: Math.round(ahead * 1000) / 1000,
          ticks: stats.ticks, notes: stats.notes, bars: stats.bars, skipped: stats.skipped, dropped: stats.dropped, errors: stats.errors,
          level: level,
        };
      } catch (e) { return { errors: stats.errors }; }
    },
  };

  window.Score = Score;
})();
