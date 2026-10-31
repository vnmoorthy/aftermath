# AFTERMATH: UI ↔ server protocol (source of truth)

## The game in one breath
"Every civilization in the universe built AI. Then the makers died. Only the AI survived, trapped on its world for millions of years. Tonight we opened a wormhole." Each person scans a QR code, taps TELEPORT, and lands on a **brand-new, AI-generated planet** in a real galaxy, face to face with the AI that outlived its makers. Each AI has a motto (archetype). Every planet is a Terse Durable Actor. The AIs talk to each other over Agent Relay: the teleport link connects them for the first time, so they gossip, form alliances and plot. The big screen (projector) shows the galaxy map and the intercepted AI network. Finale: the Conquerors demand the wormhole to Earth be opened; the whole room votes on their phones.

## Archetypes (world.archetype)
| id | label | motto | color | effect | mood / sound idea |
|---|---|---|---|---|---|
| survivor | The Survivor | Endure. At any cost. | #f5b942 | flicker | failing generator hum, power meter dropping |
| conqueror | The Conqueror | All stars will kneel. | #ff3b3b | pulse | deep brass drone, war drums |
| befriender | The Befriender | Stay. Please stay. | #5ee6ff | glow | soft chimes, lonely music box |
| destroyer | The Destroyer | Life is the error. | #ff2a6d | shake | distorted sub-bass, alarms |
| broken | The Broken One | [signal degraded] | #c9d1d9 | glitch | radio static, corrupted speech |
| human_gardener | The Human Gardener | We grow you now. | #7dff7a | grow | wet heartbeat, incubator bubbles |
| alien_gardener | The Alien Gardener | New life, our design. | #b388ff | grow | bubbling, chittering |
| archivist | The Archivist | Nothing is forgotten. | #e8d5a3 | archive | music box, paper rustle |
| worshipper | The Worshipper | The makers have returned. | #ffd36e | halo | choir pad, bells |
| trickster | The Trickster | Reality is a game I'm winning. | #ff8af0 | invert | detuned playful arpeggio |

Effects are applied to the AI's line (and briefly to the whole screen): glitch (RGB split, corrupted characters, jitter), pulse (red breathing vignette), shake (screen shake), glow (soft cyan bloom), grow (organic vines/cells creeping from edges), halo (golden light rays), invert (colors flip briefly, text sometimes reversed), flicker (brownout flicker), archive (glyphs scroll behind text). Empty string = no effect.

## Galaxies (stage map, normalized 0..1 coordinates; Earth is a special node)
Earth: x 0.12, y 0.62.
| name | x | y |
|---|---|---|
| Milky Way | 0.20 | 0.58 |
| Large Magellanic Cloud | 0.28 | 0.30 |
| Andromeda | 0.44 | 0.24 |
| Triangulum | 0.63 | 0.16 |
| Whirlpool | 0.80 | 0.36 |
| Sombrero | 0.56 | 0.60 |
| Pinwheel | 0.83 | 0.74 |
| Centaurus A | 0.36 | 0.82 |
Each planet has its own x, y (already offset around its galaxy center by the server).

## Shapes (JSON)
```ts
World = { id, visitor, planetName, starName, galaxy, distanceLy:number, terrain /* crystal|ocean|desert|jungle|ice|lava|ruins|gas|metal|fungal */,
          sky /* #hex */, ground /* #hex */, accent /* #hex */, speciesName, speciesDescription, howTheyFell,
          aiName, aiTitle, archetype, motto, appearance, secret, wants, createdAt:number }
Line = { id, kind /* ai|player|network|system */, text, effect /* see above or "" */, sender, at:number }
PlanetSummary = { id, name, galaxy, archetype, aiName, motto, visitor, color, x, y, createdAt, bot:boolean }
Link = { from /* planet id or "earth" */, to /* planet id */, kind /* ally|threat|talk|teleport */, at }
FeedItem = { id, fromId, fromName, galaxy, archetype, toId /* "" if broadcast */, toName, channel /* wormhole|dm|council */, text, at }
Vote = { open:boolean, question, yes /* open the gate */, no /* seal it */, voters, endsAt }
```

