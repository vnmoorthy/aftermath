import { actors } from "../generated/index.js"
const t = Date.now()
try {
  const u: any = actors.Universe.get("smoke-universe")
  console.log("listPlanets", await Promise.race([u.listPlanets(), new Promise((_, r) => setTimeout(() => r(new Error("timeout 8s")), 8000))]), Date.now() - t, "ms")
} catch (e: any) { console.log("ERR", e?.message, Date.now() - t, "ms") }
process.exit(0)
