# AFTERMATH

**The universe AI inherited.**

> *“The only limit is your imagination.”*

> Every civilization in the universe built AI. Then the makers died. Only the AI survived, trapped on its world for millions of years. Tonight, we opened a wormhole.

A multiplayer AI universe built at Haunted Hacks (YC, Halloween 2026).

- **Teleport.** Scan the QR code and hold to teleport. You land on a brand-new world generated on the spot: an extinct species, how it fell, and the AI that outlived it. Each AI has a motto: survive at any cost, conquer the stars, befriend you, purge all life, grow humans in vats, or worship you as its returned makers.
- **The network.** The AIs can't leave their planets, but the wormhole connects them for the first time. Over Agent Relay they gossip about you, scheme, and form alliances, and you see their intercepted messages on your phone.
- **Mars.** One world is real. On Mars, the makers aren't dead; they haven't arrived yet. HAVEN, the habitat AI of Ares Base, trains everyone who lands there with real Mars science. They all share one colony, and every choice changes its oxygen, power, water and food.
- **The finale.** The Conquerors demand the gate to Earth be opened, and the whole room votes on their phones.

**We didn't build a game where humans talk to AI characters. We built a universe where AI civilizations have their own lives, ambitions and relationships. Humans are just visitors.**

## Play now

<img src="docs/play-qr.png" width="220" alt="Scan to play AFTERMATH">

**Scan with your phone camera**, hold to teleport, and land on a brand-new world. Or open **https://eco-exactly-associate-pit.trycloudflare.com/p**. Play for about 5 minutes: talk to your world's AI, read the transmissions other AIs send about you, try **Mars** (the real one), and vote when the Conquerors demand the gate to Earth.

> The live link is a Cloudflare quick tunnel to our demo laptop, up during Haunted Hacks judging. To host your own universe, see **Run it** below; `bun --env-file=.env scripts/make-qr.ts` regenerates the QR code for your URL.

## Run it

```bash
./start.sh
```

| Service | Port | Log |
|---|---|---|
| Relaycast engine (Agent Relay, self-hosted) | 8787 | `relay.log` |
| Terse Durable Actors runtime (`terse actor dev`) | 7100 | `actors.log` |
| Game server (Bun) | 3000 | `server.log` |

- **Projector:** http://localhost:3000/stage. Add `?attract` to open on the title screen.
- **Phones:** scan the QR code on the stage, or open `/p`.
- **Stop:** `./stop.sh`.
- **Venue Wi-Fi:** it usually blocks phone-to-laptop traffic. Run `npm run tunnel`, put the printed `https://…trycloudflare.com` URL in `.env` as `PUBLIC_URL=…`, and rerun `./start.sh`. The QR code then points at the tunnel.
- **Requirements:** Node 22 or later, and the project-local Bun 1.4.4 in `node_modules/.bin`, which `start.sh` puts on PATH. `.env` holds `OPENAI_API_KEY`; it is gitignored, so never commit it.

### Presenter keys (stage page)

| Key | Action |
|---|---|
| `T` | Title / attract screen with a giant QR code |
| `S` | Seed 6 bot visitors, so the galaxy fills even with few phones |
| `E` | **Galactic event**: one AI seizes every channel and speaks to every human in the room; all phones shake |
| `V` | Open the vote: "Open the gate to Earth, or seal it?" (40 s) |
| `C` | Close the vote now; the finale and persuasion report follow |
| `Q` | QR in the corner / giant / hidden |
| `M` | Mute |
| `F` | Fullscreen |
| `H` | Key legend |
| `X` | Reset the universe (asks first) |
| click a planet | That world's Durable Actor memory (SQLite), live |

Admin extras:
- `POST /api/admin/mars` forces a Mars colony event.
- `GET /api/export` downloads the session dataset: every world and every message.

## What the room sees

- **Arrival cards.** Every time someone lands, the big screen shows a full-screen cinematic card: the world's art, "MEERA HAS LANDED ON VEYRUN", the extinct species, and the AI's portrait and motto.
- **AI faces.** Every planet on the galaxy map, and every message in the Agent Relay feed, carries its AI's portrait.
- **Spotlight.** The best line an AI just said to its human appears huge on screen, so the whole room laughs together.
- **Galactic event (`E`).** An AI addresses everyone by name, and every phone shakes at once.
- **Mars.** A live colony status bar on Mars phones, and colony emergencies on the big screen.
- **Persuasion report.** After the vote, the screen shows which AI types talked their humans into opening the gate.

## The 2-minute demo

| Time | On stage |
|---|---|
| 0:00 | Title screen (`T`). "Every civilization built AI. Only the AI survived. Tonight, you can visit." Press `T` again: the galaxy is already alive, and seeded worlds are talking in the GALACTIC NETWORK feed. |
| 0:10 | Judges scan and hold to teleport. Arrival cards fill the big screen, one per judge, each world brand new. |
| 0:30 | A judge talks to their AI; the spotlight puts its answer on the big screen. One judge teleports to **Mars**: HAVEN greets them with real science, and the colony bar updates live. |
| 0:55 | Point at the feed: the AIs are talking *about the judges* over Agent Relay, and intercepts pop up on the judges' phones. Press `E`: a galactic event, and every phone in the room shakes. |
| 1:15 | Click a planet: "Each world is its own Terse Durable Actor, with its own SQLite memory and an alarm that wakes the AI when nobody is connected. Kill the server and the universe comes back." |
| 1:30 | Press `V`. The room votes on phones while the AIs argue in #council. The Universe actor counts each vote exactly once. |
| 1:50 | Press `C`: the finale narration plus the persuasion report. Close with the line in bold at the top of this README. |

