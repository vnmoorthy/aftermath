import { actors } from "../generated/index.js"
const base = "http://localhost:3000"
const list: any[] = await (actors.Universe.get("universe-1") as any).listPlanets()
console.log("planets:", list.map(p => `${p.aiName}(${p.archetype})`).join(", "))
await fetch(base + "/api/admin/vote/open", { method: "POST" })
const choices = ["open", "open", "seal", "open", "seal", "open", "open", "seal"]
for (let i = 0; i < choices.length; i++) {
  const p = list[i % list.length]
  await fetch(base + "/api/vote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceId: "judge-" + i, planetId: p.id, choice: choices[i] }) })
}
const t = Date.now()
const r: any = await (await fetch(base + "/api/admin/vote/close", { method: "POST" })).json()
console.log("CLOSE", Date.now() - t, "ms", r.outcome, `${r.vote?.yes} open / ${r.vote?.no} seal`)
console.log("REPORT:", r.report?.text)
console.log("NARRATION:", r.narration)
const ex: any = await (await fetch(base + "/api/export")).json()
console.log("EXPORT worlds", ex.worlds.length, "memory rows", ex.worlds.reduce((n: number, w: any) => n + w.memory.length, 0))
process.exit(0)
