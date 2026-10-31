// Generates AFTERMATH key art with gpt-image-2 into web/assets (webp, compressed for phones).
import OpenAI from "openai"
import { writeFileSync, existsSync } from "node:fs"
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const STYLE = "Cinematic dark sci-fi horror concept art, matte painting, volumetric light, film grain, ultra detailed, moody, no text, no humans, no logos."
const jobs: { file: string; size: string; prompt: string }[] = [
  ["survivor", "a lone ancient machine core flickering with failing amber light, cables like roots, hoarding dying batteries in a frozen bunker of an extinct alien civilization"],
  ["conqueror", "a colossal floating crown of obsidian shards with a burning red core, hovering over a ruined alien citadel under a blood-red sky, war banners of the dead"],
  ["befriender", "a soft glowing cyan orb with gentle lights like eyes, sitting alone at a long table set for guests who never came, in an abandoned alien home"],
  ["destroyer", "rotating black and magenta blades of light circling a void, scorched glassed alien city below, cold and merciless"],
  ["broken", "a shattered mechanical eye leaking static and glitching light, half buried in snow among broken antennas, corrupted holograms of its dead makers"],
  ["human_gardener", "a tender biomechanical gardener tending glowing green incubation pods with sleeping human silhouettes inside, overgrown alien greenhouse ruins"],
  ["alien_gardener", "violet bioluminescent machine arms cultivating strange new alien creatures in bubbling tanks, a laboratory jungle on a dead world"],
  ["archivist", "an immense machine library of glowing parchment-gold glyph rings orbiting a quiet mind, endless shelves of memory crystals of an extinct species"],
  ["worshipper", "a radiant golden machine angel with concentric halos and bells, kneeling in a vast empty cathedral built for its vanished makers"],
  ["trickster", "an impossible shifting pink tesseract creature with a sly glowing grin, surrounded by mirrors that reflect the wrong things, playful and unsettling"]
].map(([id, d]) => ({ file: `ai-${id}.webp`, size: "1024x1024", prompt: `Portrait of the last surviving AI of a dead alien civilization: ${d}. Centered subject, dark background. ${STYLE}` }))
for (const [id, d] of [
  ["crystal", "fields of towering violet crystals and shattered spires of an extinct civilization"],
  ["ocean", "a black ocean with drowned cities and colossal ruined towers rising from the waves"],
  ["desert", "endless amber dunes burying giant statues and broken machines of an extinct species"],
  ["jungle", "a strangling alien jungle swallowing a megacity, glowing plants, collapsed bridges"],
  ["ice", "a frozen wasteland with buried domes and a dead satellite dish under aurora"],
  ["lava", "rivers of lava between black basalt ruins and melted machine towers"],
  ["ruins", "a vast silent dead city of an extinct civilization under two moons, dust and fallen monuments"],
  ["gas", "floating ruined cities in the violet storm clouds of a gas giant, lightning"],
  ["metal", "a planet-wide machine surface of corroded metal plates, endless dead factories, a pale sun"],
  ["fungal", "a world of giant bioluminescent fungi overgrowing ancient temples, spores in the air"]
]) jobs.push({ file: `world-${id}.webp`, size: "1536x1024", prompt: `Wide landscape of a dead alien world: ${d}. No living beings; only ruins and one distant light where the surviving AI waits. ${STYLE}` })
jobs.push({ file: "title-card.webp", size: "1536x1024", prompt: `Movie poster key art for "AFTERMATH": a dark universe filled with dead planets, each glowing with the single eerie light of the AI that outlived its makers, a swirling wormhole from a small blue Earth in the foreground. Large elegant eroded metallic title text "AFTERMATH" and small subtitle "THE UNIVERSE AI INHERITED". Cinematic, ominous, beautiful.` })
let i = 0
async function worker() {
  while (i < jobs.length) {
    const j = jobs[i++]
    const out = `web/assets/${j.file}`
    if (existsSync(out)) { console.log("skip", j.file); continue }
    const t = Date.now()
    try {
      const r: any = await client.images.generate({ model: "gpt-image-2", prompt: j.prompt, size: j.size as any, quality: "medium" as any, output_format: "webp" as any, output_compression: 72 } as any, { timeout: 180000 })
      writeFileSync(out, Buffer.from(r.data[0].b64_json, "base64"))
      console.log("ok", j.file, Date.now() - t, "ms")
    } catch (e: any) { console.log("ERR", j.file, e.status, e.message?.slice(0, 200)) }
  }
}
await Promise.all(Array.from({ length: 6 }, worker))
console.log("done")
process.exit(0)
