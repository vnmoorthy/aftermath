import OpenAI from "openai"
import { writeFileSync } from "node:fs"
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const STYLE = "Cinematic scientific visualization, NASA Hubble/JWST style, deep black background, centered, luminous, ultra detailed, no text, no logos, no people."
const realms: [string, string][] = [
  ["necroverse", "the Necroverse: a reality where only the dead persist, pale translucent souls drifting through grey nebulae like jellyfish"],
  ["dreamverse", "the Dreamverse: a universe built from dreams, floating impossible islands, soft surreal pastel galaxies"],
  ["echoverse", "the Echoverse: fading concentric echoes of ended universes, rippling rings of dying light"],
  ["mirrorverse", "the Mirrorverse: an inverted mirror universe, galaxies reflected in a liquid silver plane, inverted colors"],
  ["chronoverse", "the Chronoverse: universes stacked in time like translucent layers, clock-like rings, every epoch at once"],
  ["shadowverse", "the Shadowverse: the dark-matter twin universe, black galaxies outlined by faint violet halos"],
  ["glitchverse", "the Glitchverse: an abandoned simulated universe corrupted mid-render, pixel sorting, RGB-split galaxies, wireframe voids"],
  ["simverse", "the Simverse: nested simulations, a universe inside a glowing grid inside another grid, recursive"],
  ["memoryverse", "the Memoryverse: a universe that exists inside an AI's memory, glowing neural constellations and data synapses"],
  ["paraverse", "the Paraverse: near-identical parallel universes splitting from one decision point like a prism of copies"],
  ["antiverse", "the Antiverse: an antimatter universe, galaxies of inverted light annihilating in brilliant white flashes at its borders"],
  ["voidverse", "the Voidverse: the silent nothing between universes, a vast black void with faint distant bubble-universes"],
  ["fractalverse", "the Fractalverse: self-similar galaxies repeating at every scale, infinite Mandelbrot-like spirals"],
  ["dataverse", "the Dataverse: reality made of pure information, galaxies of flowing glowing code and luminous data streams"],
  ["foldverse", "the Foldverse: universes folded like origami into hidden dimensions, glowing creased sheets of spacetime"],
]
await Promise.all(realms.map(async ([id, d]) => {
  try {
    const r: any = await client.images.generate({ model: "gpt-image-2", prompt: `${d}. ${STYLE}`, size: "1024x1024", quality: "low", output_format: "webp", output_compression: 70 } as any, { timeout: 200000 })
    writeFileSync(`web/assets/verse-${id}.webp`, Buffer.from(r.data[0].b64_json, "base64")); console.log("ok", id)
  } catch (e: any) { console.log("ERR", id, e.message?.slice(0, 120)) }
}))
process.exit(0)
