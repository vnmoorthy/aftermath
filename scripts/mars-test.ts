const base = "http://localhost:3000"
const tp: any = await (await fetch(base + "/api/teleport", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Moorthy", deviceId: "mars-dev-1", destination: "mars" }) })).json()
console.log("MARS", tp.planetId, tp.world?.planetName, tp.world?.aiName, tp.world?.terrain)
const ws = new WebSocket("ws://localhost:3000" + tp.ws)
ws.onmessage = e => { const m = JSON.parse(String(e.data)); if (m.type === "line") console.log("LINE", m.line.kind, "|", m.line.sender, ":", m.line.text) }
await Bun.sleep(7000)
await fetch(base + "/api/say", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planetId: "mars-colony", deviceId: "mars-dev-1", text: "I'll go fix the oxygen generator. How cold is it outside?" }) })
await Bun.sleep(7000)
const ev: any = await (await fetch(base + "/api/admin/mars", { method: "POST" })).json()
console.log("EVENT", ev.status)
await Bun.sleep(3000)
ws.close(); process.exit(0)
