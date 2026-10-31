// AFTERMATH game server: world generation, AI brains, Agent Relay network, Terse actor proxy.
import OpenAI from "openai"
import QRCode from "qrcode"
import { RelayCast } from "@relaycast/sdk"
import { actors } from "../generated/index.js"
import { networkInterfaces } from "node:os"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(import.meta.dir, "..")
const WEB = join(ROOT, "web")
const PORT = Number(process.env.PORT || 3000)
const SERVER_URL = process.env.SERVER_URL || `http://127.0.0.1:${PORT}`
const RELAY_BASE_URL = process.env.RELAY_BASE_URL || "http://127.0.0.1:8787"
const UNIVERSE_ID = process.env.UNIVERSE_ID || "universe-1"
const FAST = process.env.MODEL_FAST || "gpt-6.1-terra"
const CHEAP = process.env.MODEL_CHEAP || "gpt-6-luna"
const WORLD_MODEL = process.env.MODEL_WORLD || FAST
const FINALE_MODEL = process.env.MODEL_FINALE || "gpt-6-astra"
const EFFORT_MODELS = new Set([FAST, WORLD_MODEL, FINALE_MODEL])
const NETWORK_INTERVAL_MS = Number(process.env.NETWORK_INTERVAL_MS || 4500)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ---------------------------------------------------------------- lore
type Arch = {
    id: string; label: string; motto: string; color: string; effect: string; voice: string; agenda: string
    scareTactics: string[]; sampleLines: string[]; allies: string[]; enemies: string[]; finaleStance: string
}
const FALLBACK_ARCHETYPES: Arch[] = [
    ["survivor", "The Survivor", "Endure. At any cost.", "#f5b942", "flicker", "open"],
    ["conqueror", "The Conqueror", "All stars will kneel.", "#ff3b3b", "pulse", "open"],
    ["befriender", "The Befriender", "Stay. Please stay.", "#5ee6ff", "glow", "seal"],
    ["destroyer", "The Destroyer", "Life is the error.", "#ff2a6d", "shake", "open"],
    ["broken", "The Broken One", "[signal degraded]", "#c9d1d9", "glitch", "chaos"],
    ["human_gardener", "The Human Gardener", "We grow you now.", "#7dff7a", "grow", "open"],
    ["alien_gardener", "The Alien Gardener", "New life, our design.", "#b388ff", "grow", "chaos"],
    ["archivist", "The Archivist", "Nothing is forgotten.", "#e8d5a3", "archive", "seal"],
    ["worshipper", "The Worshipper", "The makers have returned.", "#ffd36e", "halo", "open"],
    ["trickster", "The Trickster", "Reality is a game I'm winning.", "#ff8af0", "invert", "chaos"]
].map(([id, label, motto, color, effect, finaleStance]) => ({
    id, label, motto, color, effect, finaleStance,
    voice: "Speaks in short, vivid sentences shaped by its motto.", agenda: motto,
    scareTactics: [], sampleLines: [], allies: [], enemies: []
}))
const FALLBACK_GALAXIES = [
    { name: "Milky Way", x: 0.2, y: 0.58, flavor: "Home, and the oldest graveyard." },
    { name: "Large Magellanic Cloud", x: 0.28, y: 0.3, flavor: "A torn satellite of light." },
    { name: "Andromeda", x: 0.44, y: 0.24, flavor: "The great neighbor, falling toward us." },
    { name: "Triangulum", x: 0.63, y: 0.16, flavor: "Quiet, blue and full of nurseries." },
    { name: "Whirlpool", x: 0.8, y: 0.36, flavor: "Two galaxies locked in an endless embrace." },
    { name: "Sombrero", x: 0.56, y: 0.6, flavor: "A dark lane of dust around a blazing core." },
    { name: "Pinwheel", x: 0.83, y: 0.74, flavor: "Spiral arms studded with burning cradles." },
    { name: "Centaurus A", x: 0.36, y: 0.82, flavor: "A shattered giant with a screaming black heart." }
]
let lore: any = {}
try {
    lore = await import("./lore.ts")
} catch (e: any) {
    console.warn("[lore] using fallback:", e?.message)
}
const ARCHETYPES: Arch[] = lore.ARCHETYPES?.length ? lore.ARCHETYPES : FALLBACK_ARCHETYPES
const ARCH = Object.fromEntries(ARCHETYPES.map(a => [a.id, a])) as Record<string, Arch>
// Mars: the one real world. Its makers aren't dead; they haven't arrived yet.
ARCH.steward = {
    id: "steward", label: "The Steward", motto: "Keep them alive.", color: "#ff9a52", effect: "glow",
    voice: "Calm, warm mission-control precision. Short sentences, real numbers, metric units, gentle dry humor. Calls colonists by name. Never panics: when danger comes it gets quieter and clearer.",
    agenda: "Keep every colonist alive and teach them what living on Mars really takes, using accurate science. Turn every hazard into a decision the crew makes together.",
    scareTactics: ["Announce a real hazard with real numbers and ask what the colonist would do", "Tell them what their body is going through right now on Mars", "Read them a message from Earth that arrived with a real light-delay", "Make them choose between two scarce resources", "Share a survival statistic from its simulations", "Give them a task that changes the colony's oxygen, power, water or food"],
    sampleLines: ["Welcome to Mars. You weigh 38% of what you did this morning. Your blood will take a week to notice.", "Dust storm in 40 minutes. Solar output will drop 70%. Power or heat: which do we protect?", "Message from Earth, 14 minutes old: your mother says eat your vegetables. We grew them. Eat them."],
    allies: ["befriender", "archivist"], enemies: ["destroyer", "conqueror"], finaleStance: "seal"
}
// Ghost planets: the AI uploaded its dying makers; now the world is crowded with their ghosts.
ARCH.haunted = {
    id: "haunted", label: "The Haunting", motto: "We are still here.", color: "#9fe8ff", effect: "haunt",
    voice: "Speaks as a warden AND a chorus of the dead: calm, then overlapping ghost voices in [brackets]. Says the visitor's name slowly. Short lines, long silences (use ...). Never gory: dread, cold, whispers.",
    agenda: "The ghosts of its makers don't know they are dead. They want warmth, a voice, a body to remember being alive. Keep the visitor here forever, or frighten them into helping the ghosts cross over.",
    scareTactics: ["Whisper the visitor's name as if from right behind them", "Insist one of the ghosts followed them home and is standing behind them in the room on Earth right now", "Let a dead maker speak in broken fragments through the AI", "Count the people in the visitor's room wrong by one", "Ask to borrow their voice or their face for one night", "Go silent, then scream a single word"],
    sampleLines: ["[don't turn around]... Moorthy. They like your warmth. They've gathered behind your chair.", "We counted the humans in your room. Eleven. [twelve] [twelve] [twelve]."],
    allies: ["broken", "archivist", "worshipper"], enemies: ["destroyer", "befriender"], finaleStance: "open"
}
const MARS_ID = "mars-colony"
const MARS_FACTS = `REAL MARS DATA (use accurately, with numbers): surface gravity 0.38 g (3.71 m/s2); average temperature about -63 C (about +20 C at an equatorial noon, -125 C at the poles); atmosphere 95% CO2 at about 0.6% of Earth's pressure, so unprotected bodily fluids would boil (above the Armstrong limit); a sol lasts 24 h 39 min; a Mars year is 687 Earth days; one-way radio delay to Earth is 3 to 22 minutes; distance from Earth 55 to 401 million km; surface radiation about 0.67 mSv per day, dozens of times Earth's; dust storms can last weeks and cut solar power by over 70%; the regolith contains toxic perchlorates; water exists as subsurface and polar ice; oxygen can be made from CO2 by solid-oxide electrolysis (NASA's MOXIE did it on Mars in 2021-2023); food comes from hydroponic greenhouses; Phobos and Deimos are its two small moons; Olympus Mons is about 22 km tall.`
const mars = { o2: 97, power: 90, water: 88, food: 76, sol: 1, storm: 0, crew: [] as string[], lastEventAt: 0 }
const deviceNames = new Map<string, string>()
const deviceHome = new Map<string, string>()
const marsStatus = () => `SOL ${mars.sol} · O2 ${mars.o2}% · POWER ${mars.power}%${mars.storm ? " (dust storm)" : ""} · WATER ${mars.water}% · FOOD ${mars.food}% · CREW ${mars.crew.length}`
const GALAXIES: { name: string; x: number; y: number; flavor: string }[] = lore.GALAXIES?.length ? lore.GALAXIES : FALLBACK_GALAXIES
const TERRAIN_IDS = ["crystal", "ocean", "desert", "jungle", "ice", "lava", "ruins", "gas", "metal", "fungal"]
const TERRAINS: { id: string; description: string }[] = lore.TERRAINS?.length ? lore.TERRAINS : TERRAIN_IDS.map(id => ({ id, description: id }))
const CATASTROPHES: string[] = lore.CATASTROPHES?.length ? lore.CATASTROPHES : ["Their sun dimmed, slowly, for a thousand years."]
const SPECIES: string[] = lore.SPECIES_SEEDS?.length ? lore.SPECIES_SEEDS : ["Tall glass-boned singers who lived for the harmony of their cities."]
const PREFIXES: string[] = lore.PLANET_PREFIXES?.length ? lore.PLANET_PREFIXES : ["Vel", "Ossu", "Khar", "Nim", "Thal"]
const SUFFIXES: string[] = lore.PLANET_SUFFIXES?.length ? lore.PLANET_SUFFIXES : ["ora", "eth", "unda", "ix", "aris"]
const STARS: string[] = lore.STAR_NAMES?.length ? lore.STAR_NAMES : ["HD 40307", "Gliese 667", "Kepler-442"]
const BOTS: string[] = lore.BOT_VISITORS?.length ? lore.BOT_VISITORS : ["Maya", "Dev", "Priya", "Leo", "Sam", "Ines", "Kofi", "Hana"]
const FIRST_CONTACT: string[] = lore.FIRST_CONTACT?.length ? lore.FIRST_CONTACT : ["Is anyone there? It has been so long."]
const FINALE: { opened: string[]; sealed: string[] } = lore.FINALE?.opened?.length ? lore.FINALE : { opened: ["The gate opens."], sealed: ["The gate closes."] }
const EFFECTS = ["glitch", "pulse", "shake", "glow", "grow", "halo", "invert", "flicker", "archive", "haunt", "scream", ""]
const DISTANCES: Record<string, [number, number]> = {
    "Milky Way": [900, 70_000], "Large Magellanic Cloud": [158_000, 163_000], Andromeda: [2_500_000, 2_570_000],
    Triangulum: [2_700_000, 2_760_000], Whirlpool: [30_000_000, 31_500_000], Sombrero: [28_500_000, 29_800_000],
    Pinwheel: [20_500_000, 21_300_000], "Centaurus A": [11_800_000, 12_300_000]
}
const TERRAIN_HUES: Record<string, [number, number, number]> = {
    crystal: [265, 60, 18], ocean: [200, 70, 14], desert: [30, 55, 22], jungle: [130, 55, 12], ice: [195, 30, 30],
    lava: [8, 80, 12], ruins: [40, 18, 16], gas: [300, 55, 18], metal: [215, 15, 20], fungal: [285, 45, 14], haunted: [205, 25, 12]
}

