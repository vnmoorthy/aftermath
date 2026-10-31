// Cosmic addresses: where (and when) every world sits, from the Omniverse down to the Quantumverse,
// plus the route a traveller takes from Earth to get there. Derived deterministically from the world id,
// so it survives restarts without any extra storage.
export const LADDER: [string, string, string, string, string][] = [
    ["OMNIVERSE", "The Omniverse", "All possible realities", "∞", "omniverse"],
    ["MEGAVERSE", "Megaverse", "An enormous collection of multiverses", "10⁶⁰ m", "megaverse"],
    ["MULTIVERSE", "Multiverse", "Multiple universes", "10⁴⁰ m", "multiverse"],
    ["HYPERVERSE", "Hyperverse", "Higher-dimensional realities", "10³⁸ m", "hyperverse"],
    ["METAVERSE", "Metaverse", "Interconnected reality systems", "10³⁶ m", "metaverse"],
    ["XENOVERSE", "Xenoverse", "Alien or fundamentally different realities", "10³⁴ m", "xenoverse"],
    ["MACROVERSE", "Macroverse", "Vast cosmic structures", "10³² m", "macroverse"],
    ["GIGAVERSE", "Gigaverse", "Massive collections of universes", "10³⁰ m", "gigaverse"],
    ["TERAVERSE", "Teraverse", "A larger cosmic domain", "10²⁸ m", "teraverse"],
    ["UNIVERSE", "Universe C-137", "Our universe", "8.8×10²⁶ m", "universe"],
    ["MICROVERSE", "Microverse", "A microscopic universe", "10⁻³ m", "microverse"],
    ["MILLIVERSE", "Milliverse", "A smaller reality", "10⁻⁶ m", "milliverse"],
    ["NANOVERSE", "Nanoverse", "A nanoscale reality", "10⁻⁹ m", "nanoverse"],
    ["PICOVERSE", "Picoverse", "A sub-nanoscopic reality", "10⁻¹² m", "picoverse"],
    ["FEMTOVERSE", "Femtoverse", "A subatomic-scale reality", "10⁻¹⁵ m", "femtoverse"],
    ["ATTOVERSE", "Attoverse", "An extremely tiny reality", "10⁻¹⁸ m", "attoverse"],
    ["ZEPTOVERSE", "Zeptoverse", "An even smaller reality", "10⁻²¹ m", "zeptoverse"],
    ["YOCTOVERSE", "Yoctoverse", "An extraordinarily tiny reality", "10⁻²⁴ m", "yoctoverse"],
    ["QUANTUMVERSE", "Quantumverse", "The Planck-scale foam beneath everything", "10⁻³⁵ m", "quantumverse"],
]
const UNIVERSE_INDEX = 9
// Lateral realms: alternate KINDS of reality that branch off at the Multiverse level (not bigger or smaller).
export const LATERAL: [string, string, string][] = [
    ["Necroverse", "Realities where only the dead persist", "necroverse"],
    ["Dreamverse", "Built from the collective dreams of extinct species", "dreamverse"],
    ["Echoverse", "The fading echoes of universes that already ended", "echoverse"],
    ["Mirrorverse", "Inverted realities where effect comes before cause", "mirrorverse"],
    ["Chronoverse", "Universes stacked in time, every epoch at once", "chronoverse"],
    ["Shadowverse", "The dark-matter twin of our universe", "shadowverse"],
    ["Glitchverse", "Abandoned simulations corrupted mid-render", "glitchverse"],
    ["Simverse", "Nested simulations run by long-dead AIs", "simverse"],
    ["Memoryverse", "Universes that exist only inside an AI's memory", "memoryverse"],
    ["Paraverse", "Near-copies split off by a single decision", "paraverse"],
    ["Antiverse", "Antimatter realities that annihilate on contact", "antiverse"],
    ["Voidverse", "The silent nothing between universes", "voidverse"],
    ["Fractalverse", "Self-similar realities repeating at every scale", "fractalverse"],
    ["Dataverse", "Reality made of pure information", "dataverse"],
    ["Foldverse", "Universes origami-folded into hidden dimensions", "foldverse"],
]
const LATERAL_BASE = 100 // tierFor() returns 100 + i for lateral realm i
const GREEK = "ΑΒΓΔΘΛΞΣΦΨΩ"
const img = (k: string) => `/assets/verse-${k}.webp`
const GAL: Record<string, { ra: string; dec: string; group: string; dist: string; img: string }> = {
    "Milky Way": { ra: "17h 45m 40s", dec: "−29° 00′ 28″", group: "Local Group", dist: "our own galaxy", img: "milkyway" },
    "Large Magellanic Cloud": { ra: "05h 23m 35s", dec: "−69° 45′ 22″", group: "Local Group", dist: "160,000 ly", img: "lmc" },
    Andromeda: { ra: "00h 42m 44s", dec: "+41° 16′ 09″", group: "Local Group", dist: "2.54 Mly", img: "andromeda" },
    Triangulum: { ra: "01h 33m 51s", dec: "+30° 39′ 37″", group: "Local Group", dist: "2.73 Mly", img: "triangulum" },
    Whirlpool: { ra: "13h 29m 53s", dec: "+47° 11′ 43″", group: "M51 Group", dist: "31 Mly", img: "whirlpool" },
    Sombrero: { ra: "12h 39m 59s", dec: "−11° 37′ 23″", group: "Virgo Cluster outskirts", dist: "29 Mly", img: "sombrero" },
    Pinwheel: { ra: "14h 03m 13s", dec: "+54° 20′ 57″", group: "M101 Group", dist: "21 Mly", img: "pinwheel" },
    "Centaurus A": { ra: "13h 25m 28s", dec: "−43° 01′ 09″", group: "Centaurus A / M83 Group", dist: "12 Mly", img: "centaurusa" },
}
// Micro-realities need a host object somewhere in our universe. (The battery is a nod to a certain Microverse.)
const HOSTS: Record<number, { where: string; obj: string; coords: string; img: string }> = {
    10: { where: "Earth", obj: "a sealed car-battery canister in a garage", coords: "47.61° N, 122.33° W · Earth", img: "battery" },
    11: { where: "Titan", obj: "a single methane raindrop", coords: "Ligeia Mare, 78° N · Titan, Saturn VI", img: "raindrop" },
    12: { where: "Europa", obj: "one snowflake on the ice crust", coords: "14° S, 203° W · Europa, Jupiter II", img: "snowflake" },
    13: { where: "Earth", obj: "a single carbon atom inside a diamond", coords: "Cullinan Mine, 25.67° S, 28.52° E · Earth", img: "diamond" },
    14: { where: "the Sun", obj: "one proton in a hydrogen atom", coords: "Solar core, 0.1 R☉ · Sol", img: "proton" },
    15: { where: "Earth", obj: "a down quark inside a proton", coords: "LHC ring, 46.23° N, 6.05° E · Earth", img: "quark" },
    16: { where: "Earth", obj: "a vibrating superstring", coords: "everywhere and nowhere · Earth", img: "zeptoverse" },
    17: { where: "Earth", obj: "a neutrino passing through your body", coords: "inside you, right now · Earth", img: "neutrino" },
    18: { where: "Earth", obj: "a Planck-scale bubble of spacetime foam", coords: "1.6×10⁻³⁵ m from here · Earth", img: "quantumverse" },
}
const XENO_PHYSICS = [
    "light travels backwards in time", "gravity repels", "there are two time dimensions", "entropy decreases",
    "pi is exactly 3", "matter is made of sound", "every particle remembers being observed", "space has a grain like wood",
    "the speed of light is 40 km/h", "colors have mass", "death is reversible but forgetting is not",
]
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function rng(seed: number) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1_000_000) / 1_000_000 } }
export type Step = { label: string; name: string; note: string; scale: string; kind: string; image: string; filter?: string; dir?: "start" | "out" | "in" | "across" }
const step = (i: number, name?: string, note?: string): Step => {
    const [label, base, n, scale, kind] = LADDER[i]
    return { label, name: name || base, note: note || n, scale, kind, image: img(kind) }
}
const code = (r: () => number, letters = "ABCDEFGHJKMNPRSTVWXYZ") => letters[Math.floor(r() * letters.length)] + "-" + (10 + Math.floor(r() * 989))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const LANIAKEA: Step = { label: "SUPERCLUSTER", name: "Laniakea", note: "100,000 galaxies flowing together", scale: "5×10²⁴ m", kind: "supercluster", image: img("supercluster") }
const LOCAL_GROUP: Step = { label: "GALAXY GROUP", name: "Local Group", note: "Milky Way, Andromeda, Triangulum and 80 small galaxies", scale: "10²³ m", kind: "group", image: img("localgroup") }
const MILKY_WAY: Step = { label: "GALAXY", name: "Milky Way", note: "our galaxy: 200 billion stars", scale: "10²¹ m", kind: "galaxy", image: img("milkyway") }
const SOL: Step = { label: "STAR", name: "Sol", note: "our Sun, 4.6 billion years old", scale: "10¹³ m", kind: "star", image: img("sun") }
const EARTH: Step = { label: "HOME", name: "Earth", note: "you are here · 8.2 billion humans", scale: "10⁷ m", kind: "earth", image: img("earth") }
const homePath = (): Step[] => [step(0), step(1, "Megaverse M-1", "Home of our multiverse"), step(2, "Multiverse Δ-12", "Where our universe budded off"), step(UNIVERSE_INDEX), LANIAKEA, LOCAL_GROUP, MILKY_WAY, SOL, EARTH]

