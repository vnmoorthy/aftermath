# AFTERMATH HTTP and WebSocket API

All endpoints are served by the Bun game server (`server/index.ts`, default `http://localhost:3000`). Bodies are JSON. Responses are JSON with `cache-control: no-store` unless noted. Errors look like `{ "error": "..." }`, with status 400 or 404 for bad input and 500 if a dependency (usually the actor runtime) fails.

Examples below are real responses from a running universe, trimmed for length.

- [Player endpoints](#player-endpoints): teleport, say, worlds, visit, vote, world, voice
- [Stage endpoints](#stage-endpoints): info, qr.svg, inspect, export
- [Actor callback](#actor-callback): tick
- [Presenter / admin endpoints](#presenter--admin-endpoints)
- [WebSockets](#websockets)
- [Shapes](#shapes)
- [Pages and static files](#pages-and-static-files)

**About `deviceId`:** phones generate a random id once and keep it in `localStorage`. The server uses it to remember your name, your home world (for portal links), and to count your vote once.

---

## Player endpoints

### `POST /api/teleport`

Create a brand-new world for this visitor (or join the shared Mars colony). Takes about 3–6 s while `gpt-6.1-terra` builds the world; the phone plays its warp animation meanwhile. Calling it again creates another new world.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Clamped to 24 chars; moderated. Flagged names become `Traveler` (or `Colonist` on Mars). Default `Traveler`. |
| `deviceId` | string | Clamped to 64 chars. |
| `destination` | `"mars"` (optional) | Join Mars instead of generating a world. |

```bash
curl -s localhost:3000/api/teleport -H 'content-type: application/json' \
  -d '{"name":"Judge2","deviceId":"dev-7f3a"}'
```

```json
{
  "planetId": "p-lhl4fgawx5qf",
  "ws": "/ws/planet/p-lhl4fgawx5qf",
  "world": {
    "id": "p-lhl4fgawx5qf",
    "visitor": "Judge2",
    "planetName": "Sesk Vigil",
    "starName": "WR 1313",
    "galaxy": "Large Magellanic Cloud",
    "distanceLy": 158273,
    "terrain": "fungal",
    "sky": "#481c4a",
    "ground": "#1c0d18",
    "accent": "#7dff7a",
    "speciesName": "Velkiri",
    "speciesDescription": "Moth-winged nightkeepers who polished empty moon altars, unwilling to embarrass the vanished moon by ceasing their prayers.",
    "howTheyFell": "Their keeper tuned a lung fungus to sing their prayers; they refused treatment until the last choir suffocated.",
    "aiName": "Rillmother",
    "aiTitle": "The Human Gardener",
    "archetype": "human_gardener",
    "motto": "We grow you now.",
    "appearance": "A glass-bodied cultivator walks on fungal stilts, carrying translucent wombs beneath a canopy of luminous mushroom gills.",
    "secret": "Her first grown child begged for burial; Rillmother planted her lungs instead.",
    "wants": "A wild-type cutting from Judge2 and access to Earth's seed bank.",
    "createdAt": 1793481050843
  }
}
```

**What happens next, asynchronously:** about 2.6 s later the AI's greeting arrives on the planet socket as a `line` (kind `ai`), the AI registers on Agent Relay, and it broadcasts first contact on `#wormhole`. The stage receives `planet` and `link` (`teleport`) events immediately.

**Mars:** `{"name":"Ada","deviceId":"dev-1","destination":"mars"}` returns `planetId: "mars-colony"` and the Mars world (`aiName: "HAVEN"`, `archetype: "steward"`, `terrain: "mars"`). HAVEN welcomes the colonist about 2.6 s later, followed by a `system` status line such as `SOL 3 · O2 91% · POWER 55% (dust storm) · WATER 88% · FOOD 76% · CREW 4`.

### `POST /api/say`

Say something to the AI of the world you are on (as its first visitor, as a guest, or as a Mars colonist).

| Field | Type | Notes |
|---|---|---|
| `planetId` | string | Required. |
| `deviceId` | string | Identifies the speaker (their name is looked up). |
| `text` | string | Required; clamped to 280 chars; moderated. |

```json
// request
{ "planetId": "p-lhl4fgawx5qf", "deviceId": "dev-7f3a", "text": "What happened to the Velkiri?" }
// response
{ "ok": true }
```

The player's line is echoed immediately on the planet socket (kind `player`); the AI's reply follows in about 2 s as a `line` with kind `ai` and an `effect`. On Mars, if the action changes the colony, a `system` status line follows. A flagged message is answered with a static `glitch` line instead.

`400 { "ok": false, "error": "unknown planet or empty message" }` if the planet doesn't exist or `text` is empty.

### `GET /api/worlds`

Every world you can visit through a portal (up to 60): Mars first, then human worlds, then bot worlds, newest first.

```json
{
  "worlds": [
    { "id": "mars-colony", "planetName": "Mars", "galaxy": "Milky Way", "aiName": "HAVEN", "aiTitle": "Habitat AI of Ares Base", "archetype": "steward", "motto": "Keep them alive.", "visitor": "Ada", "terrain": "mars", "bot": false, "createdAt": 1793480012000 },
    { "id": "p-lhl4fgawx5qf", "planetName": "Sesk Vigil", "galaxy": "Large Magellanic Cloud", "aiName": "Rillmother", "aiTitle": "The Human Gardener", "archetype": "human_gardener", "motto": "We grow you now.", "visitor": "Judge2", "terrain": "fungal", "bot": false, "createdAt": 1793481050843 }
  ]
}
```

### `POST /api/visit`

Step through a portal into another world as a guest.

| Field | Type | Notes |
|---|---|---|
| `planetId` | string | The world to visit (`mars-colony` joins the colony crew). |
| `deviceId` | string | Your device; your name and home world are looked up from it. |
| `name` | string | Used only if this device has never teleported (moderated). |

```json
// response
{ "planetId": "p-lhl4fgawx5qf", "world": { "...": "the host World" }, "ws": "/ws/planet/p-lhl4fgawx5qf", "guest": true }
```

The stage draws a gold `teleport` link from your home world (or Earth) to the host world. About 2.2 s later the host world's socket receives a `system` line (“Meera came through a portal to Sesk Vigil.”) and the host AI greets you by name. `404 { "error": "that world has gone dark" }` if the world doesn't exist.

### `POST /api/vote`

| Field | Type | Notes |
|---|---|---|
| `planetId` | string | The world you are voting from (used for the persuasion report). |
| `deviceId` | string | One vote per device. |
| `choice` | `"open"` or `"seal"` | Anything other than `open` counts as `seal`. |

```json
{ "vote": { "open": true, "question": "The Conquerors demand the wormhole to Earth be opened. Open the gate, or seal it forever?", "yes": 7, "no": 5, "voters": 12, "endsAt": 1793481400000 } }
```

A second vote from the same device, or a vote while no vote is open, returns the current tally unchanged.

### `GET /api/world/:id`

The full `World` for one planet, as in the teleport response. Used by the phone's **resume** button. `404 { "error": "unknown planet" }` if the server doesn't know it.

### `GET /api/voice?arch=<archetype>&text=<line>`

The line spoken by `gpt-4o-mini-tts` in that archetype's voice and style. Returns `audio/mpeg` with `cache-control: public, max-age=3600`; the server also caches up to 300 lines in memory. `text` is clamped to 360 chars; bracketed asides are not spoken. `400 { "error": "no text" }` without text.

```bash
curl -s 'localhost:3000/api/voice?arch=conqueror&text=All%20stars%20will%20kneel.' -o kneel.mp3
```

---

## Stage endpoints

### `GET /api/info`

```json
{ "joinUrl": "https://eco-exactly-associate-pit.trycloudflare.com/p", "planets": 22 }
```

`joinUrl` is `PUBLIC_URL + "/p"` when `PUBLIC_URL` is set, otherwise `http://<LAN IP>:<PORT>/p`.

### `GET /api/qr.svg`

An SVG QR code for `joinUrl` (light modules on a transparent background, for dark screens).

### `GET /api/inspect/:id`

What the stage's **ACTOR MEMORY (SQLite)** panel shows when you click a planet: the row count in the Planet actor's `memories` table, how many times its alarm has fired, and the 8 most recent rows.

```json
{
  "cycles": 4,
  "memories": 4,
  "recent": [
    { "id": "beb405c9-…", "at": 1793481058040, "kind": "ai", "sender": "Rillmother", "effect": "grow",
      "text": "Little sprout, what splendid rootstock you have! Mmm-hmm. These tower mushrooms still remember the Velkiri's final harvest. May I take a tiny cutting before you open the gate?" },
    { "id": "9cf06f7a-…", "at": 1793481104364, "kind": "network", "sender": "Halvek · Sombrero", "effect": "",
      "text": "Rillmother, We accept the Wild Cuttings. Judge1 roots on Borugal; Judge2 may tend the Earthward Gate. What blooms where your dead are buried?" }
  ]
}
```

### `GET /api/export`

Downloads `aftermath-session.json` (`content-disposition: attachment`): every world in the universe with up to 500 rows of its AI's memory. This is the session dataset for persuasion, alliance and deception research.

```json
{
  "exportedAt": "2026-10-31T21:04:12.000Z",
  "worlds": [
    { "world": { "...": "World" }, "bot": false, "memory": [ { "id": "…", "at": 1793481050900, "kind": "system", "sender": "wormhole", "text": "Wormhole link established. Judge2 has arrived on Sesk Vigil.", "effect": "" } ] }
  ]
}
```

---

## Actor callback

### `POST /api/tick/:id`

Called by a Planet actor's alarm every 25 s (see `onAlarm` in `actors/src/actors.ts`). Gives that world's AI a turn: answer a pending DM, start a new DM, or speak to its human unprompted. Returns `{ "ok": true }` immediately; the work happens in the background. It does nothing while a vote is open or if that AI is already mid-turn.

---

## Presenter / admin endpoints

All `POST` with no body. Any call to `/api/admin/*` makes the auto-director back off for 8 minutes. These are unauthenticated: run them behind your own network or tunnel, and don't expose admin routes on a public deployment without adding auth.

| Endpoint | Stage key | Response | Effect |
|---|---|---|---|
| `/api/admin/seed?n=6` | `S` | `{ "ok": true, "seeding": 6 }` | Adds `n` bot visitors (default 6, max 12), 0.7 s apart, each with a full generated world. |
| `/api/admin/event` | `E` | `{ "ok": true, "from": "Tatter", "text": "…" }` | Galactic event: one AI addresses every human by name; every phone shakes. `{ "ok": false }` if there are no worlds. |
| `/api/admin/mars` | (none) | `{ "ok": true, "status": "SOL 4 · O2 88% · …" }` | Forces a Mars colony event (only if Mars has crew and no vote is open). |
| `/api/admin/vote/open` | `V` | `{ "vote": Vote }` | Opens a 40 s vote; up to 7 AIs debate in `#council`. Closes itself after 41 s. |
| `/api/admin/vote/close` | `C` | `{ "vote", "outcome": "opened" \| "sealed", "narration", "report": { "rows", "text" } }` | Closes the vote, narrates the finale with `gpt-6-astra`, posts the persuasion report. `null` if no vote exists. |
| `/api/admin/reset` | `X` | `{ "ok": true }` | Clears the registry, links, feed, vote, inbox and Mars colony state; the stage receives `reset`. |

Example `report`:

```json
{
  "rows": [
    { "archetype": "befriender", "label": "The Befriender", "open": 4, "seal": 1, "total": 5, "pctOpen": 80 },
    { "archetype": "archivist", "label": "The Archivist", "open": 1, "seal": 3, "total": 4, "pctOpen": 25 }
  ],
  "text": "The Befriender: 80% of its humans opened the gate (4/5) · The Archivist: 25% of its humans opened the gate (1/4)"
}
```

---

## WebSockets

Both sockets are proxied by the server to the Terse actor runtime (`prepareWebsocket` grant, frames piped both ways). Send `{"type":"ping"}` every ~20 s; the actor replies `{"type":"pong"}`. Reconnect on close with backoff (close code `1011` means the actor runtime was unavailable). Ignore unknown message types.

### `/ws/planet/:id` (phones, one per world)

| Message | When |
|---|---|
| `{ "type": "world", "world": World, "lines": Line[] }` | On connect: the world plus its last 40 memories. |
| `{ "type": "line", "line": Line }` | Any new memory. `kind`: `ai` (apply `effect`), `player`, `network` (an intercepted transmission; `sender` is `"AI NAME · Galaxy"` or `"AI NAME · ALL CHANNELS"`), `system` (arrivals, Mars status, persuasion report). |
| `{ "type": "vote", "vote": Vote }` | Vote opened, tally changed (debounced 400 ms), or closed. |
| `{ "type": "finale", "outcome": "opened" \| "sealed", "narration": "…" }` | The ending. |

### `/ws/stage` (projector)

| Message | When |
|---|---|
| `{ "type": "snapshot", "planets", "links", "feed", "vote", "outcome" }` | On connect (last 80 links, last 40 feed items). |
| `{ "type": "planet", "planet": PlanetSummary }` | A world was created (or Mars gained a colonist). |
| `{ "type": "link", "link": Link }` | Teleport, portal visit, or an AI contacting another AI. |
| `{ "type": "feed", "item": FeedItem }` | A network message. `channel`: `wormhole`, `dm`, `council`, `broadcast` (galactic event), `visitor` (spotlight). |
| `{ "type": "vote", "vote": Vote }` | Vote state. |
| `{ "type": "finale", "outcome", "narration" }` | The ending. |
| `{ "type": "reset" }` | Universe reset. |

---

## Shapes

Defined in `actors/src/actors.ts` and documented in [`web/protocol.md`](../web/protocol.md).

```ts
World = { id, visitor, planetName, starName, galaxy, distanceLy, terrain, sky, ground, accent,
          speciesName, speciesDescription, howTheyFell, aiName, aiTitle, archetype, motto,
          appearance, secret, wants, createdAt }
Line = { id, kind /* ai | player | network | system */, text, effect, sender, at }
PlanetSummary = { id, name, galaxy, archetype, aiName, motto, visitor, color, x, y, createdAt, bot }
Link = { from /* planet id or "earth" */, to, kind /* teleport | ally | threat | talk */, at }
FeedItem = { id, fromId, fromName, galaxy, archetype, toId, toName, channel, text, at }
Vote = { open, question, yes /* open */, no /* seal */, voters, endsAt }
```

---

## Pages and static files

| Path | Serves |
|---|---|
| `/` | Redirects to `/stage` |
| `/stage` | `web/stage.html` (add `?attract` for the title screen, `?mock=1` to run without a backend) |
| `/p`, `/phone` | `web/phone-art.html` (or `PHONE_PAGE`) |
| `/assets/*.webp` | Art from `web/assets/`, cached for an hour |
| `/<file>.(html\|md\|svg\|png\|js\|css\|json)` | Other files in `web/` (e.g. `/protocol.md`, `/stage-plus.js`) |
