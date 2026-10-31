const base = "http://localhost:3000"
const seen: string[] = []
for (let i = 0; i < 8; i++) {
  const d: any = await (await fetch(base + "/api/teleport", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Tester" + i, deviceId: "gt-" + i + "-" + Date.now() }) })).json()
  seen.push(`${d.world.planetName}/${d.world.archetype}/${d.world.terrain}`)
  if (d.world.archetype === "haunted") {
    console.log("GHOST PLANET:", d.world.planetName, "|", d.world.aiName, "|", d.world.aiTitle)
    console.log("  appearance:", d.world.appearance); console.log("  secret:", d.world.secret)
    const t = Date.now(); const v = await fetch(base + "/api/voice?arch=haunted&text=" + encodeURIComponent("Don't turn around. They followed you home."))
    console.log("  VOICE", v.status, v.headers.get("content-type"), (await v.arrayBuffer()).byteLength, "bytes", Date.now() - t, "ms")
    break
  }
}
console.log("scans:", seen.join("  |  "))
process.exit(0)