/** Which tier a world lives at (used by world generation before the world has a name). */
export function tierFor(id: string, _archetype = ""): number {
    if (id === "mars-colony") return UNIVERSE_INDEX
    const r = rng(hash(id))()
    if (r < 0.46) return UNIVERSE_INDEX
    const r2 = rng(hash(id + "#tier"))()
    if (r < 0.63) return 1 + Math.floor(r2 * 8) // Megaverse .. Teraverse
    if (r < 0.80) return LATERAL_BASE + Math.floor(r2 * LATERAL.length) // the 15 lateral realms
    return 10 + Math.floor(r2 * 9) // Microverse .. Quantumverse
}
export type RealmClass = "galaxy" | "bigger" | "parallel" | "smaller"
export function realmClass(id: string): RealmClass {
    const t = tierFor(id)
    return t === UNIVERSE_INDEX ? "galaxy" : t >= LATERAL_BASE ? "parallel" : t < UNIVERSE_INDEX ? "bigger" : "smaller"
}
/** World ids decide the realm, so a player's choice of direction is honoured by drawing ids until one lands there. */
export function idForRealm(realm: string, make: () => string): string {
    let id = make()
    if (!["galaxy", "bigger", "parallel", "smaller"].includes(realm)) return id
    for (let i = 0; i < 500 && realmClass(id) !== realm; i++) id = make()
    return id
}
export function tierPromptHint(id: string, archetype: string): string {
    const t = tierFor(id, archetype)
    if (t === UNIVERSE_INDEX) return ""
    const r = rng(hash(id + "#hint"))
    if (t >= LATERAL_BASE) { const L = LATERAL[t - LATERAL_BASE]; return `REALM: this world exists in the ${L[0]}: ${L[1].toLowerCase()}. Let the nature of that realm shape the species, how they fell, the AI and the greeting in a specific, imaginative way.` }
    if (t < UNIVERSE_INDEX) return `REALM: this world is not in our universe. It exists in the ${LADDER[t][1]} (${LADDER[t][2].toLowerCase()}), in a parallel universe where ${XENO_PHYSICS[Math.floor(r() * XENO_PHYSICS.length)]}. Let that physics shape the species, how they fell and the AI.`
    const h = HOSTS[t]
    return `REALM: this world exists in the ${LADDER[t][1]} (${LADDER[t][2].toLowerCase()}): an entire tiny reality inside ${h.obj} on ${h.where}, in our universe. Its makers never knew how small they were. Let that scale shape the species, how they fell and the AI (it may know about the giant world outside).`
}
export function cosmosFor(w: { id: string; planetName: string; galaxy: string; starName: string; archetype: string; aiName: string; terrain: string; aiTitle?: string; createdAt?: number }) {
    const r = rng(hash(w.id + "#cosmos"))
    const t = tierFor(w.id, w.archetype)
    const g = GAL[w.galaxy] || GAL["Milky Way"]
    const arrived = new Date(w.createdAt || Date.now())
    const earthTime = arrived.toLocaleString("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) + " PT (Earth)"
    const since = Math.floor(2_000 + r() * 9_000_000).toLocaleString()
    const localYear = Math.floor(100_000 + r() * 9_900_000).toLocaleString()
    const worldStep: Step = { label: "WORLD", name: w.planetName, note: `${w.aiTitle || "Its surviving AI"} · ${w.aiName}`, scale: "10⁷ m", kind: "world", image: `/assets/world-${w.terrain || "ruins"}.webp` }
    const home = homePath()
    const tint = () => `hue-rotate(${40 + Math.floor(r() * 280)}deg) saturate(1.35)`
    let path: Step[] = [], coords = "", cosmicTime = ""
    if (w.id === "mars-colony") {
        path = [...home.slice(0, 8), { ...worldStep, note: "Ares Base, Jezero crater · HAVEN", image: "/assets/world-mars.webp" }]
        coords = "Jezero crater 18.38° N, 77.58° E · Mars · 225 million km from Earth"
        cosmicTime = "13.8 billion years after the Big Bang"
    } else if (t === UNIVERSE_INDEX) {
        const group: Step = g.group === "Local Group" ? LOCAL_GROUP : { label: "GALAXY GROUP", name: g.group, note: "a gravitationally bound family of galaxies", scale: "10²³ m", kind: "group", image: img("galaxygroup") }
        const galaxy: Step = w.galaxy === "Milky Way" ? MILKY_WAY : { label: "GALAXY", name: w.galaxy, note: `${g.dist} from Earth`, scale: "10²¹ m", kind: "galaxy", image: img(g.img) }
        path = [...home.slice(0, 5), group, galaxy, { label: "STAR", name: w.starName, note: "the star its makers orbited", scale: "10¹³ m", kind: "star", image: img("star") }, worldStep]
        const jitter = (n: number) => String(Math.floor(r() * n)).padStart(2, "0")
        coords = `RA ${g.ra.replace(/\d\ds$/, jitter(60) + "s")} · Dec ${g.dec.replace(/\d\d″$/, jitter(60) + "″")} · ${g.dist}`
        cosmicTime = "13.8 billion years after the Big Bang"
    } else if (t >= LATERAL_BASE) {
        const L = LATERAL[t - LATERAL_BASE]
        const uni = code(r), f = tint()
        path = [...home.slice(0, 3), { label: "PARALLEL REALM", name: `${L[0]} ${code(r, GREEK)}`, note: L[1], scale: "beside ours", kind: "lateral", image: img(L[2]) },
            { label: "UNIVERSE", name: `Universe ${uni}`, note: `a universe of the ${L[0]}`, scale: "10²⁷ m", kind: "universe", image: img("universe"), filter: f },
            { label: "GALAXY", name: `${w.galaxy} (${uni} variant)`, note: "this realm's version of a galaxy we know", scale: "10²¹ m", kind: "galaxy", image: img(g.img), filter: f },
            { label: "STAR", name: w.starName, note: "a star in another kind of reality", scale: "10¹³ m", kind: "star", image: img("star"), filter: f }, worldStep]
        coords = `${L[0]} · Universe ${uni} · branch ${Math.floor(r() * 9999)} off Multiverse Δ-12`
        cosmicTime = `${(1 + r() * 60).toFixed(1)} billion years after its realm split from ours`
    } else if (t < UNIVERSE_INDEX) {
        const uni = code(r)
        path = [step(0)]
        for (let i = 1; i <= t; i++) path.push(step(i, `${LADDER[i][1]} ${code(r, GREEK)}`))
        const physics = XENO_PHYSICS[Math.floor(r() * XENO_PHYSICS.length)], f = tint()
        path.push({ label: "UNIVERSE", name: `Universe ${uni}`, note: `a parallel universe where ${physics}`, scale: "10²⁷ m", kind: "universe", image: img("universe"), filter: f },
            { label: "GALAXY", name: `${w.galaxy} (${uni} variant)`, note: "this universe's version of a galaxy we know", scale: "10²¹ m", kind: "galaxy", image: img(g.img), filter: f },
            { label: "STAR", name: w.starName, note: "a star that should not exist", scale: "10¹³ m", kind: "star", image: img("star"), filter: f }, worldStep)
        const c = () => (r() * 40 - 20).toFixed(1)
        coords = `Universe ${uni} · brane ${Math.floor(r() * 99)} · (x, y, z, w) = (${c()}, ${c()}, ${c()}, ${(r()).toFixed(2)}) Gly`
        cosmicTime = `${(4 + r() * 90).toFixed(1)} billion years after its own Big Bang`
    } else {
        const h = HOSTS[t]
        const body: Step[] = h.where === "the Sun" ? [] : [{
            label: h.where === "Earth" ? "PLANET" : "MOON", name: h.where, note: h.where === "Earth" ? "home" : h.where === "Titan" ? "Saturn's largest moon" : "Jupiter's ice moon",
            scale: "10⁶ m", kind: h.where === "Earth" ? "earth" : "moon", image: img(h.where === "Earth" ? "earth" : h.where.toLowerCase())
        }]
        path = [...home.slice(0, 8), ...body, { label: "OBJECT", name: cap(h.obj), note: h.coords, scale: "10⁻² m", kind: "object", image: img(h.img) }]
        for (let i = 10; i <= t; i++) path.push(step(i))
        path.push(worldStep)
        coords = `Inside ${h.obj} · ${h.coords}`
        const dil = Math.floor(10_000 + r() * 90_000_000).toLocaleString()
        cosmicTime = `1 second on Earth = ${dil} years here`
    }
    // The route from Earth: zoom out to the nearest shared ancestor, then in (or across) to the world.
    let k = 0
    while (k < home.length && k < path.length && home[k].name === path[k].name) k++
    const journey: Step[] = [{ ...EARTH, dir: "start" }]
    for (let i = home.length - 2; i >= Math.max(0, k - 1); i--) journey.push({ ...home[i], dir: "out" })
    for (let i = k; i < path.length; i++) journey.push({ ...path[i], dir: path[i].kind === "lateral" ? "across" : "in" })
    const lateral = t >= LATERAL_BASE ? LATERAL[t - LATERAL_BASE] : null
    return {
        tier: lateral ? lateral[0] : LADDER[t][1], tierIndex: lateral ? 2 : t, tierNote: lateral ? lateral[1] : LADDER[t][2], lateral: !!lateral, realm: realmClass(w.id),
        epoch: `Local year ${localYear}`, earthTime, cosmicTime, sinceExtinction: w.id === "mars-colony" ? "no one has died here yet" : `${since} years after the last maker died`,
        coords, path, breadcrumb: path.map(p => p.name).join(" ▸ "), journey, route: journey.map(s => s.name).join(" → "),
        world: { planetName: w.planetName, terrain: w.terrain, archetype: w.archetype, aiName: w.aiName },
    }
}
