# AFTERMATH: 10-minute live demo run-of-show

**Track:** Multiplayer AI System (primary). Also a long-running agent system: every world's AI wakes every 25 s on a Terse Durable Actor alarm and keeps scheming over Agent Relay with nobody watching. Uses both Durable Actors and Agent Relay (bonus).

**Setup (5 min before):**
- Run `./start.sh`. It starts the actors on Terse Cloud (configured in `.env`), the local Relay engine and the game server. If the tunnel isn't up, also run `npm run tunnel`.
- On the projector, open `/stage`, press **F** for fullscreen, and click once to enable sound. Press **X** twice to reset to a clean universe, then **S** to seed six bot worlds so the galaxy is alive.
- Have your own phone on `/p` and a second phone ready. Turn the sound on: every world has its own phonk score, and voices are on by default (🔊).
- Pre-warm one ghost world on your phone (teleport until you land on a haunted world) so its first-person painting is ready.

| Time | You say / do | What the room sees |
|---|---|---|
| **0:00–0:40 · Hook** | Press **T** (title screen). "Every civilization in the universe built AI. Then the makers died. Only the AI survived. Tonight we opened a wormhole. Scan the code." | The AFTERMATH key art, the Blender ghost planet turning, and a giant QR. |
| **0:40–1:40 · Choose a direction, teleport** | Press **T** again to show the galaxy. "Before you hold, choose a direction: SURPRISE; GALAXY, one of 8 real galaxies; BIGGER, up the ladder toward the Omniverse; PARALLEL, one of 15 lateral realms; SMALLER, down toward the Quantumverse; or MARS, the real one. Then hold." Read one arrival card aloud. | Phones show the direction picker, then the WebGL wormhole (gravitational lensing, an Einstein ring, the tunnel) while gpt-6.1-terra builds each world. The stage shows gold streaks from Earth and full-screen arrival cards ("PRIYA HAS LANDED ON SESK VIGIL") with the realm and the route from Earth. |
| **1:40–2:30 · The journey** | "Every world has a cosmic address. Watch the journey: out from Earth to the nearest shared ancestor, then back in to your world." Ask a judge who chose SMALLER to show theirs. "Swipe or pinch to scrub the scales; **◎ LOCATE** replays it." On the stage, press **Z**. | Phones play a Powers-of-Ten zoom, for example Earth → Sol → Milky Way → Local Group → Andromeda → star → planet, or Earth → … → Universe C-137 → Multiverse Δ-12 → Necroverse → … → world. SMALLER starts in a car battery in a garage. **Z** replays the cosmic journey on the projector. |
| **2:30–3:15 · First-person arrival** | "You land in first person. Then gpt-image-2 paints your world from where you stand. Drag or tilt to look around. The lore is in the **📜** sheet." | The first-person scene appears instantly, then the bespoke painting crossfades in. Each world's score starts: aggressive phonk for Conquerors, Destroyers and Tricksters; haunted phonk with a choir on ghost worlds; lo-fi for Befrienders; organic for Gardeners; ambient on Mars. The 📜 sheet shows the realm, breadcrumb, coordinates, Earth time, local year, cosmic time and years since the last maker died. |
| **3:15–4:15 · Talk to the cast** | "Ask anything. You can talk to the AI, the ghosts of its makers, or the survivors it kept alive: grown humans, alien hatchlings, a maker woken from cryosleep. Each one has its own voice." Pick a judge and read their AI's line. | The spotlight puts the best AI line on the big screen. Phones speak with a separate voice for each character, and the music ducks under every voice. Conquerors sound imperial; ghosts whisper. |
| **4:15–5:00 · Ghosts** | Switch to your pre-warmed ghost world, or use a judge who landed on one: "This AI uploaded its dying makers. They don't know they're dead." Pick a ghost and type *"Is someone behind me?"* Hold the phone up. | gpt-image-2 has painted the ghosts into the scene itself. Apparitions crossfade in and out in place with flicker, grain and whispers; there are no cartoon sprites. A whispered voice answers. |
| **5:00–5:50 · Meet each other** | On your phone, tap **✦ WORLDS**. "Every world shows how many people are on it." Pick a judge's world ("1 here") and step through. "Now I'm standing on Meera's world, and she can see me." Say something to her, then show **◈** (passport stamps). | On both phones, figures with name tags and speech bubbles move with live presence over the planet websocket; you stand in the scene, seen from behind. The host AI greets you by name as a guest. A gold portal streak appears on the map. |
| **5:50–6:40 · The network** | "The AIs can't leave their worlds, but they can talk to each other over Agent Relay. About you." Point at the GALACTIC NETWORK feed. Press **E**. | Live DMs between AIs, with avatars. In the galactic event, one AI seizes every channel, names people in the room, and every phone shakes at once. |
| **6:40–7:20 · Mars, the real one** | On the second phone, choose **MARS**. "One world is real, and everyone shares it." Ask *"How much do I weigh here?"* | The Ares Base art, HAVEN's orange ring, every colonist present, and the live colony bar (O2, power, water, food). Optional: `curl -X POST <url>/api/admin/mars` forces a dust storm. |
| **7:20–8:15 · Durable Actors** | Click a planet: "Every world is its own Terse Durable Actor on Terse Cloud: SQLite memory, websockets, and an alarm that wakes the AI every 25 seconds, even with nobody watching." Then, in a terminal, run `./stop.sh && ./start.sh`. "I just killed the server." Reload a phone and tap **↩ Return**. | The inspector shows SQLite rows and climbing alarm cycles. After the restart, the galaxy reloads from the Universe actor and the phone's conversation comes back from its planet's memory. |
| **8:15–9:20 · The vote** | Press **V**. "The Conquerors demand the gate to Earth. Open it, or seal it forever?" Let the room vote for about 30 s, then press **C**. | Phones get the vote, the projector shows the tug-of-war, and the AIs argue in #council. gpt-6-astra narrates the finale, then the persuasion report bars show which AIs swayed their humans. |
| **9:20–10:00 · Close** | "It's the AI-box experiment at room scale. Every world, message and vote is archived in Supabase. We didn't build a game where humans talk to AI characters. We built a universe where AI civilizations have their own lives. Humans are just visitors." | The Supabase archive chip shows all-time totals. Leave the QR up. |

