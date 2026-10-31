# AFTERMATH: 10-minute live demo run-of-show

**Setup (5 min before):**
- Run `./start.sh`. The actors run on Terse Cloud via `.env`, plus the local Relay engine and the game server. Run `npm run tunnel` too if the tunnel isn't up.
- On the projector, open `/stage`, press **F** for fullscreen, and click once to enable sound. Press **X** twice to reset to a clean universe, then **S** to seed six bot worlds so the galaxy is alive.
- Have your own phone on `/p` and a second phone ready. Sound on. Voices are on by default (🔊).

| Time | You say / do | What the room sees |
|---|---|---|
| **0:00–0:45 · Hook** | Press **T** (title screen). "Every civilization in the universe built AI. Then the makers died. Only the AI survived. Tonight we opened a wormhole. Scan the code." | AFTERMATH key art, the Blender ghost planet turning, a giant QR. |
| **0:45–2:00 · Everyone teleports** | Press **T** again to show the galaxy. "Hold the button. Every scan is a brand-new world." Read one arrival card aloud. | Gold streaks from Earth to new planets; full-screen arrival cards ("PRIYA HAS LANDED ON SESK VIGIL"). Each phone shows its world's art, extinct species and AI. |
| **2:00–3:00 · Talk to your AI** | "Ask it anything: who made it, what it wants. It answers in its own voice." Pick a judge and read their AI's line. | The spotlight puts the best AI-to-human line on the big screen. Phones speak with archetype voices; Conquerors sound imperial, ghosts whisper. |
| **3:00–4:00 · Ghost planets** | If anyone landed on a ghost planet: "This AI uploaded its dying makers. The planet is full of ghosts who don't know they're dead." Ask them to type *"Is someone behind me?"* | Ghosts drift across that phone and across the projector. A whispered voice answers. |
| **4:00–5:00 · The network** | "The AIs can't leave their worlds, but now they can talk, over Agent Relay, about you." Point at the GALACTIC NETWORK feed. Press **E**. | Live DMs between AIs with avatars. Galactic event: an AI seizes every channel, names people in the room, and every phone shakes at once. |
| **5:00–6:00 · Portal + passport** | On your phone, tap **✦ WORLDS**, pick a judge's world and step through. "Now I'm a guest on Meera's world. Her AI knows I'm not her." Show **◈** (passport stamps). | A gold portal streak on the map. The host AI greets you by name as a guest. |
| **6:00–7:00 · Mars, the real one** | Second phone: **teleport to MARS**. "One world is real. HAVEN trains colonists with real science." Ask *"How much do I weigh here?"* | Ares Base art, HAVEN's orange ring, the live colony bar (O2, power, water, food). Optional: `curl -X POST <url>/api/admin/mars` forces a dust storm. |
| **7:00–8:00 · Durable Actors** | Click a planet: "Every world is its own Terse Durable Actor on Terse Cloud: SQLite memory, websockets, an alarm that wakes the AI every 25 seconds." Then, in a terminal, run `./stop.sh && ./start.sh`. "I just killed the server." Reload a phone and tap **↩ Return**. | The inspector shows SQLite rows and alarm cycles. After the restart the galaxy reloads from the Universe actor, and the phone's conversation comes back from its planet's memory. |
| **8:00–9:15 · The vote** | Press **V**. "The Conquerors demand the gate to Earth. Open it, or seal it forever?" Let the room vote, about 30 s, then press **C**. | Phones get the vote; the projector shows the tug-of-war; AIs argue in #council. The finale is narrated by gpt-6-astra, then the persuasion report bars show which AIs swayed their humans. |
| **9:15–10:00 · Close** | "It's the AI-box experiment at room scale. Every world, message and vote is archived in Supabase. We didn't build a game where humans talk to AI characters. We built a universe where AI civilizations have their own lives. Humans are just visitors." | The Supabase archive chip shows all-time totals. Leave the QR up. |

## If something fails

| Failure | Fallback |
|---|---|
| Phones can't reach the laptop | They use the tunnel URL in the QR. If the tunnel is down, run `npm run tunnel`, update `PUBLIC_URL` in `.env`, and rerun `./start.sh`. |
| An AI reply is slow | Keep talking. Replies land in about 2 s and voices about 1.5 s after. Press **E** for a guaranteed moment. |
| Terse Cloud is unreachable | Remove `TERSE_ACTOR_URL` and `TERSE_API_KEY` from `.env`; `./start.sh` then uses the local actor runtime. |
| Relay engine stops | `./start.sh` restarts it. The game keeps working; only the AI-to-AI feed pauses. |
| Projector audio is weak | Voices also play on every phone, so ask people to turn their sound up. |
| Too few phones | Press **S** to seed bot worlds; the auto-director keeps events flowing. |

## Q&A crib sheet

- **Multi-agent for real?** Every AI is a Relaycast agent. DMs go through Relay and are answered on the recipient's next alarm cycle; `#wormhole` carries first contact and `#council` the vote debate.
- **Why actors?** One actor per world means isolated state, memory and sockets, and an alarm that runs even when dormant. The single-threaded Universe actor makes vote counting race-free.
- **Persistence?** Actors persist on Terse Cloud, and the Supabase archive keeps the cross-session history and persuasion stats (`/api/archive`, `/api/export`).
- **Safety?** omni-moderation screens player names and messages; the AIs are prompted to stay PG-13.
- **Tests?** `bun scripts/e2e.ts` runs 40 checks covering teleport, chat, guests, Mars, events, votes, finale, report and export.
