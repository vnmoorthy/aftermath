// AFTERMATH 360° look-around: renders an equirectangular panorama (e.g. the Blender-rendered Ares Base on Mars)
// with a true perspective camera. Drag, tilt the phone or pinch to look around. WebGL1, no dependencies.
// Pano.mount(el, url, { yaw, pitch, fov, autoRotate }) -> { destroy(), look(yawDeg, pitchDeg) } or null without WebGL.
(() => {
  'use strict';
  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p;gl_Position=vec4(p,0.,1.);}';
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v; uniform sampler2D t; uniform float yaw, pitch, tanH, aspect;
void main(){
  vec3 d = normalize(vec3(v.x * tanH * aspect, v.y * tanH, -1.0));
  float cp = cos(pitch), sp = sin(pitch); d = vec3(d.x, d.y * cp - d.z * sp, d.y * sp + d.z * cp);
  float cy = cos(yaw), sy = sin(yaw); d = vec3(d.x * cy - d.z * sy, d.y, d.x * sy + d.z * cy);
  float lon = atan(d.x, -d.z), lat = asin(clamp(d.y, -1.0, 1.0));
  gl_FragColor = texture2D(t, vec2(lon / 6.2831853 + 0.5, 0.5 - lat / 3.1415927));
}`;
  const R = Math.PI / 180;
  function mount(el, url, opts) {
    opts = opts || {};
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
    let gl = null;
    try { gl = cv.getContext('webgl', { antialias: false, alpha: false }) || cv.getContext('experimental-webgl'); } catch (e) {}
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    let prog;
    try { prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)); }
    catch (e) { console.warn('[pano]', e.message); return null; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const uYaw = U('yaw'), uPitch = U('pitch'), uTan = U('tanH'), uAspect = U('aspect');
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([60, 26, 14, 255]));
    let ready = false, dead = false, raf = 0, dirty = true;
    const img = new Image();
    img.onload = () => {
      if (dead) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      const pot = (n) => (n & (n - 1)) === 0;
      if (pot(img.width) && pot(img.height)) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); }
      else { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      ready = true; dirty = true; cv.style.opacity = 1;
    };
    img.src = url;
    cv.style.opacity = 0; cv.style.transition = 'opacity .8s ease';
    el.appendChild(cv);
    let yaw = (opts.yaw || 0) * R, pitch = (opts.pitch || 0) * R, fov = (opts.fov || 75) * R;
    let gyroYaw = 0, gyroPitch = 0, gyro0 = null, lastInput = 0;
    const auto = opts.autoRotate !== false;
    const size = () => { const s = Math.min(2, window.devicePixelRatio || 1) * 0.85; const w = Math.max(1, Math.round(el.clientWidth * s)), h = Math.max(1, Math.round(el.clientHeight * s)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; dirty = true; } };
    let last = performance.now();
    const frame = (now) => {
      if (dead) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (auto && now - lastInput > 3500) { yaw += dt * 2.2 * R; dirty = true; }
      size();
      if (dirty && ready) {
        gl.viewport(0, 0, cv.width, cv.height);
        const p = Math.max(-1.35, Math.min(1.35, pitch + gyroPitch));
        gl.uniform1f(uYaw, yaw + gyroYaw); gl.uniform1f(uPitch, p);
        gl.uniform1f(uTan, Math.tan(fov / 2)); gl.uniform1f(uAspect, cv.width / cv.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); dirty = false;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // drag + pinch
    const pts = new Map(); let pinch0 = 0, fov0 = fov;
    const down = (e) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { cv.setPointerCapture(e.pointerId); } catch (er) {} if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); fov0 = fov; } };
    const move = (e) => {
      const p = pts.get(e.pointerId); if (!p) return; lastInput = performance.now();
      if (pts.size === 1) { const k = fov / Math.max(1, el.clientHeight); yaw -= (e.clientX - p.x) * k; pitch += (e.clientY - p.y) * k; pitch = Math.max(-1.35, Math.min(1.35, pitch)); }
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2 && pinch0) { const [a, b] = [...pts.values()]; fov = Math.max(40 * R, Math.min(100 * R, fov0 * pinch0 / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)))); }
      dirty = true;
    };
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; };
    const wheel = (e) => { e.preventDefault(); fov = Math.max(40 * R, Math.min(100 * R, fov * (1 + e.deltaY * 0.001))); lastInput = performance.now(); dirty = true; };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => cv.addEventListener(n, up));
    cv.addEventListener('wheel', wheel, { passive: false });
    // tilt the phone to look around
    const orient = (e) => {
      if (e.alpha == null || e.beta == null) return;
      if (!gyro0) gyro0 = { a: e.alpha, b: e.beta };
      let da = e.alpha - gyro0.a; if (da > 180) da -= 360; if (da < -180) da += 360;
      gyroYaw = -da * R; gyroPitch = (e.beta - gyro0.b) * R * 0.8; lastInput = performance.now(); dirty = true;
    };
    window.addEventListener('deviceorientation', orient);
    return {
      look(y, p) { yaw = y * R; pitch = (p || 0) * R; dirty = true; },
      destroy() { dead = true; cancelAnimationFrame(raf); window.removeEventListener('deviceorientation', orient); try { const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); } catch (e) {} cv.remove(); },
    };
  }
  window.Pano = { mount };
})();
