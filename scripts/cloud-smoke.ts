// Calls the Terse Cloud deployment of our actors directly (Universe.listPlanets + Planet round trip).
process.env.TERSE_ACTOR_URL = process.env.TERSE_CLOUD_URL
process.env.TERSE_API_KEY = process.env.TERSE_CLOUD_API_KEY
const { actors } = await import("../generated/index.js")
const t0 = Date.now()
const u: any = actors.Universe.get("cloud-smoke")
const before = await u.listPlanets()
await u.registerPlanet({ id: "p-cloud-1", name: "Cloudhaven", galaxy: "Andromeda", archetype: "archivist", aiName: "Ledger", motto: "Nothing is forgotten.", visitor: "Smoke", color: "#e8d5a3", x: 0.4, y: 0.3, createdAt: Date.now(), bot: true })
const after = await u.listPlanets()
const p: any = actors.Planet.get("p-cloud-1")
await p.create({ id: "p-cloud-1", visitor: "Smoke", planetName: "Cloudhaven", starName: "Tau", galaxy: "Andromeda", distanceLy: 2537000, terrain: "ruins", sky: "#111111", ground: "#222222", accent: "#e8d5a3", speciesName: "the Quiet", speciesDescription: "test", howTheyFell: "test", aiName: "Ledger", aiTitle: "Keeper", archetype: "archivist", motto: "Nothing is forgotten.", appearance: "test", secret: "test", wants: "test", createdAt: Date.now() }, "")
await p.addLine("ai", "Hello from Terse Cloud.", "", "Ledger")
const ins = await p.inspect()
const grant: any = await actors.Planet.prepareWebsocket({ actorId: "p-cloud-1", metadata: { role: "visitor" } } as any)
console.log("cloud ok:", before.length, "->", after.length, "planets;", "memories", ins.memories, "; ws grant", String(grant.websocketUrl).slice(0, 40) + "...", ";", Date.now() - t0, "ms total")
process.exit(0)
