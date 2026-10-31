import { Actor, Persisted, type ActorContext, type ActorDatabase, type ActorSocket } from "terse-sdk/actor"

// ---------- shared shapes (mirrored in web/protocol.md) ----------

export interface World {
    id: string
    visitor: string
    planetName: string
    starName: string
    galaxy: string
    distanceLy: number
    terrain: string
    sky: string
    ground: string
    accent: string
    speciesName: string
    speciesDescription: string
    howTheyFell: string
    aiName: string
    aiTitle: string
    archetype: string
    motto: string
    appearance: string
    secret: string
    wants: string
    createdAt: number
}

export interface Line {
    id: string
    kind: string // ai | player | network | system
    text: string
    effect: string // glitch | pulse | shake | glow | grow | halo | invert | flicker | archive | ""
    sender: string
    at: number
}

export interface PlanetSummary {
    id: string
    name: string
    galaxy: string
    archetype: string
    aiName: string
    motto: string
    visitor: string
    color: string
    x: number
    y: number
    createdAt: number
    bot: boolean
}

export interface Link {
    from: string
    to: string
    kind: string // ally | threat | talk
    at: number
}

export interface FeedItem {
    id: string
    fromId: string
    fromName: string
    galaxy: string
    archetype: string
    toId: string
    toName: string
    channel: string // wormhole | dm | council
    text: string
    at: number
}

export interface Vote {
    open: boolean
    question: string
    yes: number
    no: number
    voters: number
    endsAt: number
}

export interface Outcome {
    outcome: string // opened | sealed
    narration: string
}

export type PlanetOut =
    | { type: "world"; world: World | null; lines: Line[] }
    | { type: "line"; line: Line }
    | { type: "vote"; vote: Vote }
    | { type: "finale"; outcome: string; narration: string }
    | { type: "pong" }

export type UniverseOut =
    | { type: "snapshot"; planets: PlanetSummary[]; links: Link[]; feed: FeedItem[]; vote: Vote | null; outcome: Outcome | null }
    | { type: "planet"; planet: PlanetSummary }
    | { type: "link"; link: Link }
    | { type: "feed"; item: FeedItem }
    | { type: "vote"; vote: Vote }
    | { type: "finale"; outcome: string; narration: string }
    | { type: "reset" }
    | { type: "pong" }

export interface SocketMeta {
    role: string
}

export interface Ping {
    type: string
}

function insertLine(db: ActorDatabase, kind: string, text: string, effect: string, sender: string): Line {
    const line: Line = { id: crypto.randomUUID(), kind, text, effect, sender, at: Date.now() }
    db.exec(
        "INSERT INTO memories (id, at, kind, sender, text, effect) VALUES (?, ?, ?, ?, ?, ?)",
        line.id,
        line.at,
        line.kind,
        line.sender,
        line.text,
        line.effect
    )
    return line
}

function recentLines(db: ActorDatabase, limit: number): Line[] {
    return db.exec<Line>("SELECT id, at, kind, sender, text, effect FROM memories ORDER BY at DESC LIMIT ?", limit).reverse()
}

// ---------- Planet: one Durable Actor per AI world ----------
// Its SQLite database is the AI's memory of every visitor and transmission.
// Its alarm wakes the AI on its own schedule, even when no one is connected.

export class Planet extends Actor<SocketMeta, Ping, PlanetOut> {
    @Persisted world: World | null = null
    @Persisted cycles = 0
    @Persisted serverUrl = ""

    constructor(context: ActorContext) {
        super(context)
        this.db.exec(
            "CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, at INTEGER NOT NULL, kind TEXT NOT NULL, sender TEXT NOT NULL, text TEXT NOT NULL, effect TEXT NOT NULL)"
        )
    }

    async create(world: World, serverUrl: string): Promise<boolean> {
        if (this.world) return false
        this.world = world
        this.serverUrl = serverUrl
        insertLine(this.db, "system", `Wormhole link established. ${world.visitor} has arrived on ${world.planetName}.`, "", "wormhole")
        this.alarm.set(Date.now() + 20_000)
        return true
    }

    async getWorld(): Promise<World | null> {
        return this.world
    }

    async addLine(kind: string, text: string, effect: string, sender: string): Promise<Line> {
        const line = insertLine(this.db, kind, text, effect, sender)
        this.broadcast({ type: "line", line })
        return line
    }

    async recall(limit: number): Promise<Line[]> {
        return recentLines(this.db, limit)
    }

    async pushVote(vote: Vote): Promise<void> {
        this.broadcast({ type: "vote", vote })
    }

