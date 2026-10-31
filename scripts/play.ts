// End-to-end smoke: teleport, watch the planet socket, talk to the AI.
const base = "http://localhost:3000"
let t = Date.now()
const tp: any = await (await fetch(base + "/api/teleport", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Moorthy", deviceId: "dev-" + Date.now() }) })).json()
console.log("TELEPORT", Date.now() - t, "ms", tp.planetId, "|", tp.world?.planetName, "|", tp.world?.galaxy, "|", tp.world?.aiName, "|", tp.world?.archetype, "|", tp.world?.motto)
console.log("  species:", tp.world?.speciesName, "-", tp.world?.speciesDescription)
console.log("  fell:", tp.world?.howTheyFell)
const ws = new WebSocket(base.replace("http", "ws") + tp.ws)
ws.onmessage = e => { const m = JSON.parse(String(e.data)); if (m.type === "world") console.log("WS world", m.world?.aiName, "lines", m.lines?.length); else if (m.type === "line") console.log("WS line", m.line.kind, m.line.effect || "-", "|", m.line.sender, ":", m.line.text); else console.log("WS", m.type) }
ws.onopen = () => console.log("WS open")
ws.onclose = e => console.log("WS closed", e.code, e.reason)
await Bun.sleep(5000)
t = Date.now()
await fetch(base + "/api/say", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planetId: tp.planetId, deviceId: "x", text: "What happened to your makers?" }) })
await Bun.sleep(6000)
console.log("INSPECT", JSON.stringify(await (await fetch(base + "/api/inspect/" + tp.planetId)).json()).slice(0, 300))
ws.close(); process.exit(0)
