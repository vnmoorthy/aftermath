// AFTERMATH walk mode: turns the world you landed on into a 3D place you can walk around in first person.
// Terrain, sky and colours come from the world itself; its AI towers in the distance as a monolith,
// ghosts stand in the fog. Left half of the screen = walk, right half = look (WASD + mouse on desktop).
// Explore.open(world, { cast, onTalk, onClose }) -> Promise<boolean>   (false if WebGL/three.js is unavailable)
(() => {
  'use strict';
  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  let threeP = null;
  const loadThree = () => threeP || (threeP = new Promise((res, rej) => { if (window.THREE) return res(window.THREE); const s = document.createElement('script'); s.src = THREE_URL; s.onload = () => res(window.THREE); s.onerror = rej; document.head.appendChild(s); }));
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = (seed) => { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e6) / 1e6; }; };
  const vnoise = (r) => { const g = []; for (let i = 0; i < 64 * 64; i++) g.push(r()); const at = (x, y) => g[((y & 63) * 64) + (x & 63)];
    return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; }; };
  let active = null;

  async function open(world, opts) {
    opts = opts || {};
    if (active) close();
    let THREE; try { THREE = await loadThree(); } catch (e) { return false; }
    const cv = document.createElement('canvas'); let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' }); } catch (e) { return false; }
    const T = world.terrain || 'ruins', mars = T === 'mars', haunted = world.archetype === 'haunted';
    const r = rng(hash(world.id || world.planetName || 'x')), noise = vnoise(rng(hash((world.id || '') + 'n')));
    const col = (c, fb) => { try { return new THREE.Color(c || fb); } catch (e) { return new THREE.Color(fb); } };
    const sky = mars ? new THREE.Color('#c98d63') : col(world.sky, '#2a2440'), ground = mars ? new THREE.Color('#8a3f1f') : col(world.ground, '#1c1626'), accent = col(world.accent, '#ffc65a');
    const horizon = sky.clone().lerp(new THREE.Color('#ffffff'), 0.12);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:' + (opts.container ? 'absolute' : 'fixed') + ';left:0;right:0;top:0;height:' + (opts.height || '100%') + ';z-index:' + (opts.container ? 25 : 70) + ';background:#000;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.6)';
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    wrap.appendChild(cv);
    const hud = document.createElement('div');
    hud.innerHTML = `<button data-x style="position:absolute;left:12px;top:calc(12px + env(safe-area-inset-top,0px));padding:9px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(5,3,12,.6);color:#fff;font:700 11px ui-monospace,monospace;letter-spacing:.14em">✕ BACK</button>
      <div data-c style="position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top,0px));padding:8px 12px;border-radius:999px;background:rgba(5,3,12,.6);color:#fff;font:700 11px ui-monospace,monospace;letter-spacing:.12em"></div>
      <div data-h style="position:absolute;left:0;right:0;top:calc(56px + env(safe-area-inset-top,0px));text-align:center;color:rgba(255,255,255,.8);font:600 12px ui-monospace,monospace;letter-spacing:.12em;text-shadow:0 1px 6px #000;transition:opacity 1s">◀ LEFT: WALK · RIGHT: LOOK ▶ · TALK BELOW</div>
      <div data-t style="position:absolute;left:50%;top:22%;transform:translate(-50%,-50%);display:none;padding:12px 18px;border-radius:14px;background:rgba(5,3,12,.75);border:1px solid ${'#' + accent.getHexString()};color:#fff;font:700 14px system-ui;text-align:center">You reached ${String(world.aiName || 'the AI').replace(/</g, '&lt;')}<br><small style="opacity:.75;font-weight:600">ask it below ↓</small></div>
      <div data-j style="position:absolute;width:110px;height:110px;margin:-55px 0 0 -55px;border-radius:50%;border:2px solid rgba(255,255,255,.35);display:none;pointer-events:none"><div style="position:absolute;left:35px;top:35px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.45)"></div></div>`;
    hud.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    hud.querySelectorAll('[data-x],[data-t]').forEach((b) => { b.style.pointerEvents = 'auto'; });
    wrap.appendChild(hud); (opts.container || document.body).appendChild(wrap);
    const $h = (k) => hud.querySelector(`[data-${k}]`);

    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    const scene = new THREE.Scene(); scene.background = horizon; scene.fog = new THREE.FogExp2(horizon, mars ? 0.012 : haunted ? 0.03 : 0.02);
    const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 600);
    scene.add(new THREE.HemisphereLight(sky.clone().lerp(new THREE.Color('#fff'), 0.4), ground, 0.9));
    const sun = new THREE.DirectionalLight(mars ? 0xffe2c0 : 0xffffff, mars ? 1.1 : 0.6); sun.position.set(-60, 80, -40); scene.add(sun);
    // sky dome with a gradient
    const skyGeo = new THREE.SphereGeometry(500, 24, 12), sc = [], top = sky.clone().multiplyScalar(0.55);
    for (let i = 0; i < skyGeo.attributes.position.count; i++) { const y = skyGeo.attributes.position.getY(i) / 500; const c = horizon.clone().lerp(top, Math.max(0, y)); sc.push(c.r, c.g, c.b); }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
    // terrain
    const amp = T === 'desert' ? 7 : T === 'ice' ? 5 : mars ? 4 : T === 'ocean' ? 2 : 3.5;
    const height = (x, z) => { const d = Math.hypot(x, z), flat = Math.min(1, Math.max(0, (d - 6) / 30)); return (noise(x / 22, z / 22) * amp + noise(x / 6, z / 6) * 0.8) * flat + (d > 140 ? (d - 140) * 0.35 : 0); };
    const gGeo = new THREE.PlaneGeometry(400, 400, 140, 140); gGeo.rotateX(-Math.PI / 2);
    const gc = [];
    for (let i = 0; i < gGeo.attributes.position.count; i++) {
      const x = gGeo.attributes.position.getX(i), z = gGeo.attributes.position.getZ(i), h = height(x, z); gGeo.attributes.position.setY(i, h);
      const c = ground.clone().lerp(new THREE.Color(0xffffff), 0.05 + 0.12 * noise(x / 3, z / 3)).multiplyScalar(0.75 + h / (amp * 4)); gc.push(c.r, c.g, c.b);
    }
    gGeo.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); gGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ vertexColors: true })));
    if (T === 'ocean') { const w = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshPhongMaterial({ color: sky.clone().multiplyScalar(0.5), transparent: true, opacity: 0.8, shininess: 90 })); w.rotation.x = -Math.PI / 2; w.position.y = 0.9; scene.add(w); }
    const rnd = (a, b) => a + r() * (b - a);
    const place = (mesh, x, z, sink) => { mesh.position.set(x, height(x, z) - (sink || 0), z); scene.add(mesh); return mesh; };
    const spot = (minD) => { for (;;) { const a = r() * Math.PI * 2, d = rnd(minD || 10, 150), x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.abs(x) > 6 || z > -30 || z < -60) return [x, z]; } };
    const glow = (c, i) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i || 0.8, roughness: 0.4 });
    const stone = new THREE.MeshStandardMaterial({ color: ground.clone().lerp(new THREE.Color('#bbb'), 0.35), roughness: 0.95 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x15131a, roughness: 0.8, metalness: 0.3 });
    const n = 70;
    for (let i = 0; i < n; i++) {
      const [x, z] = spot(8); let m;
      if (T === 'crystal' || T === 'ice') { m = new THREE.Mesh(new THREE.ConeGeometry(rnd(0.6, 2.2), rnd(4, 18), 5), T === 'ice' ? new THREE.MeshPhongMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.75, shininess: 120 }) : glow(accent.clone().lerp(new THREE.Color(0xffffff), r() * 0.4), 0.5)); m.rotation.z = rnd(-0.3, 0.3); }
      else if (T === 'jungle' || T === 'fungal') { m = new THREE.Group(); const h = rnd(4, 14); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, h, 6), dark); tr.position.y = h / 2; m.add(tr); const cap = new THREE.Mesh(T === 'fungal' ? new THREE.SphereGeometry(rnd(2, 5), 10, 6, 0, Math.PI * 2, 0, Math.PI / 2) : new THREE.SphereGeometry(rnd(2, 4), 8, 6), T === 'fungal' ? glow(accent, 0.6) : new THREE.MeshLambertMaterial({ color: ground.clone().lerp(new THREE.Color(0x2f8f4f), 0.6) })); cap.position.y = h; m.add(cap); }
      else if (T === 'lava') { m = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(1, 4)), dark); if (r() < 0.3) { const c = new THREE.Mesh(new THREE.PlaneGeometry(rnd(2, 6), 0.4), glow(new THREE.Color(0xff5a1a), 1.5)); c.rotation.x = -Math.PI / 2; place(c, x + 2, z + 2, -0.05); } }
      else if (mars) { m = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(0.3, 1.6)), new THREE.MeshStandardMaterial({ color: 0x6e2c16, roughness: 1 })); }
      else if (T === 'desert') { m = r() < 0.15 ? new THREE.Mesh(new THREE.BoxGeometry(rnd(2, 4), rnd(6, 14), rnd(2, 4)), stone) : new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(0.5, 2)), stone); m.rotation.set(rnd(-0.3, 0.3), r() * 3, rnd(-0.3, 0.3)); }
      else { const h = rnd(4, 30); m = new THREE.Mesh(new THREE.BoxGeometry(rnd(2, 6), h, rnd(2, 6)), T === 'metal' ? new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.7, roughness: 0.4 }) : stone); m.position.y = h / 2; m.rotation.set(rnd(-0.12, 0.12), r() * 3, rnd(-0.12, 0.12)); const g = new THREE.Group(); g.add(m); m = g; if (r() < 0.25) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), glow(accent, 2)); l.position.y = h * rnd(0.3, 0.9); g.add(l); } }
      place(m, x, z, 0.3);
    }
    if (mars) { // Ares Base
      [[-12, -25, 6], [10, -30, 4.5], [-2, -40, 3.5]].forEach(([x, z, s]) => { const d = new THREE.Mesh(new THREE.SphereGeometry(s, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe8e6e1, roughness: 0.4 })); place(d, x, z); });
      for (let i = 0; i < 12; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.4), new THREE.MeshStandardMaterial({ color: 0x0a1430, metalness: 0.6, roughness: 0.25 })); p.rotation.x = -0.5; place(p, -30 + (i % 6) * 3, -8 - Math.floor(i / 6) * 3, -1.2); }
      const rover = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 2), new THREE.MeshStandardMaterial({ color: 0xdddddd })); place(rover, 8, -12, -0.9);
    }
    // the AI: a monolith with a pulsing light, straight ahead
    const ai = new THREE.Group(); const mono = new THREE.Mesh(new THREE.BoxGeometry(3, 16, 1.2), new THREE.MeshStandardMaterial({ color: 0x0b0a10, metalness: 0.8, roughness: 0.2, emissive: accent, emissiveIntensity: 0.15 })); mono.position.y = 8; ai.add(mono);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.12, 8, 48), glow(accent, 2.5)); ring.position.y = 10; ai.add(ring);
    const aiLight = new THREE.PointLight(accent, 2, 60); aiLight.position.y = 9; ai.add(aiLight);
    place(ai, 0, -45, 0.5);
    // ghosts in the fog
    const ghosts = []; const hasGhost = haunted || (opts.cast || []).some((c) => c.role === 'ghost');
    if (hasGhost) for (let i = 0; i < (haunted ? 6 : 3); i++) {
      const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 2.2, 10, 1, true), mat); body.position.y = 1.2; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 8), mat); head.position.y = 2.6; g.add(head);
      const [x, z] = spot(14); place(g, x * 0.5, z * 0.5); ghosts.push({ g, mat, base: 0.18 + r() * 0.15, ph: r() * 6 });
    }
    // drifting dust / spores / snow
    const pc = 600, pp = new Float32Array(pc * 3); for (let i = 0; i < pc; i++) { pp[i * 3] = rnd(-60, 60); pp[i * 3 + 1] = rnd(0, 20); pp[i * 3 + 2] = rnd(-60, 60); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: T === 'ice' ? 0xffffff : T === 'fungal' ? accent : mars ? 0xd9a27a : 0xbbbbcc, size: 0.12, transparent: true, opacity: 0.6, depthWrite: false })); scene.add(dust);

    // controls
    const me = { x: 0, z: 0, yaw: 0, pitch: 0 }; const keys = {}; let joy = null, look = null, moved = 0;
    const down = (e) => { if (e.clientY > innerHeight * 0.56) return; const left = e.clientX < (wrap.clientWidth || innerWidth) / 2; if (left && !joy) { joy = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 }; const j = $h('j'); j.style.display = 'block'; j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px'; } else if (!look) look = { id: e.pointerId, x: e.clientX, y: e.clientY }; };
    const move = (e) => { if (joy && e.pointerId === joy.id) { joy.dx = Math.max(-1, Math.min(1, (e.clientX - joy.x0) / 50)); joy.dy = Math.max(-1, Math.min(1, (e.clientY - joy.y0) / 50)); const k = $h('j').firstChild; k.style.transform = `translate(${joy.dx * 30}px,${joy.dy * 30}px)`; } if (look && e.pointerId === look.id) { me.yaw -= (e.clientX - look.x) * 0.005; me.pitch = Math.max(-1.1, Math.min(1.1, me.pitch - (e.clientY - look.y) * 0.004)); look.x = e.clientX; look.y = e.clientY; } };
    const up = (e) => { if (joy && e.pointerId === joy.id) { joy = null; $h('j').style.display = 'none'; } if (look && e.pointerId === look.id) look = null; };
    cv.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    const kd = (e) => { keys[e.key.toLowerCase()] = true; }, ku = (e) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    let talkShown = false; $h('t').addEventListener('click', () => { opts.onTalk && opts.onTalk(); });
    $h('x').addEventListener('click', () => { close(); opts.onClose && opts.onClose(); });
    const size = () => { const w = wrap.clientWidth || innerWidth, h = wrap.clientHeight || innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    size(); window.addEventListener('resize', size);
    let last = performance.now(), raf = 0, t = 0;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      let f = 0, s = 0; if (joy) { f = -joy.dy; s = joy.dx; } if (keys.w || keys.arrowup) f = 1; if (keys.s || keys.arrowdown) f = -1; if (keys.a) s = -1; if (keys.d) s = 1; if (keys.arrowleft) me.yaw += dt * 1.6; if (keys.arrowright) me.yaw -= dt * 1.6;
      const sp = 7 * dt, sy = Math.sin(me.yaw), cy = Math.cos(me.yaw);
      me.x += (-sy * f + cy * s) * sp; me.z += (-cy * f - sy * s) * sp;
      const d0 = Math.hypot(me.x, me.z); if (d0 > 135) { me.x *= 135 / d0; me.z *= 135 / d0; }
      if (f || s) moved += dt;
      if (moved > 2) $h('h').style.opacity = 0;
      const bob = (f || s) ? Math.sin(t * 9) * 0.06 : 0;
      cam.position.set(me.x, height(me.x, me.z) + 1.7 + bob, me.z);
      cam.rotation.order = 'YXZ'; cam.rotation.set(me.pitch, me.yaw, 0);
      ring.rotation.x = t * 0.6; ring.rotation.y = t * 0.9; aiLight.intensity = 1.6 + Math.sin(t * 2.2) * 0.8;
      ghosts.forEach((gh) => { const d = Math.hypot(gh.g.position.x - me.x, gh.g.position.z - me.z); const fade = Math.min(1, Math.max(0, (d - 4) / 8)); gh.mat.opacity = (gh.base + Math.sin(t * 3 + gh.ph) * 0.06) * fade * (Math.random() < 0.03 ? 0.2 : 1); gh.g.lookAt(me.x, gh.g.position.y, me.z); });
      dust.rotation.y = t * 0.02; dust.position.set(me.x, 0, me.z);
      const dAi = Math.hypot(me.x, me.z + 45);
      $h('c').textContent = `◆ ${String(world.aiName || 'AI').toUpperCase()} · ${Math.max(0, Math.round(dAi - 3))} m`;
      if (dAi < 10 && !talkShown) { talkShown = true; $h('t').style.display = 'block'; } else if (dAi >= 12 && talkShown) { talkShown = false; $h('t').style.display = 'none'; }
      renderer.render(scene, cam); raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    active = { wrap, renderer, raf: () => raf, cleanup: () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('resize', size); } };
    return true;
  }
  function close() {
    if (!active) return; const a = active; active = null;
    cancelAnimationFrame(a.raf()); a.cleanup(); try { a.renderer.dispose(); a.renderer.forceContextLoss(); } catch (e) {} a.wrap.remove();
  }
  window.Explore = { open, close, preload: () => loadThree().catch(() => {}) };
})();
