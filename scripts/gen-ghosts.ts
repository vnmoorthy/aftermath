// Ghost-planet art with gpt-image-2: landscape, AI ghost portrait, transparent ghost sprites, a jump-scare face.
import OpenAI from "openai"
import { writeFileSync } from "node:fs"
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const STYLE = "Photorealistic cinematic horror, volumetric fog, cold moonlight, film grain, ultra detailed, no text, no logos."
const jobs: any[] = [
  { file: "world-haunted.webp", size: "1536x1024", fmt: "webp", prompt: `A ghost planet: a fog-drowned alien necropolis under a dead moon, hundreds of pale translucent ghosts of an extinct civilization standing motionless among the ruins, all turned toward the viewer, faint blue spectral light, one ghost much closer than the others. ${STYLE}` },
  { file: "ai-haunted.webp", size: "1024x1024", fmt: "webp", prompt: `Portrait of an AI ghost: the warden of a dead world's uploaded souls, a pale translucent humanoid figure woven from cold blue light and static, hollow glowing eyes, faint faces of other ghosts trapped inside its body, dark background. Deeply unsettling but PG-13. ${STYLE}` },
  { file: "ghost-1.webp", size: "1024x1536", fmt: "webp", prompt: `A single full-body translucent ghost of a tall alien-humanoid woman in tattered ceremonial robes, glowing pale blue-white, wispy edges fading into mist, arms slightly raised, on a PURE BLACK background (#000000, no fog, no floor). Photorealistic horror.` },
  { file: "ghost-2.webp", size: "1024x1536", fmt: "webp", prompt: `A single full-body translucent faceless ghost figure in a long hooded shroud, glowing cold cyan-white, trailing mist, floating, on a PURE BLACK background (#000000, no fog, no floor). Photorealistic horror.` },
  { file: "ghost-3.webp", size: "1024x1536", fmt: "webp", prompt: `A single translucent ghost of an old alien-humanoid man with long hollow eyes, glowing pale white, half dissolved into smoke from the waist down, reaching forward, on a PURE BLACK background (#000000, no fog, no floor). Photorealistic horror.` },
  { file: "ghost-face.webp", size: "1024x1024", fmt: "webp", prompt: `Extreme close-up of a pale translucent ghost face with hollow black eyes and an open mouth mid-scream, glowing faintly blue, emerging from pure black darkness. Terrifying jump scare, PG-13, no gore. ${STYLE}` },
]
await Promise.all(jobs.filter(j => j.file.startsWith("ghost-") && j.file !== "ghost-face.webp").map(async (j) => {
  const t = Date.now()
  try {
    const r: any = await client.images.generate({ model: "gpt-image-2", prompt: j.prompt, size: j.size, quality: "medium", output_format: j.fmt, ...(j.fmt === "webp" ? { output_compression: 72 } : {}), ...(j.transparent ? { background: "transparent" } : {}) } as any, { timeout: 200000 })
    writeFileSync(`web/assets/${j.file}`, Buffer.from(r.data[0].b64_json, "base64")); console.log("ok", j.file, Date.now() - t, "ms")
  } catch (e: any) { console.log("ERR", j.file, e.status, e.message?.slice(0, 200)) }
}))
process.exit(0)