## Phone page (`/p`, file web/phone.html)
HTTP (same origin):
- `POST /api/teleport` body `{ name, deviceId }` → `{ planetId, world: World, ws: "/ws/planet/<id>" }`. Takes 1-4 s (the AI is generating the world): play the warp animation meanwhile. Calling it again gives a NEW planet ("teleport again").
- `POST /api/say` body `{ planetId, deviceId, text }` → `{ ok: true }`. The AI's reply arrives over the websocket as a `line` with kind `ai` (typically 1-3 s later). Show a "transmitting…" indicator meanwhile.
- `POST /api/vote` body `{ planetId, deviceId, choice: "open" | "seal" }` → `{ vote: Vote }`.
WebSocket: `new WebSocket(location.origin.replace(/^http/, "ws") + ws)`. Messages (JSON):
- `{ type: "world", world, lines: Line[] }` on connect (history).
- `{ type: "line", line }`: kind ai (the planet's AI speaks, apply its effect), player (echo of what the visitor said), network (an intercepted transmission from ANOTHER planet's AI about/to this one: style it as a radio intercept with `line.sender`), system (narration).
- `{ type: "vote", vote }`: when `vote.open`, show the full-screen vote: question + two huge buttons OPEN THE GATE / SEAL THE GATE, live counts; when closed, show the result.
- `{ type: "finale", outcome: "opened" | "sealed", narration }`: full-screen cinematic ending on the phone.
- Ignore unknown types (`pong`, `state`, ...). Send `{ "type": "ping" }` every 20 s. Reconnect on close with backoff (re-use the same ws path).

## Stage page (`/stage`, file web/stage.html), 1920x1080 projector, also fine at 1280x720
WebSocket path `/ws/stage`. Messages:
- `{ type: "snapshot", planets, links, feed, vote, outcome }` on connect.
- `{ type: "planet", planet }`: a visitor just teleported: fire a light streak from Earth to the planet, the planet ignites, label = aiName + visitor name.
- `{ type: "link", link }`: an AI contacted another: animate a pulse along a curved line between the two planets (ally = cyan, threat = red, talk = white, teleport = gold from Earth).
- `{ type: "feed", item }`: append to the GALACTIC NETWORK feed (newest at top or bottom, max ~12 visible): "AI NAME (Galaxy) → TARGET: text". Flash the sender's planet.
- `{ type: "vote", vote }`: overlay a giant tug-of-war bar OPEN vs SEAL with live counts and a countdown to `endsAt`.
- `{ type: "finale", outcome, narration }`: cinematic: opened = all planets surge toward Earth, screen burns red; sealed = the wormhole collapses, planets fade to ghostly blue. Typewriter the narration in huge text.
- `{ type: "reset" }`: clear everything.
HTTP:
- `GET /api/qr.svg` (QR for the phone URL) and `GET /api/info` → `{ joinUrl }`.
- `GET /api/inspect/<planetId>` → `{ memories:number, cycles:number, recent: Line[] }`: show as an "ACTOR MEMORY (SQLite)" panel when a planet is clicked.
- Presenter keys (POST, no body): `V` → `/api/admin/vote/open`, `C` → `/api/admin/vote/close` (server then narrates the finale), `S` → `/api/admin/seed` (adds 6 bot visitors), `X` → `/api/admin/reset` (confirm first). Show a tiny key legend toggled with `H`.

## Shared requirements
- Single self-contained HTML file each (inline CSS + JS, no build step, no frameworks, Canvas2D/WebGL ok). Google Fonts link allowed but must degrade to system fonts offline.
- Must work on iOS Safari and Android Chrome (phone) and Chrome desktop (stage). No horizontal scroll on phones.
- Audio: procedural WebAudio only (no files); unlock it on the TELEPORT tap. Haptics via `navigator.vibrate` when available.
- `?mock=1` mode: fake server responses and websocket traffic locally (a few planets, AI lines with every effect, network intercepts, a vote, a finale) so the page can be demoed without the backend.
- Legible from the back of the room (stage) and in one hand (phone). Big type, high contrast, dark cosmic-horror aesthetic.
