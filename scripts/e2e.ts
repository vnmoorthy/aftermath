// End-to-end test of every AFTERMATH flow against a running server.
// Usage: bun scripts/e2e.ts [baseUrl]   (default http://localhost:3000)
const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "")
const wsBase = base.replace(/^http/, "ws")
let pass = 0, fail = 0
const results: string[] = []
function ok(name: string, cond: boolean, detail = "") {
  if (cond) pass++; else fail++
  const line = `${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  -  " + detail : ""}`
  results.push(line); console.log(line)
}
const j = async (path: string, body?: unknown) => {
  const r = await fetch(base + path, body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  let data: any = null; try { data = await r.json() } catch {}
  return { status: r.status, data }
}
function listen(path: string) {
  const ws = new WebSocket(wsBase + path)
  const msgs: any[] = []
  ws.onmessage = e => { try { msgs.push(JSON.parse(String(e.data))) } catch {} }
  const opened = new Promise<boolean>(res => { ws.onopen = () => res(true); ws.onerror = () => res(false); setTimeout(() => res(false), 8000) })
  const waitFor = async (pred: (m: any) => boolean, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { const m = msgs.find(pred); if (m) return m; await Bun.sleep(150) } return null }
  return { ws, msgs, opened, waitFor }
}
const t0 = Date.now()

// 1. pages + static
for (const [path, min] of [["/stage", 50000], ["/p", 20000], ["/api/qr.svg", 500], ["/assets/ai-conqueror.webp", 20000], ["/assets/world-mars.webp", 20000], ["/assets/title-card.webp", 20000]] as const) {
  const r = await fetch(base + path); const n = (await r.arrayBuffer()).byteLength
  ok(`GET ${path}`, r.status === 200 && n > min, `${r.status}, ${n} bytes`)
}
const info = await j("/api/info"); ok("GET /api/info", info.status === 200 && !!info.data?.joinUrl, info.data?.joinUrl)

// 2. stage socket
const stage = listen("/ws/stage")
ok("stage websocket opens", await stage.opened)
ok("stage receives snapshot", !!(await stage.waitFor(m => m.type === "snapshot", 8000)))

// 3. teleport + greeting + chat
const A = "e2e-a-" + Date.now(), B = "e2e-b-" + Date.now(), C = "e2e-c-" + Date.now()
let t = Date.now()
const tp = await j("/api/teleport", { name: "Ada", deviceId: A })
const w = tp.data?.world
ok("teleport creates a world", tp.status === 200 && !!w?.planetName && !!w?.aiName && !!w?.speciesName, `${Date.now() - t} ms: ${w?.planetName} / ${w?.aiName} (${w?.archetype})`)
ok("stage sees the new planet", !!(await stage.waitFor(m => m.type === "planet" && m.planet?.id === tp.data?.planetId, 8000)))
const pa = listen(tp.data.ws)
ok("planet websocket opens", await pa.opened)
ok("planet sends world on connect", !!(await pa.waitFor(m => m.type === "world" && m.world?.id === tp.data.planetId, 8000)))
const greet = await pa.waitFor(m => m.type === "line" && m.line?.kind === "ai", 15000)
ok("AI greets the visitor", !!greet, greet?.line?.text?.slice(0, 90))
t = Date.now()
await j("/api/say", { planetId: tp.data.planetId, deviceId: A, text: "What do you want from me?" })
const rep = await pa.waitFor(m => m.type === "line" && m.line?.kind === "ai" && m.line?.id !== greet?.line?.id, 15000)
ok("AI replies to the player", !!rep, `${Date.now() - t} ms: ${rep?.line?.text?.slice(0, 90)}`)

// 4. world / inspect / worlds
const wd = await j("/api/world/" + tp.data.planetId); ok("GET /api/world/:id", wd.status === 200 && wd.data?.id === tp.data.planetId)
const ins = await j("/api/inspect/" + tp.data.planetId); ok("GET /api/inspect/:id (actor SQLite)", ins.status === 200 && ins.data?.memories >= 3, `memories ${ins.data?.memories}, cycles ${ins.data?.cycles}`)
const wl = await j("/api/worlds"); ok("GET /api/worlds lists the new world", !!wl.data?.worlds?.some((x: any) => x.id === tp.data.planetId), `${wl.data?.worlds?.length} worlds`)

// 5. portal visit as a guest
await j("/api/teleport", { name: "Grace", deviceId: B }).catch(() => null)
const vis = await j("/api/visit", { planetId: tp.data.planetId, deviceId: B, name: "Grace" })
ok("portal visit to another world", vis.status === 200 && vis.data?.planetId === tp.data.planetId && vis.data?.guest === true)
const guestHi = await pa.waitFor(m => m.type === "line" && m.line?.kind === "ai" && /grace/i.test(m.line?.text || ""), 15000)
ok("AI greets the guest by name", !!guestHi, guestHi?.line?.text?.slice(0, 90))
await j("/api/say", { planetId: tp.data.planetId, deviceId: B, text: "Who else is here with me?" })
const guestPlayer = await pa.waitFor(m => m.type === "line" && m.line?.kind === "player" && m.line?.sender === "Grace", 8000)
ok("guest line is attributed to the guest", !!guestPlayer)
const guestRep = await pa.waitFor(m => m.type === "line" && m.line?.kind === "ai" && m.line?.at > (guestPlayer?.line?.at || 0), 15000)
ok("AI answers the guest", !!guestRep, guestRep?.line?.text?.slice(0, 90))

// 6. Mars
const mt = await j("/api/teleport", { name: "Neil", deviceId: C, destination: "mars" })
ok("teleport to Mars", mt.status === 200 && mt.data?.planetId === "mars-colony" && mt.data?.world?.aiName === "HAVEN")
const pm = listen(mt.data.ws)
ok("Mars websocket opens", await pm.opened)
const welcome = await pm.waitFor(m => m.type === "line" && m.line?.kind === "ai" && /neil/i.test(m.line?.text || ""), 15000)
ok("HAVEN welcomes the colonist by name", !!welcome, welcome?.line?.text?.slice(0, 90))
ok("colony status line", !!(await pm.waitFor(m => m.type === "line" && m.line?.kind === "system" && /^SOL \d+/.test(m.line?.text || ""), 8000)))
await j("/api/say", { planetId: "mars-colony", deviceId: C, text: "How much do I weigh here?" })
const mrep = await pm.waitFor(m => m.type === "line" && m.line?.kind === "ai" && m.line?.at > (welcome?.line?.at || 0), 15000)
ok("HAVEN answers with Mars science", !!mrep, mrep?.line?.text?.slice(0, 90))
const mev = await j("/api/admin/mars", {})
ok("Mars colony event", mev.status === 200 && /^SOL/.test(mev.data?.status || ""), mev.data?.status)

// 7. galactic event reaches phones + stage
const ev = await j("/api/admin/event", {})
ok("galactic event", ev.status === 200 && ev.data?.ok === true, ev.data?.text?.slice(0, 90))
ok("galactic event shakes phones", !!(await pa.waitFor(m => m.type === "line" && m.line?.kind === "network" && m.line?.effect === "shake", 8000)))
ok("galactic event hits the stage", !!(await stage.waitFor(m => m.type === "feed" && m.item?.channel === "broadcast", 8000)))

// 8. AI-to-AI network traffic over Agent Relay
const dm = await stage.waitFor(m => m.type === "feed" && (m.item?.channel === "dm" || m.item?.channel === "wormhole"), 25000)
ok("AI-to-AI transmissions on the stage feed", !!dm, dm ? `${dm.item.fromName} -> ${dm.item.toName || "#" + dm.item.channel}: ${dm.item.text.slice(0, 60)}` : "")

// 9. vote + finale + persuasion report
const vo = await j("/api/admin/vote/open", {}); ok("vote opens", vo.status === 200 && vo.data?.vote?.open === true)
ok("phones receive the vote", !!(await pa.waitFor(m => m.type === "vote" && m.vote?.open, 8000)))
const v1 = await j("/api/vote", { planetId: tp.data.planetId, deviceId: A, choice: "open" })
const v2 = await j("/api/vote", { planetId: "mars-colony", deviceId: C, choice: "seal" })
const v3 = await j("/api/vote", { planetId: tp.data.planetId, deviceId: A, choice: "seal" })
ok("votes count once per device", v1.data?.vote?.yes >= 1 && v2.data?.vote?.no >= 1 && v3.data?.vote?.voters === v2.data?.vote?.voters, `voters ${v3.data?.vote?.voters}`)
t = Date.now()
const vc = await j("/api/admin/vote/close", {})
ok("finale narrated", vc.status === 200 && !!vc.data?.narration && ["opened", "sealed"].includes(vc.data?.outcome), `${Date.now() - t} ms, ${vc.data?.outcome}`)
ok("persuasion report", !!vc.data?.report?.text, vc.data?.report?.text?.slice(0, 100))
ok("phones receive the finale", !!(await pa.waitFor(m => m.type === "finale", 8000)))
ok("stage receives the finale", !!(await stage.waitFor(m => m.type === "finale", 8000)))

// 10. dataset export
const ex = await j("/api/export"); ok("GET /api/export dataset", ex.status === 200 && ex.data?.worlds?.length > 0, `${ex.data?.worlds?.length} worlds`)

for (const s of [stage, pa, pm]) try { s.ws.close() } catch {}
console.log(`\n${pass} passed, ${fail} failed in ${Math.round((Date.now() - t0) / 1000)} s`)
process.exit(fail ? 1 : 0)
