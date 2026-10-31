// Generates the art for the cosmic journey, the instant first-person scenes, people figures, cast portraits
// and ghost versions of each scene (gpt-image-2). Existing files are skipped, so it is safe to re-run.
// Usage: bun --env-file=.env scripts/gen-journey-art.ts
import OpenAI, { toFile } from "openai"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const A = "web/assets/"
const SPACE = "Cinematic scientific visualization, NASA Hubble/JWST style, deep black space, the subject perfectly centered and filling about 60% of a square frame, luminous, ultra detailed, no text, no labels, no logos, no people."
const FP = "First-person point of view at eye level, as if you just stepped out of a wormhole. Photorealistic, cinematic, volumetric light, wide-angle, ground visible in the lower third, portrait orientation, no text, no people."
const KEY = "Photorealistic, rim light, on a perfectly flat solid pure green (#00FF00) background, centered, entire body visible with space around it, no shadow on the background, no text."
type Job = { file: string; prompt: string; size?: string; edit?: string }
const jobs: Job[] = []
const space = (file: string, d: string) => jobs.push({ file: `verse-${file}.webp`, prompt: `${d}. ${SPACE}` })
space("metaverse", "the Metaverse: interconnected reality systems, glowing bubble universes linked by luminous threads like a neural network")
space("macroverse", "the Macroverse: colossal cosmic web, filaments of galaxies forming great walls around dark voids")
space("gigaverse", "the Gigaverse: thousands of glowing bubble universes packed together like sea foam")
space("teraverse", "the Teraverse: a gigantic luminous sphere containing countless tiny universes")
space("milliverse", "the Milliverse: a tiny glowing universe inside a single dust mote floating in a sunbeam")
space("picoverse", "the Picoverse: a crystal atomic lattice with a miniature cosmos glowing between the atoms")
space("femtoverse", "the Femtoverse: inside an atomic nucleus, protons and neutrons glowing like a cluster of stars")
space("attoverse", "the Attoverse: quarks and gluon fields swirling like colorful nebulae")
space("zeptoverse", "the Zeptoverse: vibrating luminous superstrings and loops of energy in a void")
space("yoctoverse", "the Yoctoverse: shimmering quantum fields and probability clouds")
space("earth", "planet Earth from space, NASA Blue Marble style, the full disk centered, thin blue atmosphere glowing at the limb")
space("sun", "our Sun, a yellow G-type star, full disk centered with solar flares and a glowing corona, NASA SDO style")
space("star", "an unfamiliar alien red giant star with huge prominences, full disk centered")
space("localgroup", "the Local Group of galaxies: the Milky Way and Andromeda spirals with small satellite galaxies, wide deep field")
space("galaxygroup", "a distant group of a few spiral and elliptical galaxies, Hubble deep field")
space("milkyway", "the Milky Way galaxy seen from outside, a face-on barred spiral with a golden core")
space("lmc", "the Large Magellanic Cloud, an irregular dwarf galaxy with pink star-forming nebulae")
space("andromeda", "the Andromeda Galaxy M31, a huge spiral galaxy seen at an angle")
space("triangulum", "the Triangulum Galaxy M33, a face-on loose spiral with pink nebulae")
space("whirlpool", "the Whirlpool Galaxy M51 with its small companion galaxy, face-on spiral")
space("sombrero", "the Sombrero Galaxy M104, edge-on with a dark dust lane and a bright bulge")
space("pinwheel", "the Pinwheel Galaxy M101, a face-on grand design spiral")
space("centaurusa", "the galaxy Centaurus A, an elliptical galaxy crossed by a dark dust lane with blue relativistic jets")
space("titan", "Saturn's moon Titan, a hazy orange globe, with Saturn's rings behind it")
space("europa", "Jupiter's moon Europa, a cracked icy globe, with Jupiter looming behind")
space("battery", "an old sealed car battery in a dark garage, macro photo, a tiny galaxy glowing through a crack in its casing")
space("raindrop", "a single methane raindrop on Titan, macro, a tiny universe glowing inside it")
space("snowflake", "one snowflake on ice, macro photograph, a tiny cosmos glowing at its center")
space("diamond", "a brilliant diamond, macro, a single glowing carbon atom lattice visible inside")
space("proton", "a proton visualized: three glowing quarks bound by gluon flux tubes")
space("quark", "a single quark glowing in a foaming sea of virtual particles, abstract physics visualization")
space("neutrino", "a ghostly neutrino trail passing through layers of matter, a faint blue streak")
const TERRAIN: Record<string, string> = {
  crystal: "a field of giant glowing crystal spires under a violet sky, shattered alien monuments",
  ocean: "a dark endless ocean with drowned alien towers rising from the waves under a storm sky",
  desert: "a red desert of wind-carved dunes with half-buried colossal alien statues under two suns",
  jungle: "an alien jungle swallowing a ruined city, bioluminescent plants, drifting mist",
  ice: "a frozen world with an alien city entombed under glassy glaciers, aurora in the sky",
  lava: "a volcanic world of black rock and rivers of lava around a scorched alien citadel",
  ruins: "a vast ruined alien megacity of shattered towers under a dim orange sky, blowing dust",
  gas: "a floating alien platform city in the clouds of a gas giant, colossal storm bands below",
  metal: "a planet-wide dead machine city of dark metal, cables and dead lights in fog",
  fungal: "a forest of towering glowing fungi over collapsed alien domes, spores drifting",
  haunted: "a fog-drowned alien necropolis of pale towers and empty streets under a sickly moon",
}
for (const [t, d] of Object.entries(TERRAIN)) jobs.push({ file: `fp-${t}.webp`, prompt: `${d}. Traces of an extinct alien civilization everywhere; in the distance a towering silent machine intelligence glows faintly. ${FP}`, size: "1024x1536" })
jobs.push({ file: "fp-mars.webp", prompt: `Standing outside a small human research base in Jezero crater on Mars at golden hour: white habitat domes, a greenhouse glowing green, solar panels, a six-wheeled rover, red dust and rocks, butterscotch sky. Realistic, NASA concept-art accuracy. ${FP}`, size: "1024x1536" })
jobs.push({ file: "figure-a.webp", prompt: `A full-body human explorer in a sleek modern spacesuit seen from directly behind, standing still and looking ahead. ${KEY}`, size: "1024x1536" })
jobs.push({ file: "figure-b.webp", prompt: `A full-body human traveler in a hooded long coat over light armor, three-quarter back view, standing. ${KEY}`, size: "1024x1536" })
jobs.push({ file: "figure-c.webp", prompt: `A full-body human astronaut in a white suit facing slightly to the side, standing. ${KEY}`, size: "1024x1536" })
const PORTRAIT = "Photorealistic cinematic portrait, head and shoulders, dark background, rim light, no text."
jobs.push({ file: "cast-survivor-human.webp", prompt: `A young human with wild hair and makeshift clothes of alien fabric, raised alone by a machine on a dead alien world, curious wary eyes. ${PORTRAIT}` })
jobs.push({ file: "cast-survivor-alien.webp", prompt: `A small strange alien hatchling with large luminous eyes and soft iridescent skin, curious. ${PORTRAIT}` })
jobs.push({ file: "cast-survivor-cryo.webp", prompt: `An alien being just woken from cryosleep, frost on its pale skin, lit by a glowing cryo-pod, exhausted eyes. ${PORTRAIT}` })
jobs.push({ file: "cast-survivor-feral.webp", prompt: `The last surviving alien of its species, gaunt and hooded, hiding in ruins, fearful eyes catching the light. ${PORTRAIT}` })
const GHOST_EDIT = "Add two faint, translucent ghosts of the extinct alien makers standing in the mid-ground of this exact scene: pale, semi-transparent, softly glowing, as if accidentally caught on camera. Keep everything else identical: same composition, lighting, colors and details. Photorealistic, subtle, eerie. No text."
const edits: Job[] = Object.keys(TERRAIN).map(t => ({ file: `fp-${t}-ghost.webp`, prompt: GHOST_EDIT, size: "1024x1536", edit: `fp-${t}.webp` }))

async function run(j: Job) {
  if (existsSync(A + j.file)) return
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const common = { model: "gpt-image-2", prompt: j.prompt, size: j.size || "1024x1024", quality: "low", output_format: "webp", output_compression: 70 } as any
      const r: any = j.edit
        ? await client.images.edit({ ...common, image: await toFile(readFileSync(A + j.edit), "scene.webp", { type: "image/webp" }) }, { timeout: 200000 })
        : await client.images.generate(common, { timeout: 200000 })
      writeFileSync(A + j.file, Buffer.from(r.data[0].b64_json, "base64")); console.log("ok", j.file); return
    } catch (e: any) { console.log("retry", j.file, e?.status || "", (e?.message || "").slice(0, 100)); await Bun.sleep(4000 * (attempt + 1)) }
  }
  console.log("FAILED", j.file)
}
async function pool(list: Job[], n: number) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < list.length) await run(list[i++]) })) }
// Scenes, figures and portraits first (players see them first), then space art, then ghost edits of the scenes.
const first = jobs.filter(j => !j.file.startsWith("verse-")), later = jobs.filter(j => j.file.startsWith("verse-"))
await pool([...first, ...later], 10)
await pool(edits.filter(e => existsSync(A + e.edit!)), 8)
process.exit(0)
