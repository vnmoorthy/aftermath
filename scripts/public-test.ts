const base = process.argv[2]
let t = Date.now()
const page = await fetch(base + "/p"); console.log("GET /p", page.status, (await page.text()).length, "bytes", Date.now() - t, "ms")
t = Date.now()
const tp: any = await (await fetch(base + "/api/teleport", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Stranger", deviceId: "public-test-1" }) })).json()
console.log("TELEPORT", Date.now() - t, "ms ->", tp.world?.planetName, "/", tp.world?.aiName, "/", tp.world?.archetype)
const ws = new WebSocket(base.replace("https", "wss") + tp.ws)
let got = 0
ws.onopen = () => console.log("WSS open via tunnel")
ws.onmessage = e => { const m = JSON.parse(String(e.data)); if (m.type === "line") { got++; console.log("LINE", m.line.kind, ":", m.line.text.slice(0, 110)) } }
await Bun.sleep(5000)
await fetch(base + "/api/say", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planetId: tp.planetId, deviceId: "public-test-1", text: "Tell me a joke your makers used to tell." }) })
await Bun.sleep(6000)
const img = await fetch(base + "/assets/world-" + (tp.world?.terrain || "ruins") + ".webp"); console.log("ART", img.status, (await img.arrayBuffer()).byteLength, "bytes")
console.log("lines received over wss:", got); ws.close(); process.exit(0)
