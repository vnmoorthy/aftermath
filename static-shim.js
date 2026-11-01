// AFTERMATH static mode: lets the phone page run with no server (e.g. on github.io).
// Answers the page's /api/* calls and planet websocket from a pre-baked bank of worlds (worlds.json),
// with pre-generated answers to every suggested question and their voices (voice/<key>.mp3).
(() => {
  'use strict';
  const realFetch = window.fetch.bind(window);
  const bank = realFetch('worlds.json').then((r) => r.json()).then((ws) => ws.map((w) => JSON.parse(JSON.stringify(w).split('"assets/').join('"assets/')))).catch(() => []);
  const vkey = (arch, text) => { const s = arch + '|' + String(text).slice(0, 360); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const json = (d, status) => new Response(JSON.stringify(d), { status: status || 200, headers: { 'content-type': 'application/json' } });
  const sockets = new Map(); // planetId -> FakeSocket
  const names = {}; let lineN = 0;
  const line = (kind, text, effect, sender) => ({ id: 'L' + (++lineN) + '-' + Date.now(), kind, text, effect: effect || '', sender: sender || '', at: Date.now() });
  const emit = (pid, msg) => { const s = sockets.get(pid); if (s && s.readyState === 1 && s.onmessage) s.onmessage({ data: JSON.stringify(msg) }); };
  const words = (t) => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  function pickAnswer(answers, text) {
    const keys = Object.keys(answers || {}); if (!keys.length) return null;
    const exact = keys.find((k) => k.toLowerCase() === String(text).trim().toLowerCase()); if (exact) return answers[exact];
    const q = words(text); let best = null, score = 0;
    keys.forEach((k) => { const s = words(k).filter((w) => q.includes(w)).length; if (s > score) { score = s; best = k; } });
    return answers[best || keys[Math.floor(Math.random() * keys.length)]];
  }
  async function worldFor(id) { return (await bank).find((w) => w.planetId === id); }
  async function teleport(b) {
    const all = await bank; if (!all.length) return json({ error: 'no worlds baked' }, 500);
    let pool = b.destination === 'mars' ? all.filter((w) => w.realm === 'mars') : all.filter((w) => w.realm !== 'mars' && (!b.realm || w.realm === b.realm));
    const used = JSON.parse(store.get('aftermath.static.used') || '[]');
    const fresh = pool.filter((w) => !used.includes(w.planetId)); if (fresh.length) pool = fresh;
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (w.realm !== 'mars') { used.push(w.planetId); store.set('aftermath.static.used', JSON.stringify(used.slice(-200))); }
    names[w.planetId] = b.name || 'Traveler';
    const world = Object.assign({}, w.world, { visitor: b.name || w.world.visitor });
    return json({ planetId: w.planetId, world, cosmos: w.cosmos, cast: w.cast, ws: '/ws/planet/' + w.planetId, guest: false });
  }
  async function say(b) {
    const w = await worldFor(b.planetId); if (!w) return json({ ok: false }, 400);
    const me = names[b.planetId] || store.get('aftermath.name') || 'Traveler';
    emit(b.planetId, { type: 'line', line: line('player', b.text, '', me) });
    if (b.to === 'people') return json({ ok: true });
    const to = b.to && w.answers[b.to] ? b.to : 'ai';
    const member = (w.cast || []).find((c) => c.id === to) || { name: w.world.aiName };
    const a = pickAnswer(w.answers[to], b.text) || { text: '...the signal wavers. Ask me something else.', effect: 'glitch' };
    setTimeout(() => emit(b.planetId, { type: 'line', line: line('ai', a.text, a.effect, member.name) }), 1200 + Math.random() * 900);
    if (w.realm === 'mars') setTimeout(() => emit(b.planetId, { type: 'line', line: line('system', marsStatus(), '', 'colony') }), 2600);
    return json({ ok: true });
  }
  let sol = 214; const mars = { o2: 97, power: 90, water: 88, food: 76 };
  function marsStatus() { for (const k in mars) mars[k] = Math.max(40, Math.min(100, mars[k] + Math.round(Math.random() * 4 - 2))); return `SOL ${sol} · O2 ${mars.o2}% · POWER ${mars.power}% · WATER ${mars.water}% · FOOD ${mars.food}% · CREW 1`; }
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const i = url.pathname.indexOf('/api/'); if (i < 0) return realFetch(input, init);
    const p = url.pathname.slice(i); let b = {}; try { b = JSON.parse((init && init.body) || '{}'); } catch (e) {}
    if (p === '/api/teleport' || p === '/api/visit') return teleport(p === '/api/visit' ? Object.assign({}, b, { realm: '' }) : b);
    if (p === '/api/say') return say(b);
    if (p === '/api/voice') { const r = await realFetch('voice/' + vkey(url.searchParams.get('arch') || '', url.searchParams.get('text') || '') + '.mp3'); return r.ok ? r : new Response('', { status: 404 }); }
    if (p.startsWith('/api/world/')) { const w = await worldFor(decodeURIComponent(p.slice(11))); return w ? json(Object.assign({}, w.world, { cosmos: w.cosmos, cast: w.cast, vision: w.vision || '', ghostVision: w.ghostVision || '' })) : json({ error: 'unknown planet' }, 404); }
    if (p === '/api/worlds') return json({ worlds: (await bank).slice(0, 40).map((w) => Object.assign({ id: w.planetId, tier: w.cosmos.tier, people: 0, bot: true }, w.world)) });
    if (p === '/api/vote') return json({ vote: { open: false, yes: 0, no: 0, voters: 0 } });
    if (p === '/api/archive') return json({ enabled: false });
    return json({ ok: true });
  };
  const RealWS = window.WebSocket;
  class FakeSocket {
    constructor(url) {
      const m = /\/ws\/planet\/([^?]+)/.exec(url); this.pid = m ? decodeURIComponent(m[1]) : ''; this.readyState = 0; sockets.set(this.pid, this);
      setTimeout(async () => {
        const w = await worldFor(this.pid); this.readyState = 1; this.onopen && this.onopen({});
        if (!w) return;
        emit(this.pid, { type: 'world', world: w.world, lines: [] });
        emit(this.pid, { type: 'presence', people: [{ name: names[this.pid] || store.get('aftermath.name') || 'Traveler', key: 'me', you: true }] });
        if (w.greeting) setTimeout(() => emit(this.pid, { type: 'line', line: line('ai', w.greeting.text, w.greeting.effect, w.world.aiName) }), 900);
        if (w.realm === 'mars') setTimeout(() => emit(this.pid, { type: 'line', line: line('system', marsStatus(), '', 'colony') }), 1800);
        if (w.vision) setTimeout(() => emit(this.pid, { type: 'line', line: line('system', '[[vision:' + w.vision + ']]', '', 'vision') }), 2500);
        if (w.ghostVision) setTimeout(() => emit(this.pid, { type: 'line', line: line('system', '[[ghost:' + w.ghostVision + ']]', '', 'vision') }), 2600);
      }, 60);
    }
    send() {}
    close() { this.readyState = 3; if (sockets.get(this.pid) === this) sockets.delete(this.pid); }
  }
  window.WebSocket = function (url, proto) { return /\/ws\//.test(url) ? new FakeSocket(url) : new RealWS(url, proto); };
  window.WebSocket.OPEN = 1; window.WebSocket.CLOSED = 3;
  window.AFTERMATH_STATIC = true;
})();
