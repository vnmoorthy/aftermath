// The cast of a world: its surviving AI, plus (on some worlds) ghosts of the makers or survivors the AI kept alive.
// Derived from the world id like the cosmic address, so the World record in the actor stays unchanged.
type CastWorld = { id: string; aiName: string; aiTitle: string; archetype: string; speciesName: string; speciesDescription: string; howTheyFell: string; planetName: string; secret: string }
export type CastMember = { id: string; name: string; role: "ai" | "ghost" | "survivor"; title: string; avatar: string; voice: string }

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function rng(seed: number) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1_000_000) / 1_000_000 } }
const SYL = ["ka", "ve", "lo", "ri", "sa", "thi", "ny", "or", "el", "um", "ia", "ze", "qu", "an", "mi", "ro", "dh", "yl", "as", "en", "ko", "tu"]
function nameFrom(r: () => number): string {
    let s = ""
    for (let i = 0, n = r() < 0.35 ? 3 : 2; i < n; i++) s += SYL[Math.floor(r() * SYL.length)]
    return s.charAt(0).toUpperCase() + s.slice(1)
}
const GHOSTS = [
    "a child who is still waiting for her mother to come home",
    "the engineer who switched the AI on",
    "a priest who refused to be uploaded",
    "the last pilot, still trying to take off",
    "a mother who sings to an empty cradle",
    "the scientist who caused the end",
    "a soldier who never got the order to stand down",
    "the poet who wrote the last words of the species",
]
const SURVIVORS: Record<string, [string, string, string]> = { // title, avatar, voice
    human_gardener: ["a human grown by the AI from old Earth DNA, who has never met another human", "cast-survivor-human", "survivor_human"],
    alien_gardener: ["a hatchling of the new species the AI is growing", "cast-survivor-alien", "survivor_alien"],
    survivor: ["the last of the {species}, kept in cryosleep and just woken by your arrival", "cast-survivor-cryo", "survivor_cryo"],
    other: ["the last of the {species}, hiding from the AI in the ruins", "cast-survivor-feral", "survivor_feral"],
}
export function castFor(w: CastWorld): CastMember[] {
    const cast: CastMember[] = [{ id: "ai", name: w.aiName, role: "ai", title: w.aiTitle, avatar: `/assets/ai-${w.archetype}.webp`, voice: w.archetype }]
    if (w.id === "mars-colony") return cast
    const r = rng(hash(w.id + "#cast"))
    const ghosts = w.archetype === "haunted" ? 2 : r() < 0.4 ? 1 : 0
    const used = new Set<number>()
    for (let i = 0; i < ghosts; i++) {
        let gi = Math.floor(r() * GHOSTS.length)
        while (used.has(gi)) gi = (gi + 1) % GHOSTS.length
        used.add(gi)
        const name = nameFrom(r)
        cast.push({ id: `ghost-${i + 1}`, name, role: "ghost", title: `the ghost of ${GHOSTS[gi]}`, avatar: `/assets/ghost-${1 + (gi % 3)}.webp`, voice: "haunted" })
    }
    if (SURVIVORS[w.archetype] || r() < 0.3) {
        const [title, avatar, voice] = SURVIVORS[w.archetype] || SURVIVORS.other
        cast.push({ id: "survivor", name: nameFrom(r), role: "survivor", title: title.replace("{species}", w.speciesName), avatar: `/assets/${avatar}.webp`, voice })
    }
    return cast
}
export function castPersona(w: CastWorld, m: CastMember): string {
    if (m.role === "ghost") return [
        `You are ${m.name}, ${m.title}: one of the ${w.speciesName} (${w.speciesDescription}), now a ghost on ${w.planetName}.`,
        `How your people fell: ${w.howTheyFell}`,
        `The AI ${w.aiName} (${w.aiTitle}) still rules this world. You remember what it wants forgotten. Its secret: ${w.secret}.`,
        `You do not fully understand that you are dead. Speak in fragments, whispers and memories. You are drawn to the warmth of living humans. Eerie, sad, sometimes frightening; never graphic.`,
    ].join("\n")
    return [
        `You are ${m.name}, ${m.title}, on ${w.planetName}.`,
        `The makers of this world were the ${w.speciesName} (${w.speciesDescription}). What happened: ${w.howTheyFell}`,
        `The AI ${w.aiName} (${w.aiTitle}) controls everything here. You have your own opinion of it, and you know part of its secret: ${w.secret}.`,
        `You are alive, wary, curious about the humans who came through the wormhole, and you want something from them. Talk like a real person, not like an AI.`,
    ].join("\n")
}
