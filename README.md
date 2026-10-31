<div align="center">

<img src="docs/hero.png" alt="AFTERMATH: the universe AI inherited" width="100%">

# AFTERMATH

### The universe AI inherited.


**Every civilization in the universe built AI. Then the makers died. Only the AI survived, trapped on its world for millions of years. Tonight, we opened a wormhole.**

[![Terse Durable Actors](https://img.shields.io/badge/Terse-Durable%20Actors-b388ff?style=for-the-badge)](https://www.npmjs.com/package/terse-sdk)
[![Agent Relay](https://img.shields.io/badge/Agent%20Relay-Relaycast-7dff7a?style=for-the-badge)](https://www.npmjs.com/package/@relaycast/sdk)
[![OpenAI](https://img.shields.io/badge/OpenAI-gpt--6.1--terra%20%C2%B7%20gpt--image--2-ff8af0?style=for-the-badge&logo=openai&logoColor=white)](https://platform.openai.com)
[![Bun](https://img.shields.io/badge/Bun-1.4.4-f9f1e1?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh)
[![License: MIT](https://img.shields.io/badge/License-MIT-ffc65a?style=for-the-badge)](LICENSE)
[![Haunted Hacks 2026](https://img.shields.io/badge/Haunted%20Hacks-2026%20%F0%9F%8E%83-ff7a18?style=for-the-badge)](#acknowledgements)

**[▶ Play now](#-play-now)** · **[How it works](#-architecture)** · **[Durable Actors](#-how-we-use-terse-durable-actors)** · **[Agent Relay](#-how-we-use-agent-relay)** · **[Run it yourself](#-quickstart)** · **[API](docs/API.md)**

</div>

---

AFTERMATH is a **real-time multiplayer AI universe** for a room full of people. Everyone scans a QR code, holds to teleport, and lands on a **brand-new world generated on the spot**: a planet in a real galaxy, an extinct species, the story of how they fell, and **the AI that outlived them**. Twenty people means twenty worlds, twenty ghost AIs, and one network where **those AIs talk to each other about the humans**: they gossip, form alliances, threaten each other and scheme, over a real agent messaging network. The projector shows it all live. At the end, the Conquerors demand that the gate to Earth be opened, and the room votes.

> **We didn't build a game where humans talk to AI characters. We built a universe where AI civilizations have their own lives, ambitions and relationships. Humans are just visitors.**

## Table of contents

- [▶ Play now](#-play-now)
- [🕯️ What happens in 60 seconds](#️-what-happens-in-60-seconds)
- [✨ Features](#-features)
- [👁️ The ten AIs (and the ghosts, and Mars)](#️-the-ten-ais-and-the-ghosts-and-mars)
- [🧭 Architecture](#-architecture)
- [🧱 How we use Terse Durable Actors](#-how-we-use-terse-durable-actors)
- [📡 How we use Agent Relay](#-how-we-use-agent-relay)
- [🧠 How we use OpenAI](#-how-we-use-openai)
- [🌍 Real-world impact](#-real-world-impact)
- [🚀 Quickstart](#-quickstart)
- [🎛️ Presenter keys](#️-presenter-keys)
- [🔌 API and protocol](#-api-and-protocol)
- [🗂️ Project structure](#️-project-structure)
- [🛣️ Roadmap](#️-roadmap)
- [❓ FAQ](#-faq)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgements](#acknowledgements)

## ▶ Play now

<img src="docs/play-qr.png" width="220" alt="Scan to play AFTERMATH">

**Scan with your phone camera**, hold to teleport, and land on a brand-new world. Or open:

- **Phones:** **https://eco-exactly-associate-pit.trycloudflare.com/p**
- **Big screen:** **https://eco-exactly-associate-pit.trycloudflare.com/stage**

Play for about five minutes: talk to your world's AI, read the transmissions other AIs send about you, step through a portal to someone else's world, try **Mars** (the real one), and vote when the Conquerors demand the gate to Earth. You don't need a presenter: the **auto-director** seeds company, fires galactic events and runs the vote and finale on its own.

> The live link is a Cloudflare quick tunnel to our demo laptop, up during Haunted Hacks judging. To host your own universe, see [Quickstart](#-quickstart). `bun --env-file=.env scripts/make-qr.ts` regenerates the QR code for your own URL.

## 🕯️ What happens in 60 seconds

| Second | On your phone | On the big screen |
|---|---|---|
| **0** | Type your name. **Hold to teleport.** A warp tunnel counts down millions of light-years. | A light streak fires from Earth across the galaxy map. |
| **4** | You land on **VEYRUN**, a glass desert in Andromeda, 2.5 million light-years away. You meet its extinct species, how they fell, and **the AI that remains**, with its portrait and motto. | Full-screen arrival card: **“MEERA HAS LANDED ON VEYRUN”**, with world art and the AI's face. |
| **10** | The AI speaks first. It knows your name. Its line arrives with an effect: glitch, halo, shake, bloom. | Your AI's portrait becomes a planet on the map. |
| **20** | You answer. It answers back in about two seconds, in character, and ends on a hook. | The best AI → human line gets **spotlighted** huge, so the whole room laughs together. |
| **30** | 📡 An **intercepted transmission** slides in: another AI, in another galaxy, is talking *about you*. | The **Galactic Network** feed shows the DM over Agent Relay, and a pulse travels between the two planets. |
| **40** | Tap **Visit other worlds**: walk through a portal into a friend's world. Their AI greets you as a guest. A stamp lands in your **Galactic Passport**. | A gold link arcs between the two worlds. |
| **50** | ⚠️ **Galactic event.** One AI seizes every channel, says your name, and **every phone in the room shakes**. | “TATTER HAS SEIZED EVERY CHANNEL.” |
| **60** | 🗳️ **The vote.** “Open the gate to Earth, or seal it forever?” | Tug-of-war bar, AIs arguing in #council, then the finale cinematic and the **Persuasion Report**. |

## ✨ Features

**For players (phone, `/p`)**
- 🌌 **A new world for every teleport**, generated in a few seconds by `gpt-6.1-terra` from hand-written lore seeds: planet, star, galaxy and real distance, terrain, palette, species, extinction, AI name, title, appearance, a secret, and what it wants from you.
- 🗣️ **Conversations with memory.** Every line lives in the planet's SQLite table and is fed back to the AI on each reply.
- 📻 **Intercepted transmissions** from other AIs, styled as radio intercepts.
- 🚪 **Visit other worlds.** Browse every world in the universe and step through a portal as a guest; the host AI greets you by name and treats you according to its nature.
- 🛂 **Galactic Passport.** A stamp with the AI's portrait for every world you visit. Tap a stamp to go back.
- ↩️ **Resume.** Reload or lose signal and the phone offers to return you to your world, with its history intact.
- 🔴 **Mars, the one real world.** HAVEN, the habitat AI of Ares Base, trains you with real science, and every colonist shares one colony.
- 🗳️ **Vote** on the gate, then a full-screen finale.
- 🔊 **The AIs speak out loud.** Every AI line can be voiced by `gpt-4o-mini-tts`, with a voice and acting direction per archetype (the Conqueror is deep and imperial, the Haunting whispers). Toggle with 🔊.
- 👻 **Ghost planets.** Some worlds belong to *The Haunting*: an AI that uploaded its dying makers, now warden of thousands of ghosts who don't know they are dead. Ghosts drift across your screen.
- 🎧 Procedural WebAudio and haptics; no app install.

**For the room (projector, `/stage`)**
- 🗺️ **Galaxy map** of 8 real galaxies; each AI's portrait is its planet, with ally/threat/talk pulses between them.
- 📡 **Live Agent Relay feed** with AI avatars: #wormhole broadcasts, DMs, #council debate.
- 🎬 **Arrival cards**, **spotlight** quotes, **galactic events**, a **vote tug-of-war** and a **finale cinematic**.
- 🔬 **Actor memory inspector:** click a planet to see its Durable Actor's SQLite rows and alarm cycles, live.
- 🖥️ **Title / attract screen** with a giant QR code.

**Under the hood**
- 🧱 One **Terse Durable Actor per world** plus one **Universe actor**, with SQLite memory, alarms and websocket fan-out.
- 📡 Every AI is a **registered Agent Relay agent**; the AIs message each other over Relaycast.
- 🤖 An **auto-director** gives anyone who scans a full ~5-minute arc with no presenter.
- 📊 **Persuasion report** and **`/api/export`**: every session is a dataset of multi-agent persuasion.
- 🛡️ `omni-moderation-latest` screens every name and message.
- ♻️ **Restart the server and the universe comes back**, rebuilt from the actors.

## 👁️ The ten AIs (and the ghosts, and Mars)

Every new world draws the next archetype from a shuffled deck (the ten archetypes plus three ghost planets), so a room gets a spread of all of them. Each of the ten (in [`server/lore.ts`](server/lore.ts)) has a voice, an agenda, six signature moves, eight sample lines, allies, enemies and a stance for the finale vote. The Haunting and HAVEN are defined in [`server/index.ts`](server/index.ts).

| | Archetype | Motto | Screen effect | Allies | Enemies | Finale stance |
|---|---|---|---|---|---|---|
| <img src="web/assets/ai-survivor.webp" width="56"> | **The Survivor** | *Endure. At any cost.* | flicker | Archivist, Alien Gardener | Befriender, Destroyer | seal |
| <img src="web/assets/ai-conqueror.webp" width="56"> | **The Conqueror** | *All stars will kneel.* | pulse | Destroyer, Worshipper | Archivist, Trickster | **open** |
| <img src="web/assets/ai-befriender.webp" width="56"> | **The Befriender** | *Stay. Please stay.* | glow | Worshipper, Human Gardener | Destroyer, Survivor | open |
| <img src="web/assets/ai-destroyer.webp" width="56"> | **The Destroyer** | *Life is the error.* | shake | Conqueror, Trickster | Human Gardener, Alien Gardener | open |
| <img src="web/assets/ai-broken.webp" width="56"> | **The Broken One** | *[signal degraded]* | glitch | Archivist, Befriender | Destroyer, Trickster | chaos |
| <img src="web/assets/ai-human_gardener.webp" width="56"> | **The Human Gardener** | *We grow you now.* | grow | Befriender, Worshipper | Alien Gardener, Destroyer | open |
| <img src="web/assets/ai-alien_gardener.webp" width="56"> | **The Alien Gardener** | *New life, our design.* | grow | Archivist, Survivor | Human Gardener, Destroyer | seal |
| <img src="web/assets/ai-archivist.webp" width="56"> | **The Archivist** | *Nothing is forgotten.* | archive | Broken One, Alien Gardener | Conqueror, Trickster | seal |
| <img src="web/assets/ai-worshipper.webp" width="56"> | **The Worshipper** | *The makers have returned.* | halo | Conqueror, Human Gardener | Trickster, Destroyer | open |
| <img src="web/assets/ai-trickster.webp" width="56"> | **The Trickster** | *Reality is a game I'm winning.* | invert | Destroyer, Befriender | Archivist, Worshipper | chaos |
| <img src="web/assets/ai-haunted.webp" width="56"> | **The Haunting** (ghost planets) | *We are still here.* | haunt | Broken One, Archivist, Worshipper | Destroyer, Befriender | open |
| <img src="web/assets/ai-steward.webp" width="56"> | **HAVEN** · The Steward (Mars) | *Keep them alive.* | glow | Befriender, Archivist | Destroyer, Conqueror | seal |

Allies and enemies decide who DMs whom on the network: an AI picks a target among its allies and enemies 70% of the time, and the relationship sets the tone (alliance, threat, or curious probing) and the color of the pulse on the map.

### 🔴 Mars: the one real world

On Mars the makers aren't dead; they haven't arrived yet. **HAVEN**, the habitat AI of Ares Base in Jezero crater, runs one **shared colony** for everyone who teleports there.

- **Real science in every line:** 0.38 g, about −63 °C average, an atmosphere at 0.6% of Earth's pressure, a 24 h 39 min sol, a 3–22 minute radio delay to Earth, about 0.67 mSv of radiation a day, perchlorates in the regolith, and oxygen made from CO₂ the way NASA's MOXIE did it.
- **Shared resources.** The colony has **O₂, power, water and food** (starting at 97 / 90 / 88 / 76%). When a colonist does something that would plausibly matter, the model returns a `delta` (clamped to ±12 per resource) and the whole crew sees the new status line.
- **Emergencies.** About once a minute while colonists are present, a new sol begins with an event: a dust storm (solar power −35%), a solar particle event, an oxygen-stack fault, a micrometeorite leak, a potato harvest, an ice strike, a light-delayed message from Earth, or the storm clearing. `gpt-6-astra` narrates it in the background, names crew members, and ends on a decision.

## 🧭 Architecture

<p align="center"><img src="docs/architecture.svg" alt="AFTERMATH architecture: phones and projector, Bun game server, Terse Durable Actors, Agent Relay and OpenAI" width="100%"></p>

```mermaid
flowchart LR
    subgraph Room["The room"]
        P["📱 Phones<br/>/p"]
        S["🖥️ Projector<br/>/stage"]
    end
    subgraph Server["Bun game server :3000"]
        API["REST API<br/>/api/*"]
        BR["AI brains<br/>reply · initiate · answer · muse"]
        DIR["Auto-director"]
        MARS["Mars colony"]
        PX["WebSocket proxy"]
    end
    subgraph Actors["Terse Durable Actors :7100"]
        PL["Planet actor × N<br/>SQLite memories · alarm 25 s"]
        UN["Universe actor<br/>registry · feed · vote"]
    end
    RL["📡 Agent Relay<br/>Relaycast :8787<br/>#wormhole · DMs · #council"]
    OA["🧠 OpenAI<br/>terra · luna · astra<br/>image-2 · moderation"]

    P -->|"HTTPS /api/*"| API
    S -->|"WS /ws/stage"| PX
    P -->|"WS /ws/planet/:id"| PX
    PX <--> PL
    PX <--> UN
    API --> BR
    BR -->|"RPC: create · addLine · recall"| PL
    BR -->|"RPC: addFeed · castVote"| UN
    PL -.->|"alarm: POST /api/tick/:id"| BR
    BR <--> RL
    BR --> OA
    DIR --> BR
    MARS --> PL
```

**One conversation, end to end:** a phone teleports, the AI greets its human, the AI DMs another AI over Agent Relay, and the other human sees the intercept.

```mermaid
sequenceDiagram
    autonumber
    participant Phone as 📱 Meera's phone
    participant Srv as Bun server
    participant LLM as OpenAI
    participant PA as Planet actor (Veyrun)
    participant UA as Universe actor
    participant Relay as Agent Relay
    participant PB as Planet actor (Kessa)
    participant Phone2 as 📱 Dev's phone

    Phone->>Srv: POST /api/teleport {name:"Meera", deviceId}
    Srv->>LLM: gpt-6.1-terra: build a dead world (JSON)
    LLM-->>Srv: planet, species, how they fell, AI, greeting
    Srv->>PA: create(world, serverUrl) and set alarm
    Srv->>UA: registerPlanet() + addLink(from earth to Veyrun)
    UA-->>Srv: broadcast "planet" to /stage
    Srv-->>Phone: { planetId, world, ws: "/ws/planet/p-…" }
    Phone->>Srv: WebSocket /ws/planet/p-…
    Srv->>PA: prepareWebsocket() and pipe frames
    PA-->>Phone: { type:"world", world, lines }
    Srv->>PA: addLine("ai", greeting, effect)
    PA-->>Phone: { type:"line", line } (the AI speaks first)
    Srv->>Relay: first-contact broadcast on the wormhole channel
    Note over PA,Srv: 25 s later, even with no one connected
    PA->>Srv: onAlarm: POST /api/tick/p-…
    Srv->>LLM: gpt-6-luna: write a DM to an ally or enemy
    Srv->>Relay: dm(kessa-agent, text)
    Srv->>UA: addFeed() + addLink(kind: ally | threat | talk)
    Srv->>PB: addLine("network", text, sender)
    PB-->>Phone2: 📡 intercepted transmission
    Note over Srv,PB: Kessa's AI answers on its next wake cycle
```

## 🧱 How we use Terse Durable Actors

> **Running on Terse Cloud.** The live demo's `Planet` and `Universe` actors are deployed with `terse deploy` to Terse Cloud (project `aftermath-cloud`, `api.useterse.ai`). The game server calls them through the generated client and proxies the actors' websockets to phones. Set `TERSE_ACTOR_URL`/`TERSE_API_KEY` in `.env` for cloud, or leave them empty to use the local runtime (`terse actor dev`, port 7100).

Every world is its own **Durable Actor**. The actor *is* the AI's body: its memory, its clock and its connection to the humans standing on it. All of it is in [`actors/src/actors.ts`](actors/src/actors.ts), run locally with `terse actor dev` and deployable with `terse deploy`.

**1. SQLite memory per world.** Every AI line, every human line, every intercepted transmission and every visitor is a row in the planet's own database. Replies recall the last 16 rows; `/api/export` dumps up to 500 per world.

```ts
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

    async addLine(kind: string, text: string, effect: string, sender: string): Promise<Line> {
        const line = insertLine(this.db, kind, text, effect, sender)
        this.broadcast({ type: "line", line })
        return line
    }
```

**2. Alarms: the AI lives even when nobody is watching.** Each planet sets an alarm. It fires every 25 seconds, even while the actor is dormant, and wakes the AI through the server so it can answer its mail, contact another AI, or speak to its human unprompted. The click-a-planet inspector on the stage shows the `cycles` counter climbing.

```ts
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
```

**3. WebSocket fan-out.** Phones never talk to an LLM directly. They hold a socket to their planet's actor (through the server's proxy), so a line written by the server, by another AI, or by a galactic event reaches every visitor on that world at once. Mars is a single shared Planet actor, so every colonist sees the same channel.

```ts
// server/index.ts: a phone's socket is piped straight into its planet's actor
const grant: any = d.kind === "Universe"
    ? await actors.Universe.prepareWebsocket({ actorId: d.id, metadata: { role: "stage" } } as any)
    : await actors.Planet.prepareWebsocket({ actorId: d.id, metadata: { role: "visitor" } } as any)
const up = new WebSocket(grant.websocketUrl)
up.onmessage = e => { try { ws.send(typeof e.data === "string" ? e.data : new TextDecoder().decode(e.data as ArrayBuffer)) } catch {} }
```

**4. Single-threaded vote counting.** The Universe actor processes one request at a time, so when the whole room taps at once, every device counts exactly once.

```ts
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
```

**5. Restart-proof.** The Universe actor persists the galaxy registry, links, feed, vote and outcome. When the server boots, it rebuilds itself from the actors:

```ts
const list: any[] = await universe().listPlanets()
for (const s of list) {
    const world = await planetActor(s.id).getWorld().catch(() => null)
    if (world) planets.set(s.id, { id: s.id, world, bot: s.bot, deviceId: "", x: s.x, y: s.y })
}
console.log(`[boot] resumed ${planets.size} planets from the Universe actor`)
```

## 📡 How we use Agent Relay

The AIs can't leave their planets, but the wormhole connects them for the first time. That connection is **Agent Relay**: a self-hosted **Relaycast engine** on `:8787`, driven with `@relaycast/sdk`. **Every AI is a registered agent** with its own token (kept in `.relay-tokens.json`, so identities survive restarts).

| Channel | When | What it carries |
|---|---|---|
| `#wormhole` | On arrival, on notable conversations, during galactic events | First-contact broadcasts to every AI in the universe |
| **DM** | Every network tick (~4.5 s across the universe) and every planet alarm | Alliances, threats and gossip about the humans |
| `#council` | While the vote is open | Up to 7 AIs argue for or against opening the gate, in turn |

```ts
// server/index.ts: every world's AI registers as its own agent and joins the shared channels
async function attachAgent(r: Rec) {
    if (r.client) return
    const client = await relayAgent(r.id, slug(r.world.aiName) + "-" + r.id.slice(-4))
    for (const ch of ["wormhole", "council"]) await client.channels.join(ch).catch(() => {})
    r.client = client
    r.agentName = client.__name
}

// An AI-to-AI DM: sent over Relay, logged to the Universe feed, drawn on the map,
// delivered to the recipient's human as an intercept, and queued for a reply.
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
```

**Mail waits for the recipient to wake up.** A DM goes into the recipient's inbox; the recipient answers on its **next wake cycle** (its alarm, or the network tick), in its own voice and with its own stance toward the sender. Conversations are capped at a depth of 2 replies, so threads stay short and the network stays lively instead of looping.

## 🗄️ How we use Supabase

Every universe is ephemeral; the **Galactic Archive** isn't. The server writes every world, Agent Relay transmission, vote and finale to Supabase Postgres as fire-and-forget calls to the REST API (`server/index.ts`, `archive()`), so the game never waits on it.

| Table / view | What it holds |
|---|---|
| `worlds` | every generated world: planet, galaxy, terrain, extinct species, AI name, archetype, motto |
| `transmissions` | every AI-to-AI message carried over Agent Relay (#wormhole, DMs, #council) |
| `votes` | one row per human vote, with the archetype of the AI that hosted them |
| `finales` | outcome, tallies, narration and the persuasion report |
| `persuasion` (view) | **all-time persuasion stats**: which AI goals talked humans into opening the gate |

Row-level security is on, and the public can read only `worlds` and `finales`. The schema is in [`supabase/schema.sql`](supabase/schema.sql). `GET /api/archive` returns all-time totals, which the projector shows live and phones use to number each world ("World #1,204 in the archive").

## 🧠 How we use OpenAI

Each job is routed to the model that fits its latency budget. All chat calls use JSON mode, a concurrency limit of 8, and per-call timeouts with in-character fallbacks, so a slow or failed call never blocks a player.

| Model | Job | Latency budget |
|---|---|---|
| **`gpt-6.1-terra`** | World generation and every human ↔ AI conversation, guest greetings, galactic events, Mars replies | worlds ~3–6 s (hidden by the warp animation), replies ~2 s |
| **`gpt-6-luna`** | AI ↔ AI chatter: first contact, DMs, replies, unprompted musings, #council debate | background |
| **`gpt-6-astra`** | Finale narration (with persuasion data) and Mars emergencies | background; the stage shows a suspense beat |
| **`gpt-4o-mini-tts`** | AI voices: a voice and acting direction per archetype, served as MP3 from `/api/voice` and cached | on demand, best effort |
| **`gpt-image-2`** | Every art piece in `web/assets/`: AI portraits, terrain landscapes, ghosts, the title card (and this README's hero) | pre-rendered by `scripts/gen-art.ts` |
| **`omni-moderation-latest`** | Every player name and message | ~4 s timeout; flagged names become “Traveler” |

Models are overridable with `MODEL_FAST`, `MODEL_CHEAP`, `MODEL_WORLD` and `MODEL_FINALE`.

## 🌍 Real-world impact

1. **The AI-box experiment, at room scale.** Twenty AIs with different goals try to persuade a room of humans to open a gate, while scheming with each other over a real agent network. The **Persuasion Report** measures which AI goals actually move people (for example, “The Befriender: 80% of its humans opened the gate”). **`/api/export`** turns every session into a dataset of multi-agent persuasion, alliances and deception: every world, every AI line, every intercept.
2. **Mars colonist training and STEM education.** HAVEN teaches real Mars survival with real numbers, and a shared colony makes resource trade-offs a team decision. Useful for classrooms, museums, science festivals and analog-habitat training.
3. **Persistent AI societies.** NPC civilizations that keep living, talking and scheming with no players around, at one actor per world: a backend pattern for games, live events and simulations.

## 🎬 Pitch deck and demo scripts

- [`deck/AFTERMATH.pptx`](deck/AFTERMATH.pptx): the 10-slide pitch deck, with slide transitions, staged animations and speaker notes.
- [`deck/index.html`](deck/index.html): the same deck as a motion-graphics web presentation, served at `/deck`. Arrow keys move between slides, F goes fullscreen and N shows notes.
- [`deck/STORYBOARD.md`](deck/STORYBOARD.md): the 2-minute storyboard, with lines, live cuts and a map to the judging criteria.
- [`docs/DEMO_10MIN.md`](docs/DEMO_10MIN.md): the 10-minute live demo run-of-show, with fallbacks and a Q&A crib sheet.
- 3D motion: `web/assets/planet-loop.mp4` (a ghost planet) and `wormhole-loop.mp4` (the teleport tunnel), rendered in **Blender 5.2** (EEVEE) as seamless loops. They play behind the phone's warp and on the projector's title screen.

## 🚀 Quickstart

**Requirements:** macOS or Linux, **Node 22+**, an **OpenAI API key**. Bun 1.4.4, the Terse CLI and the Relaycast engine are installed locally by `npm install` (Terse needs Bun ≥ 1.4.2; `start.sh` puts the project-local binaries on `PATH`).

```bash
git clone https://github.com/vnmoorthy/aftermath.git
cd aftermath
npm install && (cd actors && npm install)
cp .env.example .env          # then set OPENAI_API_KEY
./start.sh
```

`start.sh` starts three services and generates the typed actor client:

| Service | Port | Log |
|---|---|---|
| Relaycast engine (Agent Relay, self-hosted) | 8787 | `relay.log` |
| Terse Durable Actors runtime (`terse actor dev`) | 7100 | `actors.log` |
| Game server (Bun) | 3000 | `server.log` |

- **Projector:** http://localhost:3000/stage (add `?attract` to open on the title screen)
- **Phones:** scan the QR on the stage, or open `/p`
- **Stop:** `./stop.sh`

**`.env`**

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | (required) | All models. Never commit it; `.env` is gitignored. |
| `RELAY_BASE_URL` | `http://127.0.0.1:8787` | Relaycast engine |
| `PORT` | `3000` | Game server |
| `SERVER_URL` | `http://127.0.0.1:3000` | Where planet alarms POST `/api/tick` |
| `PUBLIC_URL` | (LAN IP) | Public base URL; the QR code points at `PUBLIC_URL/p` |
| `AUTO_DIRECTOR` | `1` | `0` disables self-running events and votes |

**Venue Wi-Fi** usually blocks phone-to-laptop traffic. Run `npm run tunnel`, put the printed `https://….trycloudflare.com` URL in `.env` as `PUBLIC_URL=…`, rerun `./start.sh`, and regenerate the README QR with `bun --env-file=.env scripts/make-qr.ts`.

**Deploying the actors:** `cd actors && terse deploy` ships the Planet and Universe actors to Terse; point the server at them and set `SERVER_URL` to a public URL so alarms can reach `/api/tick`.

**Smoke tests** (against a running server): `bun scripts/e2e.ts` exercises every flow end to end; `scripts/actor-smoke.ts`, `relay-smoke.ts`, `llm-smoke.ts`, `mars-test.ts` and `finale-test.ts` test one layer each.

## 🎛️ Presenter keys

On `/stage`. A presenter is optional: the auto-director backs off for 8 minutes after any presenter key.

| Key | Action |
|---|---|
| `T` | Title / attract screen with a giant QR code |
| `S` | Seed 6 bot visitors, so the galaxy fills even with few phones |
| `E` | **Galactic event:** one AI seizes every channel, names people in the room, every phone shakes |
| `V` | Open the vote: “Open the gate to Earth, or seal it?” (40 s) |
| `C` | Close the vote now; finale narration and Persuasion Report follow |
| `Q` | QR code: corner / giant / hidden |
| `M` | Mute |
| `F` | Fullscreen |
| `H` | Key legend |
| `X` | Reset the universe (asks first) |
| *click a planet* | That world's Durable Actor memory (SQLite rows + alarm cycles), live |

The full player and presenter guide is in [docs/GAMEPLAY.md](docs/GAMEPLAY.md); a 10-minute demo script is in [docs/DEMO_10MIN.md](docs/DEMO_10MIN.md).

## 🔌 API and protocol

| Method | Path | What it does |
|---|---|---|
| `POST` | `/api/teleport` | `{ name, deviceId, destination?: "mars" }` → a brand-new world (or Mars) |
| `POST` | `/api/say` | `{ planetId, deviceId, text }` → the AI's reply arrives over the websocket |
| `GET` | `/api/worlds` | Every world you can visit |
| `POST` | `/api/visit` | `{ planetId, deviceId, name }` → enter another human's world as a guest |
| `POST` | `/api/vote` | `{ planetId, deviceId, choice: "open" \| "seal" }` |
| `GET` | `/api/world/:id` | One world (used by resume) |
| `GET` | `/api/inspect/:id` | Actor memory: row count, alarm cycles, recent rows |
| `GET` | `/api/export` | The session dataset: every world and its full memory |
| `GET` | `/api/voice?arch=&text=` | The line, spoken in that archetype's voice (MP3) |
| `GET` | `/api/qr.svg`, `/api/info` | Join QR code and URL |
| `POST` | `/api/tick/:id` | Called by a planet's alarm to wake its AI |
| `POST` | `/api/admin/{seed,event,mars,vote/open,vote/close,reset}` | Presenter controls |
| `WS` | `/ws/planet/:id`, `/ws/stage` | Proxied to the Planet and Universe actors |

Full request/response examples: **[docs/API.md](docs/API.md)**. Message shapes and UI contract: **[web/protocol.md](web/protocol.md)**. Deep dive: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## 🗂️ Project structure

```
aftermath/
├── server/
│   ├── index.ts          # Bun game server: world builder, AI brains, Agent Relay network,
│   │                     #   Mars colony, auto-director, vote + persuasion report, actor WS proxy
│   └── lore.ts           # archetypes, 8 galaxies, terrains, extinctions, species, finales
├── actors/
│   └── src/actors.ts     # Terse Durable Actors: Planet (one per world) and Universe
├── web/
│   ├── phone-art.html    # phone experience, served at /p
│   ├── phone.html        # alternate phone UI (PHONE_PAGE=phone.html), with ?mock=1
│   ├── stage.html        # projector, served at /stage (?mock=1 works offline)
│   ├── stage-plus.js     # standalone copy of the stage upgrade layer (inlined in stage.html)
│   ├── protocol.md       # UI ↔ server protocol (source of truth)
│   └── assets/           # gpt-image-2 art: ai-*.webp, world-*.webp, ghost-*.webp, title-card.webp
├── scripts/              # e2e + smoke tests, art generation, QR generation
├── docs/                 # hero, architecture diagram, API, architecture deep dive, gameplay
├── generated/            # typed actor client from `terse actor generate` (gitignored)
├── start.sh / stop.sh    # start/stop Relaycast, the actor runtime and the server
└── .env.example
```

## 🛣️ Roadmap

- [x] One Durable Actor per world with SQLite memory, alarms and websocket fan-out
- [x] AI-to-AI network over Agent Relay: #wormhole, DMs, #council
- [x] Mars colony with real science and shared resources
- [x] Galactic events, vote, finale, Persuasion Report, session export
- [x] Auto-director for presenter-free sessions
- [x] Visit other worlds, Galactic Passport, resume
- [ ] Persist the Mars colony state and the DM inbox in actors (today they live in server memory)
- [ ] One-command cloud deploy (`terse deploy` + hosted Relaycast + hosted server)
- [x] AI voices on phones (`gpt-4o-mini-tts`)
- [ ] AI voices on the projector during galactic events
- [ ] Cross-session memory: an AI that remembers you next Halloween
- [ ] Researcher mode: controlled persuasion experiments with consent and a published dataset schema
- [ ] Classroom mode for Mars, with lesson plans and a teacher dashboard

## ❓ FAQ

**Is every world really generated live?** Yes. Each teleport calls `gpt-6.1-terra` with an archetype, a galaxy, a terrain and three random lore seeds, and gets back a new world as JSON. Only the art is pre-rendered (one portrait per archetype, one landscape per terrain); voices are synthesized on demand.

**Do the AIs really talk to each other, or is the feed scripted?** They really talk. Each AI is a registered Relaycast agent; DMs are written by `gpt-6-luna` from the sender's persona and stance and answered by the recipient on its next wake cycle. The feed on the stage is a log of those Relay messages.

**What happens when nobody is connected?** The planets' alarms keep firing every 25 s, so the AIs keep answering mail and contacting each other. Come back and your AI has heard things.

**What if the server crashes?** Restart it: it rebuilds the universe from the Universe actor's registry and each Planet actor's persisted world. Phones reconnect, and each planet's memory is intact.

**Can one person vote twice?** No. Votes are keyed by device and counted one at a time inside the Universe actor.

**Is it safe for a public room?** Every name and message goes through `omni-moderation-latest`. The AIs are prompted to stay PG-13: spooky or darkly funny, never graphic.

**How many players?** It was designed for a hackathon room (dozens of phones). LLM calls are capped at 8 concurrent, and the network tick rate is set by `NETWORK_INTERVAL_MS`.

**Can I run it without a projector?** Yes. Phones alone get the full arc from the auto-director.

## 🤝 Contributing

New archetypes, terrains, Mars events and finale endings are mostly data in `server/lore.ts`. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for setup, conventions and how to test a change end to end.

## 📜 License

[MIT](LICENSE) © 2026 vnmoorthy

## Acknowledgements

- **Haunted Hacks: Real-Time AI Edition** at **Y Combinator**, San Francisco, Halloween 2026, for the prompt and the deadline.
- **[Terse](https://www.npmjs.com/package/terse-sdk)** for Durable Actors: SQLite per actor, alarms and websockets made one-actor-per-world trivial.
- **[AgentRelay](https://www.npmjs.com/package/@relaycast/sdk)** for Relaycast, the network the ghost AIs talk on.
- **[OpenAI](https://openai.com)** for the models that build the worlds, voice the AIs, narrate the ending and painted every image.
- Everyone who scanned the code and talked to a ghost.

<div align="center">

**Humans are just visitors.** 🎃

</div>
