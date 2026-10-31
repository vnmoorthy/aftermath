import OpenAI from "openai"
import { writeFileSync } from "node:fs"
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const STYLE = "Photorealistic cinematic concept art, NASA-grade realism, volumetric light, film grain, no text, no logos."
const jobs = [
  { file: "world-mars.webp", size: "1536x1024", prompt: `Wide landscape of Ares Base, the first human habitat on Mars: inflatable white domes half covered in red regolith, a greenhouse glowing inside, a pressurized rover, solar arrays coated in dust, Jezero crater rim, a dust storm wall approaching on the horizon, butterscotch sky with a small blue Earth dot in the twilight. Empty, waiting for its first humans. ${STYLE}` },
  { file: "ai-steward.webp", size: "1024x1024", prompt: `Portrait of HAVEN, the calm habitat AI of the first Mars colony: a softly glowing warm orange ring of light set into the curved wall of a habitat module, status displays showing oxygen and power, a window with the red Martian landscape behind. Protective, gentle, trustworthy. Centered subject. ${STYLE}` },
]
await Promise.all(jobs.map(async (j) => {
  const t = Date.now()
  try {
    const r: any = await client.images.generate({ model: "gpt-image-2", prompt: j.prompt, size: j.size as any, quality: "medium" as any, output_format: "webp" as any, output_compression: 72 } as any, { timeout: 180000 })
    writeFileSync(`web/assets/${j.file}`, Buffer.from(r.data[0].b64_json, "base64")); console.log("ok", j.file, Date.now() - t, "ms")
  } catch (e: any) { console.log("ERR", j.file, e.message) }
}))
process.exit(0)
