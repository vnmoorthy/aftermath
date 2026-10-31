const out: string[] = []
await Promise.all(Array.from({ length: 5 }, async (_, i) => {
  const d: any = await (await fetch("http://localhost:3000/api/teleport", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Judge" + i, deviceId: "vt-" + i + "-" + Date.now() }) })).json()
  out.push(`${d.world.planetName} (${d.world.galaxy}, ${d.world.terrain}) - ${d.world.aiName}, ${d.world.archetype}`)
}))
console.log(out.join("\n")); process.exit(0)