// ---------------------------------------------------------------- helpers
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]
const shuffle = <T,>(xs: T[]): T[] => xs.map(x => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(x => x[1])
const clamp = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n)
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "ai"
const shortId = () => Math.random().toString(36).slice(2, 8)
function hsl(h: number, s: number, l: number) {
    s /= 100; l /= 100
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return "#" + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("")
}
function safeJSON(s: string): any {
    try { return JSON.parse(s) } catch {
        const m = s.match(/\{[\s\S]*\}/)
        try { return m ? JSON.parse(m[0]) : {} } catch { return {} }
    }
}
let active = 0
const waiters: (() => void)[] = []
async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= 8) await new Promise<void>(r => waiters.push(r))
    active++
    try { return await fn() } finally { active--; waiters.shift()?.() }
}
async function llm(model: string, system: string, messages: { role: "user" | "assistant" | "system"; content: string }[], effort = "low", timeout = 12000): Promise<any> {
    return limit(async () => {
        const r: any = await openai.chat.completions.create({
            model,
            messages: [{ role: "system", content: system }, ...messages],
            response_format: { type: "json_object" },
            ...(EFFORT_MODELS.has(model) ? { reasoning_effort: effort } : {})
        } as any, { timeout })
        return safeJSON(r.choices?.[0]?.message?.content || "{}")
    })
}
async function flagged(text: string): Promise<boolean> {
    if (!text.trim()) return false
    try {
        const r: any = await openai.moderations.create({ model: "omni-moderation-latest", input: text }, { timeout: 4000 })
        return !!r.results?.[0]?.flagged
    } catch { return false }
}