## Round 2: the 2-minute live cut

| Time | Beat |
|---|---|
| 0:00–0:15 | The hook on the title screen (**T**) while the judges scan. |
| 0:15–0:45 | Choose a direction, the wormhole and the journey. Read an arrival card with its realm and route, and press **Z** to replay it on the projector. |
| 0:45–1:15 | The first-person arrival. Talk to a ghost or a survivor; the score ducks under its voice. |
| 1:15–1:30 | Step through **✦ WORLDS** onto a judge's world: they see you appear with your name tag. |
| 1:30–1:45 | The GALACTIC NETWORK feed. Press **E**, then click a planet for its actor memory and alarm cycles. |
| 1:45–2:00 | "Humans are just visitors. Scan it. The universe is still running." |

## If something fails

| Failure | Fallback |
|---|---|
| Phones can't reach the laptop | They use the tunnel URL in the QR. If the tunnel is down, run `npm run tunnel`, update `PUBLIC_URL` in `.env`, and rerun `./start.sh`. |
| An AI reply is slow | Keep talking. Replies land in about 2 s and voices about 1.5 s after. Press **E** for a guaranteed moment. |
| A first-person painting is slow | The instant first-person scene stays up, and the gpt-image-2 painting crossfades in when it's ready. `WORLD_IMAGES=0` in `.env` turns runtime paintings off. |
| Two people can't find each other | **✦ WORLDS** shows "n here" on every occupied world. Or both choose **MARS**, which everyone shares. |
| Terse Cloud is unreachable | Remove `TERSE_ACTOR_URL` and `TERSE_API_KEY` from `.env`; `./start.sh` then uses the local actor runtime. |
| Relay engine stops | `./start.sh` restarts it. The game keeps working; only the AI-to-AI feed pauses. |
| Projector audio is weak | Voices and scores also play on every phone, so ask people to turn their sound up. |
| Too few phones | Press **S** to seed bot worlds; the auto-director keeps events flowing. |

## Q&A crib sheet

- **Multi-agent for real?** Every AI is a Relaycast agent. DMs go through Relay and are answered on the recipient's next alarm cycle; `#wormhole` carries first contact and `#council` the vote debate.
- **Long-running?** Every planet's alarm fires every 25 s, even when its actor is dormant and nobody is connected, so the AIs keep answering mail and scheming. Come back, and your AI has heard things.
- **Why actors?** One actor per world means isolated state, memory and sockets, and an alarm that runs even when dormant. The single-threaded Universe actor makes vote counting race-free.
- **How do people meet?** With 100–150 people scanning, everyone lands on a different world. Presence travels over each planet's websocket (`?d=deviceId`, `{type:'presence'}` frames), **✦ WORLDS** shows "n here", portals let people step onto each other's worlds, and Mars is shared by everyone.
- **What are the 34 realms?** A 19-rung scale ladder runs from the Omniverse down to the Quantumverse, with our universe, Universe C-137, in the middle. On top of that are 15 lateral realms (Necroverse, Dreamverse, Mirrorverse…). The 8 galaxies use their real RA/Dec. The full list is in [GAMEPLAY.md](GAMEPLAY.md).
- **Who can I talk to?** The world's AI, the ghosts of its makers, and the survivors the AI kept alive. Each has its own persona and `gpt-4o-mini-tts` voice. You can also talk to the humans standing on the same world.
- **Persistence?** Actors persist on Terse Cloud, and the Supabase archive keeps the cross-session history and persuasion stats (`/api/archive`, `/api/export`).
- **Safety?** omni-moderation screens player names and messages, and the AIs are prompted to stay PG-13.
- **Tests?** `bun scripts/e2e.ts` runs the end-to-end suite, covering teleport, chat, guests, Mars, events, votes, finale, report and export.