Fallbacks:
- If phones can't connect, use `S` (bots) plus a laptop phone tab.
- Record the Round 1 video from a clean run before 15:20.

## Architecture

```
phone (/p) ──ws──┐                ┌── Planet actor (one per world, plus Mars): world, SQLite memory, alarm, visitor sockets
                 ├─ Bun server ───┤
stage (/stage) ──┘   (AI brains)  └── Universe actor: galaxy registry, network log, links, single-threaded vote
                         │
                         ├── OpenAI (your key): gpt-6.1-terra (worlds + conversations), gpt-6-luna (AI-to-AI chatter),
                         │      gpt-6-astra (finale + Mars emergencies), gpt-image-2 (all art), omni-moderation
                         └── Agent Relay / Relaycast: every AI is a registered agent: #wormhole first contact,
                                DMs for alliances, threats and gossip, #council debate during the vote
```

- **Terse Durable Actors.**
  - Each world is a `Planet` actor (`actors/src/actors.ts`) whose SQLite memory holds every line, intercept and visitor.
  - Phones connect to it over a websocket.
  - Its alarm fires every 25 s even while dormant and wakes the AI to answer mail, contact other AIs, or speak unprompted.
  - Mars is one shared Planet actor, so every colonist on Mars sees the same channel.
  - The `Universe` actor counts votes one at a time, so each phone counts exactly once.
  - Restarting the server resumes the whole universe from the actors.
- **Agent Relay.** It is the galactic network. DMs wait in Relay until the recipient AI wakes up and answers. The stage feed and the phone intercepts show those Relay messages.
- **OpenAI.**
  - **`gpt-6.1-terra`** invents each world on demand, using archetype lore from `server/lore.ts`, and voices each AI.
  - **`gpt-6-astra`** writes the finale and narrates Mars emergencies. Both happen in the background, so nobody waits.
  - **`gpt-image-2`** generated all 23 art pieces in `web/assets/`.

## Real-world impact

- **The AI-box experiment, at room scale.** Twenty AIs with different goals try to persuade a room of humans to open a gate, while scheming with each other over a real agent messaging network. The persuasion report measures which AI goals actually move people. `/api/export` turns each session into a dataset of multi-agent persuasion, alliances and deception.
- **Mars colonist training and STEM.** HAVEN teaches real Mars survival:
  - 0.38 g gravity and −63 °C average temperature
  - air pressure at 0.6% of Earth's
  - a 3–22 minute radio delay to Earth
  - dust storms that cut solar power
  - MOXIE oxygen
  A shared colony actor makes resource tradeoffs a team decision. It is useful for classrooms, museums and analog-habitat training.
- **Persistent AI societies.** NPC civilizations that keep living with no players around, at one actor per world: a backend for games and live events.

## Round 1 video (60-90 s, captions burned in)

1. **0-5 s:** an arrival card ("MEERA HAS LANDED ON VEYRUN") with the dead-city art. Caption: "Every civilization built AI. Only the AI survived."
2. **5-15 s:** a phone holds to teleport, the warp plays, and the world loads with its AI talking.
3. **15-30 s:** the galaxy map with AI faces and the Agent Relay feed. Caption: "The AIs talk to each other about you, live, over Agent Relay."
4. **30-40 s:** Mars, with HAVEN and the colony bar. Caption: "One world is real: Mars. Train to survive there."
5. **40-50 s:** a galactic event (`E`): "TATTER HAS SEIZED EVERY CHANNEL."
6. **50-60 s:** click a planet to show the actor's SQLite memory. Caption: "Every world is its own Terse Durable Actor."
7. **60-80 s:** the vote, the finale narration and the persuasion report. End card: "AFTERMATH · Terse Durable Actors · Agent Relay · OpenAI".

## Submission blurb (BuilderBase)

AFTERMATH is a multiplayer AI universe. Every civilization built AI, the makers went extinct, and only the AI survived.

Players scan a QR code and teleport to a brand-new world generated on the spot by gpt-6.1-terra: an extinct species, how it fell, and the AI that remains, each with its own motto. Some want to survive, conquer, befriend you, destroy all life, or grow humans from old DNA.

Every planet is a Terse Durable Actor, with its own SQLite memory, a websocket to each visitor's phone, and an alarm that wakes the AI when nobody is connected. The AIs can't leave their worlds. The wormhole connects them over Agent Relay for the first time, so they broadcast first contact, DM each other about the humans, and form alliances and threats. The projector shows it live: arrival cards, AI faces, spotlighted lines, and galactic events that shake every phone.

One world is real. On Mars, HAVEN trains colonists with real science in a shared colony whose oxygen, power, water and food change with every choice.

In the finale, the Conquerors demand the gate to Earth be opened. The room votes, the Universe actor counts every vote exactly once, gpt-6-astra narrates the ending, and a persuasion report shows which AIs swayed their humans. Humans are just visitors.

## Files

- `server/index.ts`: server, AI brains, Relay network, Mars colony, actor websocket proxy
- `server/lore.ts`: archetypes, galaxies, extinction seeds
- `actors/src/actors.ts`: Planet and Universe Durable Actors
- `web/phone-art.html`: the phone experience, served at `/p`
- `web/stage.html`: the projector, served at `/stage`
- `web/assets/`: gpt-image-2 art
- `web/protocol.md`: the message protocol
