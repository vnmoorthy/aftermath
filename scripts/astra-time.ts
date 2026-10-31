import OpenAI from "openai"
const c = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
for (const m of ["gpt-6-astra", "gpt-6.1-terra"]) {
  const t = Date.now()
  try {
    const r: any = await c.chat.completions.create({ model: m, reasoning_effort: "low", response_format: { type: "json_object" }, messages: [{ role: "system", content: "Output JSON only." }, { role: "user", content: 'Invent a dead planet. JSON keys: planetName, speciesName, speciesDescription (<=22 words), howTheyFell (<=24 words), aiName, aiTitle, appearance (<=24 words), secret (<=18 words), wants (<=12 words), greeting (<=40 words).' }] } as any, { timeout: 30000 })
    console.log(m, Date.now() - t, "ms", (r.usage?.completion_tokens), "tokens out")
  } catch (e: any) { console.log(m, "ERR", Date.now() - t, e.message) }
}
process.exit(0)
