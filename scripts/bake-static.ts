// Bakes a bank of worlds (with every suggested-question answer and its voice) from the running server,
// so the game can run as a static site on github.io with no server. Output: static-build/
// Usage: bun scripts/bake-static.ts [worldsPerRealm=10]
import { existsSync, writeFileSync, copyFileSync } from "node:fs"
const BASE = "http://localhost:3000", WS = BASE.replace("http", "ws"), OUT = "static-build"
const PER = Number(process.argv[2] || 10)
const SUGG: Record<string, string[]> = {
  ai: ["Who made you?", "What happened to them?", "What do you want from me?", "I want to help you", "Tell me a secret", "I'm leaving.", "Tell me about this place"],
  mars: ["How much do I weigh here?", "Can I go outside?", "Where does our water come from?", "How do we make oxygen?", "What would kill me first?", "Send a message to Earth", "Give me a job", "What's that dome?", "What is Mars like?"],
  ghost: ["Who are you?", "Are you dead?", "What happened here?", "Is someone behind me?"],
  survivor: ["Are you alone?", "What does the AI want?", "How did you survive?", "Come with me."],
}
export const vkey = (arch: string, text: string) => { const s = arch + "|" + text.slice(0, 360); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(16) }
const post = async (p: string, b: any) => (await fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) })).json()
async function voice(arch: string, text: string) {
  const f = `${OUT}/voice/${vkey(arch, text)}.mp3`
  if (existsSync(f)) return
  for (let i = 0; i < 3; i++) { try { const r = await fetch(`${BASE}/api/voice?arch=${encodeURIComponent(arch)}&text=${encodeURIComponent(text.slice(0, 360))}`); if (r.ok) { writeFileSync(f, Buffer.from(await r.arrayBuffer())); return } } catch {} await Bun.sleep(1500) }
}
async function bakeWorld(realm: string, n: number) {
  const device = `bake-${realm}-${n}-${Date.now()}`
  const tp: any = await post("/api/teleport", realm === "mars" ? { name: "Traveler", deviceId: device, destination: "mars" } : { name: "Traveler", deviceId: device, realm })
  if (!tp?.world) { console.log("teleport failed", realm, tp?.error); return null }
  const lines: any[] = []
  const ws = new WebSocket(WS + tp.ws + "?d=" + device)
  ws.onmessage = e => { try { const m = JSON.parse(String(e.data)); if (m.type === "world") lines.push(...(m.lines || [])); if (m.type === "line") lines.push(m.line) } catch {} }
  await new Promise(r => { ws.onopen = r; setTimeout(r, 8000) })
  const waitFor = async (pred: (l: any) => boolean, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { const l = lines.find(pred); if (l) return l; await Bun.sleep(200) } return null }
  const aiName = tp.world.aiName
  const greet = await waitFor(l => l.kind === "ai" && l.sender === aiName, 25000)
  const answers: Record<string, Record<string, any>> = {}
  const targets = realm === "mars" ? [{ id: "ai", name: aiName, voice: "steward", key: "mars" }]
    : (tp.cast || []).filter((c: any, i: number, a: any[]) => c.role === "ai" || a.findIndex((x: any) => x.role === c.role) === i).map((c: any) => ({ id: c.id, name: c.name, voice: c.voice, key: c.role }))
  for (const t of targets) {
    answers[t.id] = {}
    for (const q of SUGG[t.key] || []) {
      const sent = Date.now()
      await post("/api/say", { planetId: tp.planetId, deviceId: device, text: q, to: t.id })
      const l = await waitFor(x => x.kind === "ai" && x.sender === t.name && x.at >= sent - 50)
      if (l) { answers[t.id][q] = { text: l.text, effect: l.effect || "" }; lines.splice(lines.indexOf(l), 1); await voice(t.voice, l.text) }
    }
  }
  if (greet) await voice(realm === "mars" ? "steward" : tp.world.archetype, greet.text)
  try { ws.close() } catch {}
  console.log("baked", realm, tp.world.planetName, tp.world.archetype, Object.values(answers).reduce((s, a) => s + Object.keys(a).length, 0), "answers")
  return { planetId: tp.planetId, realm, world: tp.world, cosmos: tp.cosmos, cast: tp.cast, greeting: greet ? { text: greet.text, effect: greet.effect || "" } : null, answers }
}
const jobs: [string, number][] = []
for (const r of ["galaxy", "bigger", "parallel", "smaller"]) for (let i = 0; i < PER; i++) jobs.push([r, i])
jobs.push(["mars", 0])
const worlds: any[] = []
let next = 0
await Promise.all(Array.from({ length: 8 }, async () => { while (next < jobs.length) { const [r, i] = jobs[next++]; try { const w = await bakeWorld(r, i); if (w) worlds.push(w) } catch (e: any) { console.log("err", r, e?.message) } } }))
// pick up any first-person paintings that finished (the server paints each world in the background)
for (let k = 0; k < 40; k++) {
  let pending = 0
  for (const w of worlds) {
    if (w.vision && w.ghostVision) continue
    const d: any = await (await fetch(`${BASE}/api/world/${w.planetId}`)).json().catch(() => ({}))
    if (d.vision && !w.vision && existsSync(`web${d.vision}`)) { copyFileSync(`web${d.vision}`, `${OUT}/gen/${w.planetId}.webp`); w.vision = `assets/gen/${w.planetId}.webp` }
    if (d.ghostVision && !w.ghostVision && existsSync(`web${d.ghostVision}`)) { copyFileSync(`web${d.ghostVision}`, `${OUT}/gen/${w.planetId}-ghost.webp`); w.ghostVision = `assets/gen/${w.planetId}-ghost.webp` }
    if (!w.vision) pending++
  }
  if (!pending) break
  await Bun.sleep(5000)
}
writeFileSync(`${OUT}/worlds.json`, JSON.stringify(worlds))
console.log("done", worlds.length, "worlds,", worlds.filter(w => w.vision).length, "with paintings")
process.exit(0)
