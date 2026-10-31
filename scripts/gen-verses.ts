// Realm art for the cosmic zoom, with gpt-image-2. Square, dark, centered, so layers can crossfade.
import OpenAI from "openai"
import { writeFileSync } from "node:fs"
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const STYLE = "Cinematic scientific visualization in the style of NASA Hubble and JWST imagery, deep black background, centered composition, luminous, ultra detailed, no text, no logos, no people."
const jobs: [string, string][] = [
  ["omniverse", "the Omniverse: an infinite foam of countless glowing soap-bubble realities of every color, each bubble containing whole multiverses, receding into infinity"],
  ["megaverse", "a Megaverse: enormous clusters of bubble-multiverses strung along glowing filaments like grapes of light"],
  ["multiverse", "the Multiverse: a branching tree of luminous bubble universes budding from each other in an inflationary foam"],
  ["hyperverse", "a Hyperverse: a higher-dimensional reality, glowing tesseract lattices folding through themselves, impossible four-dimensional geometry"],
  ["xenoverse", "a Xenoverse: a fundamentally alien reality with physics unlike ours, liquid geometry, inverted colors, crystalline light rivers"],
  ["universe", "our observable universe as the cosmic web: glowing filaments and voids of dark matter with galaxy clusters at the nodes, like the Illustris simulation"],
  ["supercluster", "the Laniakea supercluster: streams of thousands of galaxies flowing toward a great attractor, golden and blue"],
  ["microverse", "a microverse: an entire tiny universe of galaxies glowing inside a small sealed battery-like glass and metal canister on a dark workbench, sci-fi"],
  ["nanoverse", "a nanoverse: a universe the size of a molecule, galaxies drifting among glowing atoms and electron clouds"],
  ["quantumverse", "the Quantumverse: Planck-scale quantum foam, flickering virtual particles and shimmering probability waves, spacetime boiling"],
]
await Promise.all(jobs.map(async ([id, d]) => {
  const t = Date.now()
  try {
    const r: any = await client.images.generate({ model: "gpt-image-2", prompt: `${d}. ${STYLE}`, size: "1024x1024", quality: "medium", output_format: "webp", output_compression: 70 } as any, { timeout: 200000 })
    writeFileSync(`web/assets/verse-${id}.webp`, Buffer.from(r.data[0].b64_json, "base64")); console.log("ok", id, Date.now() - t, "ms")
  } catch (e: any) { console.log("ERR", id, e.status, e.message?.slice(0, 160)) }
}))
process.exit(0)