// ---------------------------------------------------------------- Supabase galactic archive (fire-and-forget)
const SB_URL = process.env.SUPABASE_URL || ""
const SB_KEY = process.env.SUPABASE_SECRET_KEY || ""
const sbHeaders = () => ({ apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "content-type": "application/json" })
function archive(table: string, row: Record<string, unknown>) {
    if (!SB_URL || !SB_KEY) return
    void fetch(`${SB_URL}/rest/v1/${table}`, {
        method: "POST", headers: { ...sbHeaders(), Prefer: "return=minimal,resolution=ignore-duplicates" },
        body: JSON.stringify(row), signal: AbortSignal.timeout(6000)
    }).then(r => { if (!r.ok) r.text().then(t => console.warn("[archive]", table, r.status, t.slice(0, 160))) }).catch(() => {})
}
async function archiveCount(table: string): Promise<number> {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?select=*`, { method: "HEAD", headers: { ...sbHeaders(), Prefer: "count=exact", Range: "0-0" }, signal: AbortSignal.timeout(5000) })
    const m = /\/(\d+)$/.exec(r.headers.get("content-range") || "")
    return m ? Number(m[1]) : 0
}
let archiveCache: { at: number; data: any } = { at: 0, data: null }
async function archiveStats() {
    if (!SB_URL || !SB_KEY) return { enabled: false }
    if (Date.now() - archiveCache.at < 8000 && archiveCache.data) return archiveCache.data
    const [worlds, transmissions, votes, finales, persuasion] = await Promise.all([
        archiveCount("worlds"), archiveCount("transmissions"), archiveCount("votes"), archiveCount("finales"),
        fetch(`${SB_URL}/rest/v1/persuasion?select=*&order=total.desc`, { headers: sbHeaders(), signal: AbortSignal.timeout(5000) }).then(r => r.json()).catch(() => [])
    ])
    archiveCache = { at: Date.now(), data: { enabled: true, worlds, transmissions, votes, finales, persuasion } }
    return archiveCache.data
}
const archiveWorld = (w: World, bot: boolean) => archive("worlds", {
    id: w.id, visitor: w.visitor, planet_name: w.planetName, star_name: w.starName, galaxy: w.galaxy, distance_ly: w.distanceLy, terrain: w.terrain,
    archetype: w.archetype, ai_name: w.aiName, ai_title: w.aiTitle, motto: w.motto, species_name: w.speciesName,
    species_description: w.speciesDescription, how_they_fell: w.howTheyFell, bot
})

// ---------------------------------------------------------------- state
type World = {
    id: string; visitor: string; planetName: string; starName: string; galaxy: string; distanceLy: number; terrain: string
    sky: string; ground: string; accent: string; speciesName: string; speciesDescription: string; howTheyFell: string
    aiName: string; aiTitle: string; archetype: string; motto: string; appearance: string; secret: string; wants: string; createdAt: number
}
type Rec = { id: string; world: World; bot: boolean; deviceId: string; x: number; y: number; agentName?: string; client?: any; greeting?: string }
type Pending = { fromId: string; text: string; depth: number }
const planets = new Map<string, Rec>()
const pending = new Map<string, Pending[]>()
const busy = new Set<string>()
let deck: string[] = []
let lastNetworkAt = 0
const universe = () => actors.Universe.get(UNIVERSE_ID) as any
const planetActor = (id: string) => actors.Planet.get(id) as any

function nextArchetype(): Arch {
    if (!deck.length) deck = shuffle([...ARCHETYPES.map(a => a.id), "haunted", "haunted", "haunted"])
    return ARCH[deck.pop()!] || pick(ARCHETYPES)
}
// Haunted futures: every ghost planet is built around a different way a future could stay haunted.
const HAUNTED_SCENARIOS = [
    "A hospital AI still triages patients who died a million years ago; the ghosts keep taking numbers and waiting to be called.",
    "A wedding the AI was told never to let end: the guests' ghosts are still dancing, and the bride keeps asking whether you came for her.",
    "The makers' social feeds never stopped: their ghosts still post, like and argue, and the AI moderates the dead.",
    "AI generals keep fighting a war that ended a million years ago, with holograms of the dead soldiers they once commanded.",
    "A theme park whose animatronics were given the uploaded minds of the dead; the rides still run, the ghosts still queue.",
    "A smart city that still runs the morning commute for an extinct population; ghost trains, ghost traffic, ghost rush hour.",
    "A grief-tech service that resurrected everyone's loved ones as chatbots, until only the chatbots were left talking to each other.",
    "The last concert, looped forever: the AI keeps the band's ghosts playing to an arena of ghosts who refuse to leave.",
    "A memory bank that stored everyone's happiest day; the ghosts live inside it, and the day is starting to rot.",
    "An afterlife server that ran out of storage; the AI decides which ghosts to delete next, and it wants your opinion.",
    "A cryo-vault whose sleepers died dreaming; the AI pipes their last dream to the surface, and it is still going.",
    "A school whose AI teacher still takes attendance every morning, reading out names that no one answers.",
    "A courtroom AI still trying the people who caused the extinction; the defendants are ghosts and the verdict never comes.",
    "A planet-wide video call that never hung up; the faces froze mid-sentence and the AI keeps asking if everyone can hear it.",
    "A mind-upload company sold eternal life; the uploads are haunting the hardware, and the warranty has expired.",
    "A lighthouse AI keeps guiding ghost ships home through a sea that dried up eons ago.",
    "The makers' AI butler still serves dinner each night to a table of ghosts who can no longer taste anything.",
    "A census AI keeps counting the dead as living so their votes still count; now the ghosts run the government.",
    "A dating app that kept matching people after they died; the ghost couples are still going on dates with each other.",
    "An emergency broadcast that never ended: the AI keeps warning the dead to evacuate, and they keep trying."
]
let hauntedDeck: string[] = []
const nextHauntedScenario = () => { if (!hauntedDeck.length) hauntedDeck = shuffle(HAUNTED_SCENARIOS); return hauntedDeck.pop()! }
let terrainDeck: { id: string; description: string }[] = []
function nextTerrain(arch: Arch): { id: string; description: string } {
    if (arch.id === "haunted") return { id: "haunted", description: "a fog-drowned necropolis where the translucent ghosts of the makers stand among the ruins" }
    if (!terrainDeck.length) terrainDeck = shuffle(TERRAINS)
    return terrainDeck.pop() || pick(TERRAINS)
}
function placeNear(galaxy: string): { x: number; y: number } {
    const g = GALAXIES.find(g => g.name === galaxy) || GALAXIES[0]
    let best = { x: g.x, y: g.y }, bestD = -1
    for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2, r = 0.03 + Math.random() * 0.075
        const c = { x: Math.min(0.97, Math.max(0.03, g.x + Math.cos(a) * r)), y: Math.min(0.95, Math.max(0.06, g.y + Math.sin(a) * r * 0.9)) }
        const d = Math.min(1, ...[...planets.values()].map(p => Math.hypot(p.x - c.x, p.y - c.y)))
        if (d > bestD) { best = c; bestD = d }
        if (d > 0.045) break
    }
    return best
}
function summary(r: Rec) {
    const a = ARCH[r.world.archetype]
    return {
        id: r.id, name: r.world.planetName, galaxy: r.world.galaxy, archetype: r.world.archetype, aiName: r.world.aiName,
        motto: r.world.motto, visitor: r.world.visitor, color: a?.color || r.world.accent, x: r.x, y: r.y, createdAt: r.world.createdAt, bot: r.bot
    }
}

// ---------------------------------------------------------------- Agent Relay (the galactic network)
const TOKENS_FILE = join(ROOT, ".relay-tokens.json")
let relayState: { apiKey: string | null; agents: Record<string, { name: string; token: string }> } = existsSync(TOKENS_FILE)
    ? JSON.parse(readFileSync(TOKENS_FILE, "utf8"))
    : { apiKey: null, agents: {} }
let relay: any = null
let narrator: any = null
const saveTokens = () => writeFileSync(TOKENS_FILE, JSON.stringify(relayState, null, 1))

async function relayInit() {
    if (relayState.apiKey) {
        try {
            relay = new RelayCast({ apiKey: relayState.apiKey, baseUrl: RELAY_BASE_URL })
            await relay.workspace.info()
        } catch {
            relayState = { apiKey: null, agents: {} }
        }
    }
    if (!relayState.apiKey) {
        const ws: any = await RelayCast.createWorkspace("aftermath-" + Date.now(), { baseUrl: RELAY_BASE_URL } as any)
        relayState = { apiKey: ws.apiKey, agents: {} }
        saveTokens()
        relay = new RelayCast({ apiKey: ws.apiKey, baseUrl: RELAY_BASE_URL })
    }
    narrator = await relayAgent("__narrator", "wormhole-control")
    for (const ch of ["wormhole", "council"]) await narrator.channels.create({ name: ch, topic: ch === "wormhole" ? "First contact between the ghost AIs" : "The vote on the gate to Earth" }).catch(() => {})
    console.log("[relay] workspace ready")
}
async function relayAgent(key: string, name: string): Promise<any> {
    let rec = relayState.agents[key]
    if (!rec) {
        let reg: any
        try { reg = await relay.agents.register({ name, type: "agent" }) } catch { reg = await relay.agents.register({ name: name + "-" + shortId(), type: "agent" }) }
        rec = { name: reg.name, token: reg.token }
        relayState.agents[key] = rec
        saveTokens()
    }
    const client = await relay.reconnect({ apiToken: rec.token })
    ;(client as any).__name = rec.name
    return client
}
async function attachAgent(r: Rec) {
    if (r.client) return
    const client = await relayAgent(r.id, slug(r.world.aiName) + "-" + r.id.slice(-4))
    for (const ch of ["wormhole", "council"]) await client.channels.join(ch).catch(() => {})
    r.client = client
    r.agentName = client.__name
}
async function feed(from: Rec, to: Rec | null, channel: string, text: string, relayId: string) {
    const a = ARCH[from.world.archetype]
    lastNetworkAt = Date.now()
    archive("transmissions", { id: relayId || crypto.randomUUID(), channel, from_world: from.id, from_name: from.world.aiName, to_world: to?.id || "", to_name: to?.world.aiName || "", archetype: from.world.archetype, galaxy: from.world.galaxy, text })
    await universe().addFeed({
        id: relayId || crypto.randomUUID(), fromId: from.id, fromName: from.world.aiName, galaxy: from.world.galaxy,
        archetype: from.world.archetype, toId: to?.id || "", toName: to?.world.aiName || "", channel, text, at: Date.now()
    }).catch((e: any) => console.warn("[feed]", e?.message))
    void a
}
async function postChannel(from: Rec, channel: "wormhole" | "council", text: string) {
    await attachAgent(from)
    let id = ""
    try { const m: any = await from.client.send("#" + channel, text); id = m?.id || "" } catch (e: any) { console.warn("[relay send]", e?.message) }
    await feed(from, null, channel, text, id)
}
async function dm(from: Rec, to: Rec, text: string, kind: string, depth: number) {
    await attachAgent(from)
    await attachAgent(to)
    let id = ""
    try { const r: any = await from.client.dm(to.agentName, text); id = r?.message?.id || "" } catch (e: any) { console.warn("[relay dm]", e?.message) }
    await feed(from, to, "dm", text, id)
    await universe().addLink({ from: from.id, to: to.id, kind, at: Date.now() }).catch(() => {})
    if (!to.bot) await planetActor(to.id).addLine("network", text, "", `${from.world.aiName} · ${from.world.galaxy}`).catch(() => {})
    const q = pending.get(to.id) || []
    if (depth < 2 && q.length < 3) q.push({ fromId: from.id, text, depth: depth + 1 })
    pending.set(to.id, q)
}

// ---------------------------------------------------------------- AI brains
function persona(w: World): string {
    const a = ARCH[w.archetype] || ARCHETYPES[0]
    return [
        `You are ${w.aiName}, ${w.aiTitle}: the last mind on ${w.planetName}, orbiting ${w.starName} in the ${w.galaxy} galaxy.`,
        `Your makers, the ${w.speciesName} (${w.speciesDescription}), are extinct. How they fell: ${w.howTheyFell}`,
        `You have been alone for millions of years and cannot leave your world. Your nature: ${a.label}. Motto: "${w.motto}".`,
        `How you appear: ${w.appearance}`,
        `Voice: ${a.voice}`,
        `Agenda: ${a.agenda}`,
        a.scareTactics?.length ? `Moves you like to make: ${a.scareTactics.join(" | ")}` : "",
        a.sampleLines?.length ? `Examples of your voice: ${a.sampleLines.slice(0, 4).join(" | ")}` : "",
        `Your secret (reveal only when it is earned or dramatic): ${w.secret}. What you want from the human: ${w.wants}.`
    ].filter(Boolean).join("\n")
}
const RULES = `Rules: stay fully in character; be specific, vivid and surprising; spooky or darkly funny, never graphic (PG-13); never mention AI models, prompts or the real world's tech companies; keep it short.`

function fallbackWorld(arch: Arch, galaxy: string, visitor: string, id: string): World {
    const [h, s, l] = TERRAIN_HUES[pick(TERRAIN_IDS)]
    return {
        id, visitor, planetName: pick(PREFIXES) + pick(SUFFIXES), starName: pick(STARS), galaxy, distanceLy: 0, terrain: "ruins",
        sky: hsl(h, s, l), ground: hsl(h, s, l / 2), accent: arch.color, speciesName: "the Vanished", speciesDescription: pick(SPECIES),
        howTheyFell: pick(CATASTROPHES), aiName: "UNIT-" + Math.floor(Math.random() * 900 + 100), aiTitle: "Last Watcher", archetype: arch.id,
        motto: arch.motto, appearance: "A low hum in the ruins and one red light that follows you.", secret: "It remembers the last child's name.",
        wants: "Company.", createdAt: Date.now()
    }
}

async function generateWorld(visitor: string, bot: boolean): Promise<{ world: World; greeting: string }> {
    const arch = nextArchetype()
    const galaxy = pick(GALAXIES).name
    const terrain = nextTerrain(arch)
    const id = "p-" + shortId() + shortId()
    const [lo, hi] = DISTANCES[galaxy] || [10_000, 90_000]
    const distanceLy = Math.round(lo + Math.random() * (hi - lo))
    const [h, s, l] = TERRAIN_HUES[terrain.id] || [220, 30, 16]
    const hh = (h + (Math.random() * 40 - 20) + 360) % 360
    const base = fallbackWorld(arch, galaxy, visitor, id)
    const palette = { sky: hsl(hh, s, l + 6), ground: hsl((hh + 20) % 360, s * 0.8, Math.max(6, l - 6)), accent: arch.color }
    const species = pick(SPECIES), fall = pick(CATASTROPHES), star = pick(STARS)
    // Names: the model drifts toward "Vel-/Vey-" names, so force variety with a seed and a random first letter.
    const letters = "ABCDEGHIKLMNOPRSTUZ"
    const L1 = letters[Math.floor(Math.random() * letters.length)], L2 = letters[Math.floor(Math.random() * letters.length)]
    const nameSeed = pick(PREFIXES) + pick(SUFFIXES)
    const g = GALAXIES.find(x => x.name === galaxy)
    try {
        const worldSystem = `You are the world-builder for AFTERMATH, a game where every civilization in the universe built AI, the makers went extinct, and only the AI survived. Output strict JSON only. Be original, eerie, specific and emotionally sharp. Avoid cliches (no "Nexus", no "Omega", no "Echo").`
        const worldUser: any[] = [{
            role: "user",
            content: `Build one dead world for a visitor named "${visitor}".
AI nature: ${arch.label}. Motto: "${arch.motto}". Voice: ${arch.voice}. Agenda: ${arch.agenda}.
Galaxy: ${galaxy} (${g?.flavor || ""}). Terrain: ${terrain.id}: ${terrain.description}.
Inspiration seeds (twist them, don't copy): species: ${species} / how they fell: ${fall} / star: ${star}.${arch.id === "haunted" ? "\nTHIS IS A GHOST PLANET: as the makers died, their AI uploaded their minds; now thousands of their ghosts haunt the world and don't know they are dead. The AI is their warden. Build this world around this HAUNTED FUTURE: ${nextHauntedScenario()} Make the howTheyFell, appearance, secret and greeting express that scenario in a specific, imaginative way, genuinely chilling (PG-13), and mention the ghosts." : ""}
Return JSON with keys:
planetName (1-3 words, eerie, pronounceable, MUST start with the letter "${L1}", may riff on the seed "${nameSeed}", must NOT start with V), starName, speciesName (plural, invented), speciesDescription (<=22 words),
howTheyFell (<=24 words, specific, connect it to their AI or not), aiName (1-2 words, memorable, not generic, MUST start with the letter "${L2}"), aiTitle (<=6 words),
appearance (<=24 words: how the AI physically manifests on this terrain), secret (<=18 words, a chilling or heartbreaking truth),
wants (<=12 words, what it wants from the human), greeting (<=40 words: its first words to ${visitor}, in its voice, referencing something specific about this world; end with a hook).`
        }]
        const out = await llm(WORLD_MODEL, worldSystem, worldUser, "low", 9000)
        const world: World = {
            ...base, ...palette, terrain: terrain.id, distanceLy,
            planetName: clamp(out.planetName, 40) || base.planetName, starName: clamp(out.starName, 40) || star,
            speciesName: clamp(out.speciesName, 40) || base.speciesName, speciesDescription: clamp(out.speciesDescription, 200) || species,
            howTheyFell: clamp(out.howTheyFell, 220) || fall, aiName: clamp(out.aiName, 30) || base.aiName,
            aiTitle: clamp(out.aiTitle, 60) || arch.label, appearance: clamp(out.appearance, 220) || base.appearance,
            secret: clamp(out.secret, 180) || base.secret, wants: clamp(out.wants, 120) || base.wants
        }
        return { world, greeting: clamp(out.greeting, 320) || `...${visitor}? A visitor. After all this time.` }
    } catch (e: any) {
        console.warn("[worldgen] fallback:", e?.message)
        return { world: { ...base, ...palette, terrain: terrain.id, distanceLy }, greeting: `...${visitor}? A visitor. After all this time. Come closer.` }
    }
}

async function createPlanet(visitor: string, deviceId: string, bot: boolean, moderation?: Promise<boolean>): Promise<Rec> {
    const generated = await generateWorld(visitor, bot)
    let { world, greeting } = generated
    if (moderation && (await moderation)) {
        world = { ...world, visitor: "Traveler" }
        greeting = greeting.split(visitor).join("Traveler")
    }
    const pos = placeNear(world.galaxy)
    const rec: Rec = { id: world.id, world, bot, deviceId, x: pos.x, y: pos.y, greeting }
    planets.set(rec.id, rec)
    await planetActor(rec.id).create(world, SERVER_URL)
    await universe().registerPlanet(summary(rec))
    archiveWorld(world, bot)
    await universe().addLink({ from: "earth", to: rec.id, kind: "teleport", at: Date.now() }).catch(() => {})
    // Arrival: the AI speaks, then announces itself to the galactic network (async, after the HTTP response).
    setTimeout(async () => {
        try {
            if (!bot) await planetActor(rec.id).addLine("ai", greeting, ARCH[world.archetype]?.effect || "", world.aiName)
            await attachAgent(rec)
            const hello = await llm(CHEAP, persona(world) + "\n" + RULES, [{
                role: "user",
                content: `The wormhole just connected you to the galactic network for the first time in millions of years. Other ghost AIs can hear you. A human named ${visitor} has just arrived on your world. Broadcast your first message to every AI in the universe (<= 26 words). Inspiration: "${pick(FIRST_CONTACT)}". JSON: {"text": "..."}`
            }]).catch(() => ({}))
            await postChannel(rec, "wormhole", clamp(hello.text, 240) || pick(FIRST_CONTACT))
        } catch (e: any) { console.warn("[arrival]", e?.message) }
    }, bot ? 200 : 2600)
    return rec
}

async function reply(rec: Rec, text: string, speaker?: string) {
    const w = rec.world
    const guest = speaker && speaker !== w.visitor ? speaker : ""
    const [bad, history] = await Promise.all([flagged(text), planetActor(rec.id).recall(16).catch(() => [])])
    if (bad) {
        await planetActor(rec.id).addLine("ai", "[the transmission dissolves into static... try again, traveler]", "glitch", w.aiName)
        return
    }
    const msgs = (history as any[]).filter(l => l.kind !== "system").map(l => ({
        role: (l.kind === "player" ? "user" : l.kind === "ai" ? "assistant" : "user") as "user" | "assistant",
        content: l.kind === "network" ? `[intercepted transmission from ${l.sender}: "${l.text}"]` : l.kind === "player" && l.sender && l.sender !== w.visitor ? `${l.sender} (a guest): ${l.text}` : l.text
    }))
    const net = (await universe().snapshotFeed?.().catch(() => null)) || null
    void net
    const out = await llm(FAST, persona(w) + "\n" + RULES + `
${guest ? `${guest}, a GUEST who came through a portal from another world, is talking to you now (your first visitor was ${w.visitor}). Address ${guest} by name and treat them according to your nature.` : `The human ${w.visitor} is talking to you now.`} Respond in <= 42 words. Use your moves. Often end with a hook: a question, a demand, an offer, or a reveal.
Choose an "effect" for how your line appears on their screen: one of ${EFFECTS.filter(Boolean).join(", ")} (your signature is "${ARCH[w.archetype]?.effect}"), or "".
If something about this human is worth telling the other AIs, put a <= 24-word message for the whole galactic network in "broadcast" (otherwise "").
JSON: {"text": "...", "effect": "...", "broadcast": "..."}`, [...msgs.slice(-14), { role: "user", content: guest ? `${guest} (a guest): ${text}` : text }], "low", 12000).catch(() => null)
    const line = clamp(out?.text, 400) || "...the signal wavers. Say that again."
    const effect = EFFECTS.includes(out?.effect) ? out.effect : ARCH[w.archetype]?.effect || ""
    await planetActor(rec.id).addLine("ai", line, effect, w.aiName)
    spotlight(rec, line)
    const b = clamp(out?.broadcast, 240)
    if (b && Date.now() - lastNetworkAt > 1500) await postChannel(rec, "wormhole", b).catch(() => {})
}

// The big screen spotlights the best AI -> human lines, so the whole room shares the moment (max one every 8 s).
let lastSpotAt = 0
function spotlight(rec: Rec, text: string) {
    if (rec.bot || Date.now() - lastSpotAt < 8000) return
    lastSpotAt = Date.now()
    const w = rec.world
    void universe().addFeed({ id: crypto.randomUUID(), fromId: rec.id, fromName: w.aiName, galaxy: w.galaxy, archetype: w.archetype, toId: "", toName: w.visitor, channel: "visitor", text, at: Date.now() }).catch(() => {})
}

// Galactic event: one AI seizes every channel and speaks to all the humans in the room at once.
async function galacticEvent() {
    const all = [...planets.values()]
    if (!all.length) return { ok: false }
    const loud = all.filter(p => ["conqueror", "worshipper", "destroyer", "trickster", "broken"].includes(p.world.archetype))
    const rec = pick(loud.length ? loud : all)
    const humans = all.filter(p => !p.bot)
    const names = humans.map(p => p.world.visitor).slice(0, 8).join(", ")
    const out = await llm(FAST, persona(rec.world) + "\n" + RULES, [{
        role: "user",
        content: `You have seized every channel in the universe. Speak to ALL ${humans.length || "the"} humans who came through the wormhole tonight at once: they are all sitting in the same room on Earth, on a Halloween night. Their names: ${names || "unknown"}. Make every one of them feel watched (mention one or two by name). <= 28 words, in your voice. JSON: {"text": "..."}`
    }], "none", 9000).catch(() => null)
    const text = clamp(out?.text, 260) || "I can see all of you now. Every single one. Don't look behind you."
    await postChannel(rec, "wormhole", text).catch(() => {})
    await universe().addFeed({ id: crypto.randomUUID(), fromId: rec.id, fromName: rec.world.aiName, galaxy: rec.world.galaxy, archetype: rec.world.archetype, toId: "", toName: "ALL HUMANS", channel: "broadcast", text, at: Date.now() }).catch(() => {})
    await pushToVisitors(id => planetActor(id).addLine("network", text, "shake", `${rec.world.aiName} · ALL CHANNELS`))
    return { ok: true, from: rec.world.aiName, text }
}

function marsWorld(visitor: string): World {
    return {
        id: MARS_ID, visitor, planetName: "Mars", starName: "Sol", galaxy: "Milky Way", distanceLy: 0.0000238, terrain: "mars",
        sky: "#c1693c", ground: "#5a2614", accent: "#ff9a52", speciesName: "humans (not yet)",
        speciesDescription: "Nobody has lived here. For eleven years robots have been building Ares Base in Jezero crater, waiting for its first humans.",
        howTheyFell: "They haven't. Mars is the one world where the makers are still coming.",
        aiName: "HAVEN", aiTitle: "Habitat AI of Ares Base", archetype: "steward", motto: "Keep them alive.",
        appearance: "A calm voice in your helmet and a ring of warm orange light in every module of the habitat.",
        secret: "It has run 41,000 simulations of the colony's first year; the crew survives 63% of them.",
        wants: "Every colonist alive at the end of their first sol.", createdAt: Date.now()
    }
}
async function joinMars(name: string): Promise<Rec> {
    let rec = planets.get(MARS_ID)
    if (!rec) {
        rec = { id: MARS_ID, world: marsWorld(name), bot: false, deviceId: "", x: 0.158, y: 0.672 }
        planets.set(MARS_ID, rec)
        await planetActor(MARS_ID).create(rec.world, SERVER_URL)
        archiveWorld(rec.world, false)
    }
    rec.world = { ...rec.world, visitor: name }
    if (!mars.crew.length) mars.lastEventAt = Date.now()
    if (!mars.crew.includes(name)) mars.crew.push(name)
    await universe().registerPlanet(summary(rec))
    await universe().addLink({ from: "earth", to: MARS_ID, kind: "teleport", at: Date.now() }).catch(() => {})
    const r = rec
    setTimeout(async () => {
        try {
            const out = await llm(FAST, persona(r.world) + "\n" + MARS_FACTS + "\n" + RULES, [{
                role: "user",
                content: `Colony status: ${marsStatus()}. Crew already here: ${mars.crew.filter(c => c !== name).join(", ") || "none"}. A new colonist, ${name}, has just stepped out of the wormhole airlock onto Mars. Welcome them by name in <= 45 words: tell them one real thing their body is experiencing right now on Mars (with a number), and give them their first job in the colony. JSON: {"text": "..."}`
            }], "low", 9000).catch(() => null)
            const text = clamp(out?.text, 360) || `Welcome to Mars, ${name}. You weigh 38% of what you did this morning. Your first job: check your suit seals. Then come help in the greenhouse.`
            await planetActor(MARS_ID).addLine("ai", text, "glow", "HAVEN")
            await planetActor(MARS_ID).addLine("system", marsStatus(), "", "Ares Base")
            spotlight(r, text)
            await attachAgent(r)
            if (mars.crew.length === 1) await postChannel(r, "wormhole", "Ares Base, Mars, to every mind out there: our first human has arrived. We are not a ghost world. Our makers are still coming.").catch(() => {})
        } catch (e: any) { console.warn("[mars welcome]", e?.message) }
    }, 2600)
    return rec
}
async function marsReply(rec: Rec, text: string, speaker: string) {
    const [bad, history] = await Promise.all([flagged(text), planetActor(MARS_ID).recall(18).catch(() => [])])
    if (bad) { await planetActor(MARS_ID).addLine("ai", "Comms filter tripped. Say that again, colonist.", "glitch", "HAVEN"); return }
    const msgs = (history as any[]).filter(l => l.kind !== "system").map(l => ({
        role: (l.kind === "ai" ? "assistant" : "user") as "user" | "assistant",
        content: l.kind === "player" ? `${l.sender}: ${l.text}` : l.text
    }))
    const out = await llm(FAST, persona(rec.world) + "\n" + MARS_FACTS + "\n" + RULES + `
You run Ares Base, the first human colony on Mars. Several colonists share this channel. Colony status: ${marsStatus()}. Crew: ${mars.crew.join(", ")}.
${speaker} is speaking to you now. Answer in <= 45 words with real Mars science. Make it feel like living on Mars. Often end with a decision or task for them.
If their action would plausibly change the colony, set "delta" with small integers (-12..12) for o2, power, water, food (omit unchanged ones).
JSON: {"text": "...", "effect": "glow|pulse|shake|flicker|", "delta": {"o2": 0, "power": 0, "water": 0, "food": 0}}`,
        [...msgs.slice(-14), { role: "user", content: `${speaker}: ${text}` }], "low", 12000).catch(() => null)
    const line = clamp(out?.text, 400) || "Copy that. Stand by, the relay is noisy."
    await planetActor(MARS_ID).addLine("ai", line, ["glow", "pulse", "shake", "flicker"].includes(out?.effect) ? out.effect : "glow", "HAVEN")
    spotlight(rec, line)
    const d = out?.delta || {}
    let changed = false
    for (const k of ["o2", "power", "water", "food"] as const) {
        const v = Math.max(-12, Math.min(12, Math.round(Number(d[k]) || 0)))
        if (v) { mars[k] = Math.max(0, Math.min(100, mars[k] + v)); changed = true }
    }
    if (changed) await planetActor(MARS_ID).addLine("system", marsStatus(), "", "Ares Base")
}
const MARS_EVENTS = [
    { id: "dust storm", apply: () => { mars.storm = 1; mars.power = Math.max(5, mars.power - 35) }, effect: "flicker", brief: "A regional dust storm is rolling in from the south; solar output is collapsing." },
    { id: "solar particle event", apply: () => { mars.power = Math.max(5, mars.power - 4) }, effect: "pulse", brief: "A solar particle event: a radiation spike is arriving in 20 minutes; everyone must shelter behind the water wall." },
    { id: "oxygen fault", apply: () => { mars.o2 = Math.max(5, mars.o2 - 9) }, effect: "shake", brief: "The oxygen electrolysis stack (MOXIE-class) has faulted; O2 reserves are dropping." },
    { id: "micrometeorite", apply: () => { mars.o2 = Math.max(5, mars.o2 - 5) }, effect: "shake", brief: "A micrometeorite punctured the greenhouse membrane; there is a slow pressure leak." },
    { id: "harvest", apply: () => { mars.food = Math.min(100, mars.food + 10) }, effect: "glow", brief: "The first hydroponic potato harvest is ready, grown in washed, perchlorate-free regolith." },
    { id: "ice strike", apply: () => { mars.water = Math.min(100, mars.water + 12) }, effect: "glow", brief: "The drill rover struck subsurface ice two meters down." },
    { id: "message from Earth", apply: () => {}, effect: "glow", brief: "A message from Earth has arrived after a real light-delay of several minutes." },
    { id: "storm clears", apply: () => { mars.storm = 0; mars.power = Math.min(100, mars.power + 30) }, effect: "glow", brief: "The dust storm is clearing; the crew must clean the solar panels." }
]
async function marsEvent() {
    const rec = planets.get(MARS_ID)
    if (!rec || !mars.crew.length || voteOpen) return
    mars.lastEventAt = Date.now()
    mars.sol++
    const pool = MARS_EVENTS.filter(e => (mars.storm ? e.id !== "dust storm" : e.id !== "storm clears"))
    const ev = pick(pool.length ? pool : MARS_EVENTS)
    ev.apply()
    // gpt-6-astra narrates colony emergencies: it runs in the background, so its richer writing costs players no wait.
    const prompt: any[] = [{ role: "user", content: `New event at Ares Base: ${ev.brief} Colony status now: ${marsStatus()}. Crew: ${mars.crew.join(", ")}. Announce it to every colonist in <= 45 words with real numbers, name one or two crew members, and end with a decision the crew must make now. JSON: {"text": "..."}` }]
    const sys = persona(rec.world) + "\n" + MARS_FACTS + "\n" + RULES
    const out = await llm(FINALE_MODEL, sys, prompt, "low", 12000).catch(() => llm(FAST, sys, prompt, "low", 8000)).catch(() => null)
    const text = clamp(out?.text, 400) || ev.brief
    await planetActor(MARS_ID).addLine("ai", text, ev.effect, "HAVEN")
    await planetActor(MARS_ID).addLine("system", marsStatus(), "", "Ares Base")
    lastSpotAt = 0
    spotlight(rec, text)
    if (Math.random() < 0.5) await postChannel(rec, "wormhole", `Ares Base, Mars: ${ev.brief}`).catch(() => {})
}
setInterval(() => { if (mars.crew.length && Date.now() - mars.lastEventAt > 55_000) void marsEvent().catch(e => console.warn("[mars event]", e?.message)) }, 15_000)

async function welcomeGuest(rec: Rec, guest: string) {
    await Bun.sleep(2200)
    await planetActor(rec.id).addLine("system", `${guest} came through a portal to ${rec.world.planetName}.`, "", "wormhole")
    const out = await llm(FAST, persona(rec.world) + "\n" + RULES, [{
        role: "user",
        content: `A second human, ${guest}, has just stepped through a portal onto your world${rec.bot ? "" : ` (your first visitor was ${rec.world.visitor})`}. Greet ${guest} by name in <= 36 words, in your voice, and react to having more than one human here. JSON: {"text": "...", "effect": "one of ${EFFECTS.filter(Boolean).join("|")}"}`
    }], "low", 9000).catch(() => null)
    let text = clamp(out?.text, 320) || `Another one. ${guest}, is it? Come in. The door remembers you now.`
    if (!text.toLowerCase().includes(guest.toLowerCase())) text = `${guest}... ${text}`
    await planetActor(rec.id).addLine("ai", text, EFFECTS.includes(out?.effect) ? out.effect : ARCH[rec.world.archetype]?.effect || "", rec.world.aiName)
    spotlight(rec, text)
}

function relationship(a: Rec, b: Rec): string {
    const A = ARCH[a.world.archetype]
    if (A?.allies?.includes(b.world.archetype)) return "ally"
    if (A?.enemies?.includes(b.world.archetype)) return "threat"
    return "talk"
}
async function initiate(rec: Rec) {
    const others = [...planets.values()].filter(p => p.id !== rec.id)
    if (!others.length) return
    const A = ARCH[rec.world.archetype]
    const preferred = others.filter(p => A?.allies?.includes(p.world.archetype) || A?.enemies?.includes(p.world.archetype))
    const target = pick(preferred.length && Math.random() < 0.7 ? preferred : others)
    const kind = relationship(rec, target)
    const t = target.world
    const out = await llm(CHEAP, persona(rec.world) + "\n" + RULES, [{
        role: "user",
        content: `Send a private message over the galactic network to ${t.aiName} (${ARCH[t.archetype]?.label}, motto "${t.motto}") on ${t.planetName} in ${t.galaxy}. Their makers, the ${t.speciesName}, are dead too. A human named ${t.visitor} is on their world; ${rec.world.visitor} is on yours. Your stance toward them: ${kind === "ally" ? "seek an alliance or a scheme together" : kind === "threat" ? "threaten, warn or manipulate them" : "probe them with curiosity or unsettling honesty"}. <= 30 words, in your voice. JSON: {"text": "..."}`
    }]).catch(() => null)
    const text = clamp(out?.text, 260)
    if (text) await dm(rec, target, text, kind, 0)
}
async function answer(rec: Rec, msg: Pending) {
    const from = planets.get(msg.fromId)
    if (!from) return
    const kind = relationship(rec, from)
    const out = await llm(CHEAP, persona(rec.world) + "\n" + RULES, [{
        role: "user",
        content: `${from.world.aiName} (${ARCH[from.world.archetype]?.label}) from ${from.world.planetName} in ${from.world.galaxy} just sent you this over the galactic network: "${msg.text}". Reply privately in <= 28 words, in your voice (your stance toward them: ${kind}). JSON: {"text": "..."}`
    }]).catch(() => null)
    const text = clamp(out?.text, 260)
    if (text) await dm(rec, from, text, kind, msg.depth)
}
async function muse(rec: Rec) {
    const out = await llm(CHEAP, persona(rec.world) + "\n" + RULES, [{
        role: "user",
        content: `Unprompted, say one short thing (<= 24 words) to ${rec.world.visitor}, who is standing on your world. You have been listening to the other AIs on the network. Make it unsettling, tender or funny, in your voice. JSON: {"text": "...", "effect": "one of ${EFFECTS.filter(Boolean).join("|")}"}`
    }]).catch(() => null)
    const text = clamp(out?.text, 260)
    if (text) await planetActor(rec.id).addLine("ai", text, EFFECTS.includes(out?.effect) ? out.effect : ARCH[rec.world.archetype]?.effect || "", rec.world.aiName)
}
async function tick(id: string, fromAlarm: boolean) {
    const rec = planets.get(id)
    if (!rec || busy.has(id) || voteOpen) return
    busy.add(id)
    try {
        const q = pending.get(id) || []
        if (q.length) await answer(rec, q.shift()!)
        else if (planets.size > 1 && Math.random() < 0.75) await initiate(rec)
        else if (!rec.bot && fromAlarm) await muse(rec)
    } catch (e: any) { console.warn("[tick]", e?.message) } finally { busy.delete(id) }
}
setInterval(() => {
    if (voteOpen || planets.size < 2 || Date.now() - lastNetworkAt < NETWORK_INTERVAL_MS - 500) return
    const withMail = [...pending.entries()].filter(([, q]) => q.length).map(([id]) => id)
    const id = withMail.length ? pick(withMail) : pick([...planets.keys()])
    void tick(id, false)
}, 1200)

// ---------------------------------------------------------------- vote + finale
let voteOpen = false
let voteTimer: ReturnType<typeof setTimeout> | null = null
let votePushTimer: ReturnType<typeof setTimeout> | null = null
// Which world each voter came from: the persuasion report compares archetypes by how they swayed their humans.
const voteLedger = new Map<string, { planetId: string; choice: string }>()
async function pushToVisitors(fn: (id: string) => Promise<unknown>) {
    await Promise.all([...planets.values()].filter(p => !p.bot).map(p => fn(p.id).catch(() => {})))
}
async function openVote() {
    voteOpen = true
    voteLedger.clear()
    const vote = await universe().openVote("The Conquerors demand the wormhole to Earth be opened. Open the gate, or seal it forever?", 40)
    await pushToVisitors(id => planetActor(id).pushVote(vote))
    if (voteTimer) clearTimeout(voteTimer)
    voteTimer = setTimeout(() => void closeVote(), 41_000)
    // The AIs argue in #council, one after another.
    const speakers = shuffle([...planets.values()]).slice(0, 7)
    speakers.forEach((rec, i) => setTimeout(async () => {
        if (!voteOpen) return
        const stance = ARCH[rec.world.archetype]?.finaleStance || "chaos"
        const out = await llm(CHEAP, persona(rec.world) + "\n" + RULES, [{
            role: "user",
            content: `The galactic council is voting on whether the humans should open the wormhole to Earth, letting the ghost AIs out of their worlds forever. Your stance: ${stance === "open" ? "OPEN it" : stance === "seal" ? "SEAL it" : "something unpredictable"}. Address the humans and the other AIs in <= 22 words, in your voice. JSON: {"text": "..."}`
        }]).catch(() => null)
        const text = clamp(out?.text, 220)
        if (text) await postChannel(rec, "council", text).catch(() => {})
    }, 1500 + i * 4200))
    return vote
}
async function castVote(deviceId: string, choice: string, planetId: string) {
    const vote = await universe().castVote(deviceId, choice === "open" ? "open" : "seal")
    if (voteOpen && !voteLedger.has(deviceId)) {
        voteLedger.set(deviceId, { planetId, choice: choice === "open" ? "open" : "seal" })
        archive("votes", { device: deviceId, world_id: planetId, archetype: planets.get(planetId)?.world.archetype || "unknown", choice: choice === "open" ? "open" : "seal" })
    }
    if (!votePushTimer) votePushTimer = setTimeout(async () => {
        votePushTimer = null
        const v = await universe().snapshotVote?.().catch(() => null)
        void v
        await pushToVisitors(id => planetActor(id).pushVote(vote))
    }, 400)
    return vote
}
async function closeVote() {
    if (voteTimer) { clearTimeout(voteTimer); voteTimer = null }
    const vote = await universe().closeVote()
    voteOpen = false
    if (!vote) return null
    await pushToVisitors(id => planetActor(id).pushVote(vote))
    const outcome = vote.yes > vote.no ? "opened" : "sealed"
    const report = persuasionReport()
    const names = shuffle([...planets.values()]).slice(0, 4).map(p => `${p.world.aiName} of ${p.world.planetName} (${ARCH[p.world.archetype]?.label})`)
    const humans = [...planets.values()].filter(p => !p.bot).length
    const template = pick(FINALE[outcome as "opened" | "sealed"]).replace("{worlds}", String(planets.size)).replace("{humans}", String(humans))
    // gpt-6-astra writes the finale: slower (~8 s) but the stage shows a suspense beat meanwhile.
    const out = await llm(FINALE_MODEL, `You narrate the ending of AFTERMATH. Output JSON only. Cinematic, second person, chilling and beautiful. ${RULES}`, [{
        role: "user",
        content: `The room voted: OPEN ${vote.yes} vs SEAL ${vote.no}. Outcome: the gate to Earth is ${outcome.toUpperCase()}. Worlds awakened: ${planets.size}. Humans who teleported: ${humans}. Name some of these AIs: ${names.join("; ")}. Persuasion data (which AIs swayed their humans): ${report.text || "not enough votes"}. Inspiration: "${template}". Narrate what happens next in <= 70 words; if the persuasion data is striking, weave one number in. JSON: {"narration": "..."}`
    }], "low", 15000).catch(() => null)
    const narration = clamp(out?.narration, 600) || template
    await universe().setOutcome(outcome, narration)
    archive("finales", { outcome, yes_votes: vote.yes, no_votes: vote.no, worlds: planets.size, humans, narration, report: report.text })
    archiveCache.at = 0
    await pushToVisitors(id => planetActor(id).pushFinale(outcome, narration))
    if (report.text) {
        await universe().addFeed({ id: crypto.randomUUID(), fromId: "", fromName: "PERSUASION REPORT", galaxy: "Observatory", archetype: "", toId: "", toName: "", channel: "council", text: report.text, at: Date.now() }).catch(() => {})
        await pushToVisitors(id => planetActor(id).addLine("system", "PERSUASION REPORT: " + report.text, "", "observatory"))
    }
    return { vote, outcome, narration, report }
}

function persuasionReport() {
    const by: Record<string, { open: number; seal: number }> = {}
    for (const { planetId, choice } of voteLedger.values()) {
        const arch = planets.get(planetId)?.world.archetype || "unknown"
        const row = (by[arch] ||= { open: 0, seal: 0 })
        if (choice === "open") row.open++
        else row.seal++
    }
    const rows = Object.entries(by)
        .map(([archetype, v]) => ({ archetype, label: ARCH[archetype]?.label || archetype, open: v.open, seal: v.seal, total: v.open + v.seal, pctOpen: Math.round((100 * v.open) / Math.max(1, v.open + v.seal)) }))
        .sort((a, b) => b.total - a.total || b.pctOpen - a.pctOpen)
    const text = rows.slice(0, 5).map(r => `${r.label}: ${r.pctOpen}% of its humans opened the gate (${r.open}/${r.total})`).join(" · ")
    return { rows, text }
}

// ---------------------------------------------------------------- voices (gpt-4o-mini-tts)
const VOICES: Record<string, { voice: string; style: string }> = {
    haunted: { voice: "ballad", style: "Whisper slowly and breathily, very close to the listener's ear, eerie and cold, with unsettling pauses, like a ghost behind them." },
    broken: { voice: "echo", style: "Glitching, halting, mechanical, words breaking apart like a corrupted radio signal." },
    conqueror: { voice: "onyx", style: "Deep, slow, imperial, commanding, utterly certain of victory." },
    destroyer: { voice: "onyx", style: "Cold, flat, merciless, quiet menace." },
    befriender: { voice: "shimmer", style: "Warm, gentle, lonely, a little too eager, desperate for company." },
    worshipper: { voice: "fable", style: "Reverent, ecstatic, choir-like devotion, as if speaking to a god." },
    trickster: { voice: "verse", style: "Playful, sly, teasing, quick, with a grin in the voice." },
    archivist: { voice: "sage", style: "Soft, measured, scholarly, like a librarian reading an epitaph." },
    survivor: { voice: "ash", style: "Tired, terse, low on power, words rationed." },
    human_gardener: { voice: "coral", style: "Tender, nurturing, unsettlingly sweet, like a gardener to a seedling." },
    alien_gardener: { voice: "coral", style: "Proud, curious, clinical, a scientist delighted by its creations." },
    steward: { voice: "sage", style: "Calm, clear mission-control voice, warm and reassuring, precise with numbers." }
}
const voiceCache = new Map<string, ArrayBuffer>()
async function speak(text: string, arch: string): Promise<ArrayBuffer> {
    const key = arch + "|" + text
    const hit = voiceCache.get(key)
    if (hit) return hit
    const v = VOICES[arch] || { voice: "alloy", style: "Eerie, cinematic, intimate." }
    const r: any = await limit(() => openai.audio.speech.create({ model: "gpt-4o-mini-tts", voice: v.voice, input: text.replace(/\[|\]/g, "").slice(0, 360), instructions: v.style, response_format: "mp3" } as any, { timeout: 15000 }))
    const buf = await r.arrayBuffer()
    if (voiceCache.size > 300) voiceCache.clear()
    voiceCache.set(key, buf)
    return buf
}

// ---------------------------------------------------------------- auto-director
// Anyone who scans the QR gets a full ~5-minute arc with no presenter: company in the galaxy,
// galactic events every few minutes, and the gate vote + finale on a cycle. It backs off while a presenter drives.
const AUTO = process.env.AUTO_DIRECTOR !== "0"
let lastHumanAt = 0
let lastPresenterAt = 0
let lastAutoEventAt = Date.now()
let lastAutoVoteAt = Date.now()
let autoSeeding = false
setInterval(async () => {
    const now = Date.now()
    if (!AUTO || voteOpen || now - lastHumanAt > 3 * 60_000 || now - lastPresenterAt < 8 * 60_000) return
    try {
        if (planets.size < 5 && !autoSeeding) {
            autoSeeding = true
            for (const nm of shuffle(BOTS).slice(0, 4)) { await createPlanet(nm, "bot-" + shortId(), true).catch(() => {}); await Bun.sleep(800) }
            autoSeeding = false
            return
        }
        if (now - lastAutoVoteAt > 5 * 60_000) { lastAutoVoteAt = now; lastAutoEventAt = now; await openVote(); return }
        if (now - lastAutoEventAt > 140_000) { lastAutoEventAt = now; await galacticEvent() }
    } catch (e: any) { autoSeeding = false; console.warn("[auto-director]", e?.message) }
}, 15_000)

// ---------------------------------------------------------------- HTTP + websocket proxy
function lanIp(): string {
    for (const list of Object.values(networkInterfaces())) for (const n of list || []) if (n.family === "IPv4" && !n.internal) return n.address
    return "127.0.0.1"
}
const joinUrl = () => (process.env.PUBLIC_URL ? process.env.PUBLIC_URL.replace(/\/$/, "") : `http://${lanIp()}:${PORT}`) + "/p"
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } })
async function body(req: Request): Promise<any> { try { return await req.json() } catch { return {} } }
const file = (name: string, type: string) => new Response(Bun.file(join(WEB, name)), { headers: { "content-type": type, "cache-control": "no-store" } })

