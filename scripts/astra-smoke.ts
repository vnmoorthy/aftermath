import OpenAI from "openai"
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const msgs = [{ role: "system" as const, content: "You are the world-builder for a game where every civilization built AI and only the AI survived. Output JSON only." },
  { role: "user" as const, content: 'Invent one dead planet for a visitor named Sam. Its AI is a lonely Befriender. JSON keys: planetName, speciesName, howTheyFell (<=24 words), aiName, greeting (<=40 words to Sam).' }]
for (const [label, extra] of [["astra-default", {}], ["astra-low", { reasoning_effort: "low" }], ["astra-none", { reasoning_effort: "none" }]] as const) {
  const t = Date.now()
  try {
    const r: any = await client.chat.completions.create({ model: "gpt-6-astra", messages: msgs, response_format: { type: "json_object" }, ...(extra as any) })
    console.log(label, Date.now() - t, "ms\n ", r.choices[0].message.content?.slice(0, 420))
  } catch (e: any) { console.log(label, "ERR", Date.now() - t, "ms", e.status, e.message?.slice(0, 200)) }
}
process.exit(0)
