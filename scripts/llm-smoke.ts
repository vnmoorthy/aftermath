import OpenAI from "openai"
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const msgs = [{ role: "system" as const, content: "Output JSON only." }, { role: "user" as const, content: 'You are a broken AI on a dead ice planet. Greet a human named Sam in <= 30 words. JSON: {"text": "..."}' }]
for (const [label, extra] of [["terra-default", {}], ["terra-low", { reasoning_effort: "low" }], ["terra-none", { reasoning_effort: "none" }], ["luna-default", { model: "gpt-6-luna" }]] as const) {
  const t = Date.now()
  try {
    const r: any = await client.chat.completions.create({ model: "gpt-6.1-terra", messages: msgs, response_format: { type: "json_object" }, ...(extra as any) })
    console.log(label, Date.now() - t, "ms", r.choices[0].message.content?.slice(0, 160))
  } catch (e: any) { console.log(label, "ERR", Date.now() - t, "ms", e.status, e.message?.slice(0, 160)) }
}
process.exit(0)