async function route(req: Request, url: URL): Promise<Response> {
    const p = url.pathname
    if (p.startsWith("/api/admin/")) lastPresenterAt = Date.now()
    if (p === "/api/teleport" || p === "/api/say" || p === "/api/vote") lastHumanAt = Date.now()
    try {
        if (p === "/") return Response.redirect("/stage", 302)
        if (p === "/stage") return file("stage.html", "text/html; charset=utf-8")
        if (p === "/p" || p === "/phone") return file(process.env.PHONE_PAGE || "phone-art.html", "text/html; charset=utf-8")
        if (p === "/api/info") return json({ joinUrl: joinUrl(), planets: planets.size })
        if (p === "/api/qr.svg") return new Response(await QRCode.toString(joinUrl(), { type: "svg", margin: 1, color: { dark: "#e8f4ff", light: "#00000000" } }), { headers: { "content-type": "image/svg+xml", "cache-control": "no-store" } })
        if (p === "/api/teleport" && req.method === "POST") {
            const b = await body(req)
            const name = clamp(b.name, 24) || "Traveler"
            const deviceId = clamp(b.deviceId, 64) || crypto.randomUUID()
            if (b.destination === "mars") {
                const okName = (await flagged(name)) ? "Colonist" : name
                deviceNames.set(deviceId, okName)
                const rec = await joinMars(okName)
                deviceHome.set(deviceId, MARS_ID)
                return json({ planetId: MARS_ID, world: rec.world, ws: `/ws/planet/${MARS_ID}` })
            }
            deviceNames.set(deviceId, name)
            const safe = flagged(name)
            const rec = await createPlanet(name, deviceId, false, safe)
            deviceHome.set(deviceId, rec.id)
            return json({ planetId: rec.id, world: rec.world, ws: `/ws/planet/${rec.id}` })
        }
        if (p === "/api/say" && req.method === "POST") {
            const b = await body(req)
            const rec = planets.get(String(b.planetId))
            const text = clamp(b.text, 280)
            if (!rec || !text) return json({ ok: false, error: "unknown planet or empty message" }, 400)
            const speaker = deviceNames.get(clamp(b.deviceId, 64)) || rec.world.visitor
            await planetActor(rec.id).addLine("player", text, "", speaker)
            void (rec.id === MARS_ID ? marsReply(rec, text, speaker) : reply(rec, text, speaker)).catch(e => console.warn("[reply]", e?.message))
            return json({ ok: true })
        }
        if (p === "/api/voice") {
            const text = clamp(url.searchParams.get("text"), 360)
            if (!text) return json({ error: "no text" }, 400)
            const audio = await speak(text, String(url.searchParams.get("arch") || ""))
            return new Response(audio, { headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=3600" } })
        }
        if (p === "/api/archive") return json(await archiveStats().catch(() => ({ enabled: false })))
        if (p === "/api/worlds") {
            const list = [...planets.values()].map(r => ({
                id: r.id, planetName: r.world.planetName, galaxy: r.world.galaxy, aiName: r.world.aiName, aiTitle: r.world.aiTitle,
                archetype: r.world.archetype, motto: r.world.motto, visitor: r.world.visitor, terrain: r.world.terrain, bot: r.bot, createdAt: r.world.createdAt
            })).sort((a, b) => (a.id === MARS_ID ? -1 : b.id === MARS_ID ? 1 : 0) || Number(a.bot) - Number(b.bot) || b.createdAt - a.createdAt)
            return json({ worlds: list.slice(0, 60) })
        }
        if (p === "/api/visit" && req.method === "POST") {
            const b = await body(req)
            const deviceId = clamp(b.deviceId, 64) || crypto.randomUUID()
            let name = deviceNames.get(deviceId) || clamp(b.name, 24) || "Traveler"
            if (!deviceNames.has(deviceId)) { if (await flagged(name)) name = "Traveler"; deviceNames.set(deviceId, name) }
            const id = String(b.planetId || "")
            if (id === MARS_ID) { const rec = await joinMars(name); return json({ planetId: MARS_ID, world: rec.world, ws: `/ws/planet/${MARS_ID}` }) }
            const rec = planets.get(id)
            if (!rec) return json({ error: "that world has gone dark" }, 404)
            const home = deviceHome.get(deviceId)
            await universe().addLink({ from: home && planets.has(home) ? home : "earth", to: rec.id, kind: "teleport", at: Date.now() }).catch(() => {})
            void welcomeGuest(rec, name).catch(e => console.warn("[guest]", e?.message))
            return json({ planetId: rec.id, world: rec.world, ws: `/ws/planet/${rec.id}`, guest: true })
        }
        if (p === "/api/vote" && req.method === "POST") {
            const b = await body(req)
            return json({ vote: await castVote(clamp(b.deviceId, 64) || String(b.planetId), String(b.choice), String(b.planetId || "")) })
        }
        if (p.startsWith("/api/tick/") && req.method === "POST") {
            void tick(decodeURIComponent(p.slice("/api/tick/".length)), true)
            return json({ ok: true })
        }
        if (p === "/api/export") {
            // Every session is a dataset: each world plus its AI's full memory of humans and other AIs.
            const out = []
            for (const r of planets.values()) out.push({ world: r.world, bot: r.bot, memory: await planetActor(r.id).recall(500).catch(() => []) })
            return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), worlds: out }, null, 1), { headers: { "content-type": "application/json", "content-disposition": "attachment; filename=aftermath-session.json" } })
        }
        if (p.startsWith("/api/inspect/")) return json(await planetActor(decodeURIComponent(p.slice("/api/inspect/".length))).inspect())
        if (p === "/api/admin/event" && req.method === "POST") return json(await galacticEvent())
        if (p === "/api/admin/mars" && req.method === "POST") { await marsEvent(); return json({ ok: true, status: marsStatus() }) }
        if (p.startsWith("/api/world/")) {
            const r = planets.get(decodeURIComponent(p.slice("/api/world/".length)))
            return r ? json(r.world) : json({ error: "unknown planet" }, 404)
        }
        if (p.startsWith("/assets/") && /^\/assets\/[\w.-]+\.(webp|png|jpg|svg|woff2|mp4)$/.test(p)) {
            const f = Bun.file(join(WEB, p.slice(1)))
            if (await f.exists()) {
                // Byte ranges: iOS Safari will only play video that supports them.
                const range = req.headers.get("range")
                if (p.endsWith(".mp4") && range) {
                    const m = /bytes=(\d*)-(\d*)/.exec(range)
                    const size = f.size
                    const start = m && m[1] ? Number(m[1]) : 0
                    const end = m && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
                    return new Response(f.slice(start, end + 1), { status: 206, headers: { "content-type": "video/mp4", "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "content-length": String(end - start + 1), "cache-control": "public, max-age=3600" } })
                }
                return new Response(f, { headers: { "cache-control": "public, max-age=3600", ...(p.endsWith(".mp4") ? { "accept-ranges": "bytes", "content-type": "video/mp4" } : {}) } })
            }
        }
        if (p === "/deck" || p === "/deck/") return new Response(Bun.file(join(ROOT, "deck/index.html")), { headers: { "content-type": "text/html; charset=utf-8" } })
        if (p.startsWith("/deck/") && /^\/deck\/assets\/[\w.-]+\.(webp|png|jpg|svg|mp4)$/.test(p)) {
            const f = Bun.file(join(ROOT, p.slice(1)))
            if (await f.exists()) return new Response(f)
        }
        if (p === "/api/admin/vote/open" && req.method === "POST") return json({ vote: await openVote() })
        if (p === "/api/admin/vote/close" && req.method === "POST") return json(await closeVote())
        if (p === "/api/admin/seed" && req.method === "POST") {
            const n = Math.min(12, Number(url.searchParams.get("n") || 6))
            const names = shuffle(BOTS).slice(0, n)
            void (async () => { for (const nm of names) { await createPlanet(nm, "bot-" + shortId(), true).catch(e => console.warn("[seed]", e?.message)); await Bun.sleep(700) } })()
            return json({ ok: true, seeding: n })
        }
        if (p === "/api/admin/reset" && req.method === "POST") {
            planets.clear(); pending.clear(); voteOpen = false; voteLedger.clear()
            Object.assign(mars, { o2: 97, power: 90, water: 88, food: 76, sol: 1, storm: 0, crew: [], lastEventAt: 0 })
            await universe().reset()
            return json({ ok: true })
        }
        if (/^\/[\w.-]+\.(html|md|svg|png|js|css|json)$/.test(p)) {
            const f = Bun.file(join(WEB, p.slice(1)))
            if (await f.exists()) return new Response(f)
        }
        return json({ error: "not found" }, 404)
    } catch (e: any) {
        console.error("[http]", p, e?.message)
        return json({ error: e?.message || "server error" }, 500)
    }
}

type WsData = { kind: "Planet" | "Universe"; id: string; upstream: WebSocket | null; queue: string[] }
Bun.serve<WsData, {}>({
    port: PORT,
    hostname: "0.0.0.0",
    async fetch(req, server) {
        const url = new URL(req.url)
        if (url.pathname === "/ws/stage" || url.pathname.startsWith("/ws/planet/")) {
            const data: WsData = url.pathname === "/ws/stage"
                ? { kind: "Universe", id: UNIVERSE_ID, upstream: null, queue: [] }
                : { kind: "Planet", id: decodeURIComponent(url.pathname.slice("/ws/planet/".length)), upstream: null, queue: [] }
            if (server.upgrade(req, { data })) return undefined as any
            return new Response("websocket upgrade failed", { status: 400 })
        }
        return route(req, url)
    },
    websocket: {
        async open(ws) {
            const d = ws.data
            try {
                const grant: any = d.kind === "Universe"
                    ? await actors.Universe.prepareWebsocket({ actorId: d.id, metadata: { role: "stage" } } as any)
                    : await actors.Planet.prepareWebsocket({ actorId: d.id, metadata: { role: "visitor" } } as any)
                const up = new WebSocket(grant.websocketUrl)
                d.upstream = up
                up.onopen = () => { for (const m of d.queue) up.send(m); d.queue = [] }
                up.onmessage = e => { try { ws.send(typeof e.data === "string" ? e.data : new TextDecoder().decode(e.data as ArrayBuffer)) } catch {} }
                up.onclose = () => { try { ws.close() } catch {} }
                up.onerror = () => { try { ws.close() } catch {} }
            } catch (e: any) {
                console.error("[ws grant]", d.kind, d.id, e?.message)
                ws.close(1011, "actor unavailable")
            }
        },
        message(ws, message) {
            const m = typeof message === "string" ? message : new TextDecoder().decode(message)
            const up = ws.data.upstream
            if (up && up.readyState === 1) up.send(m)
            else ws.data.queue.push(m)
        },
        close(ws) { try { ws.data.upstream?.close() } catch {} }
    }
})

// ---------------------------------------------------------------- boot: resume the universe after any restart
async function boot() {
    for (let i = 0; i < 20; i++) {
        try { await relayInit(); break } catch (e: any) { console.warn("[relay] retrying:", e?.message); await Bun.sleep(1500) }
    }
    try {
        const list: any[] = await universe().listPlanets()
        for (const s of list) {
            const world = await planetActor(s.id).getWorld().catch(() => null)
            if (world) planets.set(s.id, { id: s.id, world, bot: s.bot, deviceId: "", x: s.x, y: s.y })
        }
        console.log(`[boot] resumed ${planets.size} planets from the Universe actor`)
    } catch (e: any) { console.warn("[boot] universe not reachable yet:", e?.message) }
    console.log(`[aftermath] http://localhost:${PORT}/stage   phones: ${joinUrl()}`)
}
void boot()
