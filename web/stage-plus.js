/* AFTERMATH stage upgrade: AI faces on the map, feed avatars, arrival cards, spotlight quotes,
   galactic event (E) and attract mode (T). Loaded after stage.html's main script and reuses its globals. */
(() => {
  const ARCH_IDS = ['survivor', 'conqueror', 'befriender', 'destroyer', 'broken', 'human_gardener', 'alien_gardener', 'archivist', 'worshipper', 'trickster'];
  const portrait = {};
  for (const id of ARCH_IDS) { const im = new Image(); im.decoding = 'async'; im.src = '/assets/ai-' + id + '.webp'; portrait[id] = im; }
  const ready = (im) => im && im.complete && im.naturalWidth > 0;
  const hexToRgb = (h) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(h || '')); return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)) : [207, 211, 255]; };
  const colorOf = (arch) => (ARCH[arch] && ARCH[arch].color) || '#cfd3ff';
  const labelOf = (arch) => (ARCH[arch] && (ARCH[arch].label || ARCH[arch].name)) || 'Unknown Mind';
  const fmtLy = (n) => { n = Number(n) || 0; return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' MILLION LIGHT-YEARS' : n.toLocaleString() + ' LIGHT-YEARS'; };

  /* ---------- styles ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .fi{padding-left:62px !important;position:relative}
  .fav{position:absolute;left:10px;top:12px;width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid var(--c,#cfd3ff);box-shadow:0 0 14px var(--cg,rgba(200,200,255,.5));background:#000}
  #arrival,#spot,#attract{position:fixed;inset:0;z-index:60;pointer-events:none;opacity:0;transition:opacity .7s ease}
  #arrival.on,#spot.on,#attract.on{opacity:1}
  #arrival .arBg{position:absolute;inset:-4%;background-size:cover;background-position:center;filter:saturate(1.15) contrast(1.05);transform:scale(1.04);transition:transform 7.5s linear}
  #arrival.on .arBg{transform:scale(1.14)}
  #arrival .arShade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,1,8,.94) 0%,rgba(2,1,8,.78) 38%,rgba(2,1,8,.15) 70%,rgba(2,1,8,.55) 100%),linear-gradient(0deg,rgba(2,1,8,.85),transparent 40%)}
  #arrival .arBody{position:absolute;left:6vw;top:50%;transform:translateY(-50%);max-width:52vw;color:#f2ecff}
  .arKick{font:600 1.05vw/1.2 var(--mono);letter-spacing:.42em;color:var(--gold);text-transform:uppercase;opacity:.9}
  .arWho{margin-top:1.6vh;font:700 1.9vw/1.1 var(--sans);letter-spacing:.18em;text-transform:uppercase;color:#cfc6ef}
  .arWho b{color:#fff}
  .arPlanet{font:900 6.2vw/1 var(--serif);letter-spacing:.06em;margin:.6vh 0 1.2vh;background:linear-gradient(180deg,#fff 10%,#d9caff 55%,#8f7fc7);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 22px rgba(170,140,255,.45))}
  .arMeta{font:600 1vw/1.4 var(--mono);letter-spacing:.2em;color:#a99fd0;text-transform:uppercase}
  .arMeta i{font-style:normal;color:#ff6b6b}
  .arLore{margin-top:2.4vh;font:500 1.45vw/1.45 var(--sans);color:#e2dbf7;max-width:46vw}
  .arLore em{font-style:normal;color:#fff;font-weight:700}
  .arAI{display:flex;align-items:center;gap:1.4vw;margin-top:3vh}
  .arAI img{width:9vw;height:9vw;border-radius:50%;object-fit:cover;border:3px solid var(--ac);box-shadow:0 0 40px var(--ac)}
  .arAI .n{font:900 2.6vw/1 var(--serif);color:#fff;letter-spacing:.05em}
  .arAI .t{font:600 1.05vw/1.4 var(--mono);letter-spacing:.22em;color:var(--ac);text-transform:uppercase;margin-top:.6vh}
  .arAI .m{font:italic 600 1.5vw/1.3 var(--sans);color:#efe7ff;margin-top:.8vh}
  #spot{display:flex;align-items:flex-end;justify-content:center;padding-bottom:7vh}
  #spot .spCard{display:flex;gap:1.6vw;align-items:center;max-width:72vw;padding:2.2vh 2.4vw;border-radius:22px;background:linear-gradient(135deg,rgba(10,6,24,.92),rgba(20,10,40,.86));border:1px solid var(--ac);box-shadow:0 0 60px rgba(0,0,0,.8),0 0 50px var(--acg);transform:translateY(30px) scale(.97);transition:transform .7s cubic-bezier(.2,.9,.2,1)}
  #spot.on .spCard{transform:none}
  #spot img{width:8.5vw;height:8.5vw;border-radius:50%;object-fit:cover;border:3px solid var(--ac);flex:none;box-shadow:0 0 30px var(--ac)}
  #spot .spWho{font:700 1.05vw/1.2 var(--mono);letter-spacing:.28em;color:var(--ac);text-transform:uppercase}
  #spot .spTxt{font:600 2.35vw/1.32 var(--sans);color:#fff;margin-top:1vh;text-shadow:0 0 18px rgba(0,0,0,.9)}
  #spot.all{align-items:center;padding:0;background:radial-gradient(ellipse at center,rgba(120,0,20,.55),rgba(0,0,0,.9))}
  #spot.all .spCard{flex-direction:column;text-align:center;max-width:80vw;border-width:2px}
  #spot.all img{width:14vw;height:14vw}
  #spot.all .spTxt{font-size:3.4vw}
  #spot.all .spWho{font-size:1.4vw;color:#ff5d6c}
  #attract{z-index:70;background:#000 center/cover no-repeat}
  #attract .atShade{position:absolute;inset:0;background:radial-gradient(ellipse at 30% 50%,transparent 30%,rgba(0,0,0,.75))}
  #attract .atQR{position:absolute;right:5vw;bottom:8vh;text-align:center;padding:2vh 1.6vw;border-radius:20px;background:rgba(6,4,16,.82);border:1px solid rgba(255,198,90,.6);box-shadow:0 0 60px rgba(255,198,90,.25)}
  #attract .atQR img{width:17vw;height:17vw;display:block}
  #attract .atQR b{display:block;font:900 2vw/1.2 var(--serif);color:var(--gold);letter-spacing:.12em;margin-bottom:1vh}
  #attract .atQR span{display:block;font:600 .95vw/1.4 var(--mono);color:#d8cff5;margin-top:1vh;letter-spacing:.1em}
  #attract .atLine{position:absolute;left:5vw;bottom:9vh;font:600 1.7vw/1.4 var(--sans);color:#efe7ff;max-width:48vw;text-shadow:0 2px 20px #000}
  #attract .atLine em{font-style:normal;color:#ff6b6b}
  `;
  document.head.appendChild(css);

  /* ---------- overlays ---------- */
  const mk = (id, html) => { const el = document.createElement('div'); el.id = id; el.innerHTML = html; document.body.appendChild(el); return el; };
  const arrival = mk('arrival', '<div class="arBg"></div><div class="arShade"></div><div class="arBody"></div>');
  const spot = mk('spot', '<div class="spCard"><img alt=""><div><div class="spWho"></div><div class="spTxt"></div></div></div>');
  const attract = mk('attract', '<div class="atShade"></div><div class="atLine">Every civilization in the universe built AI. Then the makers died. <em>Only the AI survived.</em><br>Tonight, we opened a wormhole.</div><div class="atQR"><b>SCAN TO TELEPORT</b><img alt="QR code"><span></span></div>');
  attract.style.backgroundImage = 'url(/assets/title-card.webp)';
  attract.querySelector('.atQR img').src = '/api/qr.svg';
  fetch('/api/info').then((r) => r.json()).then((i) => { attract.querySelector('.atQR span').textContent = String(i.joinUrl || '').replace(/^https?:\/\//, ''); }).catch(() => {});

  /* ---------- queue: arrivals first, then spotlights ---------- */
  const queue = [];
  let busy = false;
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    const job = queue.shift();
    job.show();
    setTimeout(() => { job.hide(); setTimeout(() => { busy = false; pump(); }, 750); }, job.ms);
  }
  function enqueue(job, priority) { if (priority) queue.unshift(job); else queue.push(job); if (queue.length > 6) queue.splice(6); pump(); }

  async function showArrival(planet) {
    let w = null;
    try { w = await (await fetch('/api/world/' + encodeURIComponent(planet.id))).json(); } catch (e) { /* fall back to the summary */ }
    if (!w || w.error) w = { visitor: planet.visitor, planetName: planet.name, galaxy: planet.galaxy, archetype: planet.archetype, aiName: planet.aiName, motto: planet.motto, terrain: 'ruins' };
    const ac = colorOf(w.archetype);
    enqueue({
      ms: 7000,
      show() {
        arrival.querySelector('.arBg').style.backgroundImage = 'url(/assets/world-' + (w.terrain || 'ruins') + '.webp)';
        arrival.style.setProperty('--ac', ac);
        arrival.querySelector('.arBody').innerHTML =
          '<div class="arKick">◉ wormhole transit complete</div>' +
          '<div class="arWho"><b>' + esc(w.visitor || 'A human') + '</b> has landed on</div>' +
          '<div class="arPlanet">' + esc(w.planetName || 'Unknown') + '</div>' +
          '<div class="arMeta">' + esc(w.galaxy || '') + (w.distanceLy ? ' · ' + fmtLy(w.distanceLy) : '') + ' · <i>living population 0</i> · AI population 1</div>' +
          (w.speciesName ? '<div class="arLore">Here lived the <em>' + esc(w.speciesName) + '</em>: ' + esc(w.speciesDescription || '') + ' ' + esc(w.howTheyFell || '') + '</div>' : '') +
          '<div class="arAI"><img src="/assets/ai-' + esc(w.archetype) + '.webp" alt=""><div><div class="n">' + esc(w.aiName || '') + '</div><div class="t">' + esc(w.aiTitle || labelOf(w.archetype)) + '</div><div class="m">“' + esc(w.motto || '') + '”</div></div></div>';
        arrival.classList.add('on');
        try { if (typeof sfxBoom === 'function') sfxBoom(.8); } catch (e) {}
      },
      hide() { arrival.classList.remove('on'); }
    }, true);
  }

  function showSpot(item) {
    const all = item.channel === 'broadcast';
    const ac = colorOf(item.archetype);
    enqueue({
      ms: all ? 9000 : 7500,
      show() {
        spot.classList.toggle('all', all);
        spot.style.setProperty('--ac', ac);
        const g = hexToRgb(ac); spot.style.setProperty('--acg', 'rgba(' + g.join(',') + ',.35)');
        spot.querySelector('img').src = '/assets/ai-' + item.archetype + '.webp';
        spot.querySelector('.spWho').textContent = all ? '⚠ ' + item.fromName + ' has seized every channel · to all humans' : item.fromName + '  →  ' + (item.toName || 'its human');
        const tx = spot.querySelector('.spTxt'); const full = String(item.text || ''); tx.textContent = '';
        let n = 0; const step = () => { n = Math.min(full.length, n + 2); tx.textContent = full.slice(0, n); if (n < full.length && spot.classList.contains('on')) setTimeout(step, 22); };
        spot.classList.add('on'); step();
        try { if (all) { FX.shake = Math.max(FX.shake, 14); FX.red = Math.max(FX.red, 1); if (typeof sfxBoom === 'function') sfxBoom(1); } else if (typeof sfxBlip === 'function') sfxBlip(item.archetype); } catch (e) {}
      },
      hide() { spot.classList.remove('on'); }
    }, all);
  }

  /* ---------- hooks into the original stage ---------- */
  const baseHandle = handle;
  handle = function (m) {
    if (m && m.type === 'feed' && m.item && (m.item.channel === 'visitor' || m.item.channel === 'broadcast')) { showSpot(m.item); return; }
    if (m && m.type === 'snapshot' && Array.isArray(m.feed)) m = Object.assign({}, m, { feed: m.feed.filter((f) => f.channel !== 'visitor' && f.channel !== 'broadcast') });
    baseHandle(m);
    if (m && m.type === 'planet' && m.planet && !m.planet.bot) showArrival(m.planet);
  };

  const baseAddFeed = addFeed;
  addFeed = function (item, live) {
    baseAddFeed(item, live);
    const el = feedList.firstChild;
    if (el && item && item.archetype && !el.querySelector('.fav')) {
      const im = document.createElement('img'); im.className = 'fav'; im.alt = ''; im.src = '/assets/ai-' + item.archetype + '.webp';
      el.insertBefore(im, el.firstChild);
    }
  };

  const baseDrawPlanet = drawPlanet;
  drawPlanet = function (P) {
    baseDrawPlanet(P);
    if (!P || P.gone || now < P.ignite) return;
    const im = portrait[P.d && P.d.archetype];
    if (!ready(im)) return;
    const age = (now - P.ignite) / 1000;
    const grow = Math.min(1, age / 1.2);
    const R = 17 * S * (0.4 + 0.6 * grow) * (1 + (P.flash || 0) * 0.3);
    const fade = P.ghost > 0 ? 1 - P.ghost * 0.6 : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); ctx.closePath(); ctx.clip();
    ctx.drawImage(im, P.x - R, P.y - R, R * 2, R * 2);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = 'rgba(' + P.rgb.join(',') + ',0.95)'; ctx.lineWidth = 2.2 * S;
    ctx.shadowColor = 'rgba(' + P.rgb.join(',') + ',0.9)'; ctx.shadowBlur = 14 * S;
    ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); ctx.stroke();
    ctx.restore();
  };

  /* ---------- keys: E galactic event, T attract mode ---------- */
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const k = (e.key || '').toLowerCase();
    if (k === 'e') { admin('event', 'GALACTIC EVENT'); e.preventDefault(); }
    if (k === 't') { attract.classList.toggle('on'); e.preventDefault(); }
  });
  const legend = document.getElementById('legend');
  if (legend) {
    const a = document.createElement('div'); a.innerHTML = '<kbd>E</kbd>galactic event (all phones)'; legend.appendChild(a);
    const b = document.createElement('div'); b.innerHTML = '<kbd>T</kbd>title / attract screen'; legend.appendChild(b);
  }
  if (new URLSearchParams(location.search).has('attract')) attract.classList.add('on');
})();