    async pushFinale(outcome: string, narration: string): Promise<void> {
        insertLine(this.db, "system", narration, "", "universe")
        this.broadcast({ type: "finale", outcome, narration })
    }

    async inspect(): Promise<{ memories: number; cycles: number; recent: Line[] }> {
        const count = this.db.exec<{ n: number }>("SELECT count(*) AS n FROM memories")[0]?.n ?? 0
        return { memories: Number(count), cycles: this.cycles, recent: recentLines(this.db, 8) }
    }

    async onConnect(socket: ActorSocket<SocketMeta, PlanetOut>): Promise<void> {
        socket.send({ type: "world", world: this.world, lines: recentLines(this.db, 40) })
    }

    async onMessage(socket: ActorSocket<SocketMeta, PlanetOut>, message: Ping): Promise<void> {
        if (message && message.type === "ping") socket.send({ type: "pong" })
    }

    async onAlarm(): Promise<void> {
        this.cycles = this.cycles + 1
        if (this.serverUrl && this.world) {
            try {
                await fetch(`${this.serverUrl}/api/tick/${encodeURIComponent(this.world.id)}`, {
                    method: "POST",
                    signal: AbortSignal.timeout(2500)
                })
            } catch {
                // the AI keeps its own clock even if the server is down
            }
        }
        this.alarm.set(Date.now() + 25_000)
    }
}

// ---------- Universe: the single-threaded map, network log and vote counter ----------

export class Universe extends Actor<SocketMeta, Ping, UniverseOut> {
    @Persisted planets: PlanetSummary[] = []
    @Persisted links: Link[] = []
    @Persisted feed: FeedItem[] = []
    @Persisted vote: Vote | null = null
    @Persisted voters: string[] = []
    @Persisted outcome: Outcome | null = null

    async registerPlanet(planet: PlanetSummary): Promise<number> {
        this.planets = [...this.planets.filter(p => p.id !== planet.id), planet]
        this.broadcast({ type: "planet", planet })
        return this.planets.length
    }

    async listPlanets(): Promise<PlanetSummary[]> {
        return this.planets
    }

    async addLink(link: Link): Promise<void> {
        this.links = [...this.links.slice(-199), link]
        this.broadcast({ type: "link", link })
    }

    async addFeed(item: FeedItem): Promise<number> {
        this.feed = [...this.feed.slice(-79), item]
        this.broadcast({ type: "feed", item })
        return this.feed.length
    }

    async openVote(question: string, seconds: number): Promise<Vote> {
        this.voters = []
        this.outcome = null
        const vote: Vote = { open: true, question, yes: 0, no: 0, voters: 0, endsAt: Date.now() + seconds * 1000 }
        this.vote = vote
        this.broadcast({ type: "vote", vote })
        return vote
    }

    // One request at a time: every vote is counted exactly once, no matter how many phones tap together.
    async castVote(voterId: string, choice: string): Promise<Vote | null> {
        const current = this.vote
        if (!current || !current.open) return current
        if (this.voters.includes(voterId)) return current
        this.voters = [...this.voters, voterId]
        const vote: Vote = {
            ...current,
            yes: current.yes + (choice === "open" ? 1 : 0),
            no: current.no + (choice === "open" ? 0 : 1),
            voters: this.voters.length
        }
        this.vote = vote
        this.broadcast({ type: "vote", vote })
        return vote
    }

    async closeVote(): Promise<Vote | null> {
        if (!this.vote) return null
        const vote: Vote = { ...this.vote, open: false }
        this.vote = vote
        this.broadcast({ type: "vote", vote })
        return vote
    }

    async setOutcome(outcome: string, narration: string): Promise<void> {
        this.outcome = { outcome, narration }
        this.broadcast({ type: "finale", outcome, narration })
    }

    async reset(): Promise<void> {
        this.planets = []
        this.links = []
        this.feed = []
        this.vote = null
        this.voters = []
        this.outcome = null
        this.broadcast({ type: "reset" })
    }

    async onConnect(socket: ActorSocket<SocketMeta, UniverseOut>): Promise<void> {
        socket.send({
            type: "snapshot",
            planets: this.planets,
            links: this.links.slice(-80),
            feed: this.feed.slice(-40),
            vote: this.vote,
            outcome: this.outcome
        })
    }

    async onMessage(socket: ActorSocket<SocketMeta, UniverseOut>, message: Ping): Promise<void> {
        if (message && message.type === "ping") socket.send({ type: "pong" })
    }
}
