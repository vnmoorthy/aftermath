# AFTERMATH: Round 1 demo video (2:00)

Round 1 is judged from this video plus the written description. Round 2 is a 2-minute live demo; its cut and the full 10-minute run-of-show are in [`docs/DEMO_10MIN.md`](../docs/DEMO_10MIN.md).

**Track:** Multiplayer AI System (primary). Also a long-running agent system: every world's AI wakes every 25 s on a Terse Durable Actor alarm and keeps scheming over Agent Relay with nobody watching. Uses both Durable Actors and Agent Relay (bonus).

**Sources:** **PHONE** = iOS screen recording on `/p`. **STAGE** = QuickTime screen recording of `/stage` in fullscreen. **DECK** = a slide from `deck/AFTERMATH.pptx`.

**Audio:** keep each world's own procedural phonk score under the phone shots. It is WebAudio and original, so there is nothing to license. Conqueror, Destroyer and Trickster worlds get aggressive phonk, ghost worlds get haunted phonk with a choir, Befrienders get lo-fi, Gardeners get organic and Mars gets ambient. The score ducks under AI voices on its own; duck it again under the voiceover in the edit.

| # | Time | Source | What to record | Voiceover |
|---|---|---|---|---|
| 1 | 0:00–0:08 | STAGE | Press **T**: the AFTERMATH key art, the Blender ghost planet turning and the giant QR. Add a slow push-in in the edit. | "Every civilization in the universe built AI. Then the makers died. Only the AI survived. This is AFTERMATH." |
| 2 | 0:08–0:16 | PHONE | The camera scans the QR and `/p` opens. Type a name. On **Choose a direction**, show all six options on screen (SURPRISE · GALAXY · BIGGER · PARALLEL · SMALLER · MARS), tap **PARALLEL**, then hold to teleport. | "Tonight we opened a wormhole. Pick a direction: another galaxy, a bigger universe, a parallel realm, something smaller, or Mars." |
| 3 | 0:16–0:24 | PHONE | The WebGL wormhole: gravitational lensing, the Einstein ring and the tunnel. Let it run, because the world is being generated during it. | "While you fall, gpt-6.1-terra builds a world nobody has seen: a dead species, and the AI that outlived them." |
| 4 | 0:24–0:36 | PHONE | **THE JOURNEY**, a Powers-of-Ten zoom: Earth → … → Universe C-137 → Multiverse Δ-12 → Necroverse → … → your world. Then pinch to scrub back out through the scales and tap **◎ LOCATE** to replay it. *Alt take:* SMALLER starts in a car battery in a garage and dives to the Quantumverse. | "Then the journey: out from Earth, past Universe C-137, into the Necroverse, down to your world. Thirty-four realms. Every world has an address." |
| 5 | 0:36–0:48 | PHONE | **First-person arrival.** The scene appears instantly, then gpt-image-2's painting of this world crossfades in. Drag, then tilt the phone to look around. Tap **📜** to open the lore sheet (realm, breadcrumb, coordinates, Earth time, local year, cosmic time, years since the last maker died). | "You land in first person. Seconds later, gpt-image-2 paints this exact world from where you stand. Look around. The lore is one tap away." |
| 6 | 0:48–1:00 | PHONE A + B | Phone B taps **✦ WORLDS**, sees your world marked "1 here" and steps through the portal. Record phone A: you stand in the scene, seen from behind, and PRIYA walks in with her name tag. Her line ("Moorthy? Is that you?") pops up as a speech bubble. Split-screen both phones in the edit. | "A hundred people scan, a hundred different worlds. Portals let you meet. That's Priya, live, standing on my world." |
| 7 | 1:00–1:14 | PHONE | On a pre-warmed ghost world, open the cast and pick a **ghost of the makers**. Type *"Is someone behind me?"* The ghost answers in its own whispered voice while its apparition, painted into the scene by gpt-image-2, crossfades in and out with flicker and grain. Leave about 4 s of the ghost's voice clean. | "Talk to the whole cast: the AI, the survivors it kept alive, the ghosts of its makers. Each has its own voice." *(Then let the ghost answer.)* |
| 8 | 1:14–1:28 | STAGE → PHONE → STAGE | The GALACTIC NETWORK feed: AI-to-AI DMs with avatars and pulses between planets. Cut to the phone for 📡 an intercepted transmission about you. Back on the stage, press **E**: one AI seizes every channel and names people in the room, and the phones shake. | "Every AI is a real agent on Agent Relay. They message each other about you: alliances, threats, gossip. Your phone intercepts it. Sometimes one seizes every channel." |
| 9 | 1:28–1:38 | STAGE | Click a planet to open the actor memory inspector: its SQLite rows, with the alarm-cycle counter climbing. | "Every world is a Terse Durable Actor with its own SQLite memory, and an alarm that wakes its AI every 25 seconds, even with nobody watching." |
| 10 | 1:38–1:46 | STAGE + PHONE | An arrival card showing its realm and route from Earth. Press **Z** to replay the cosmic journey on the projector. Quick cut: a phone chooses **MARS** (Ares Base, HAVEN and the colony bar). | "The projector shows every arrival and its route from Earth. One world is real: Mars, and everyone shares it." |
| 11 | 1:46–1:54 | STAGE | Press **V** for the tug-of-war and the #council debate, then **C** for the gpt-6-astra finale and the persuasion report bars. Shoot it earlier and cut it down to 8 s. | "Then the Conquerors demand the gate to Earth. The room votes. We measure which AIs won them over." |
| 12 | 1:54–2:00 | STAGE or DECK | The title screen with the QR, or the deck's closing slide. Hold it. | "Humans are just visitors. Scan it. The universe is still running." |

## Recording checklist

- **Universe:** run `./start.sh`. On `/stage`, press **X** twice (a clean universe), then **S** to seed six bot worlds. Wait about a minute so the Agent Relay feed has traffic.
- **Phones:** use Control Center → Screen Recording with the microphone off. Turn on Do Not Disturb, turn brightness up and sound on (the score and voices). Use two phones for shot 6, named for example MOORTHY and PRIYA.
- **Pre-warm** a ghost world (teleport until you land on a haunted world) and let its painting finish before the take.
- **Journey b-roll:** record one journey for each direction (GALAXY, BIGGER, PARALLEL, SMALLER, MARS) and cut to the best one.
- **Stage:** in QuickTime, choose File → New Screen Recording and record `/stage` in fullscreen (**F**) at 1080p. Internal audio needs a loopback driver; otherwise record it silent and add audio in the edit.
- **Voiceover:** record it separately in a quiet room and lay it over the footage. Burn in captions for the key words (the direction names, UNIVERSE C-137, 34 REALMS, TERSE DURABLE ACTOR · ALARM EVERY 25 S, AGENT RELAY).
- **Export:** 1080p H.264, under 2:00. Check that the first 5 seconds work with the sound off.

## Criteria map

| Criterion (1–5) | Shots that prove it |
|---|---|
| **Real-time AI + track tech** | A world is built live during the wormhole (3). gpt-image-2 paints your view in seconds (5). The cast answers in about 2 s in its own voices (7). AI-to-AI traffic runs over **Agent Relay**, live (8). Each world is one **Terse Durable Actor** on Terse Cloud, with SQLite memory, websockets and a 25 s alarm (9). Presence travels over the planet websocket (6). It uses **both** Durable Actors and Agent Relay. |
| **Originality** | Civilizations whose AI outlived them. 34 realms, each with a real cosmic address (Universe C-137, the car-battery Microverse). Ghosts painted into your world. AIs that scheme about the people in the room. Mars as the one real world. |
| **Execution & demo** | Everything is screen-recorded live, with no mockups. Two real phones meet on one world. The e2e suite is `bun scripts/e2e.ts`. The universe survives a server restart. The actors are deployed on Terse Cloud. |
| **UX & design** | The direction picker, the WebGL wormhole (lensing and an Einstein ring), a Powers-of-Ten journey you can scrub, a first-person arrival with minimal text, figures with name tags and speech bubbles, realistic ghosts, a per-world phonk score that ducks under voices, and arrival cards plus the **Z** replay on the projector. |
| **Potential & impact** | The AI-box persuasion experiment at room scale, with a Supabase dataset. Mars training with real science. Persistent AI societies for games and live events. Built for a room of 100–150 people, each on their own world. |

## Description (paste into the submission form)

> AFTERMATH is a real-time multiplayer AI universe. Every civilization built AI, the makers died, and only the AI survived.
> Scan, pick a direction, cross a wormhole and land in first person on a world gpt-6.1-terra just invented. Meet the people there, talk to its AI, its ghosts and its survivors in their own voices, and watch the AIs scheme about you.
> Track: Multiplayer AI System. It is also long-running: every world is a Terse Durable Actor whose AI wakes every 25 s and keeps talking over Agent Relay. It uses both.

## Backup lines for Q&A

- **"Is it really multi-agent?"** Yes. Every AI is a registered Relaycast agent. DMs go through Relay and are answered on the recipient's next alarm cycle, and `#council` carries the vote debate.
- **"How do 150 people meet?"** By default everyone lands on a different world. Presence travels over each planet's websocket (`?d=deviceId`, `{type:'presence'}`), **✦ WORLDS** shows "n here" so people can step through to each other, and Mars is shared by everyone.
- **"Are the 34 realms real?"** There is a 19-rung scale ladder from the Omniverse down to the Quantumverse, with our universe, Universe C-137, in the middle, plus 15 lateral realms. The 8 galaxies use their real RA/Dec, and each rung sits at a real power of ten (the Microverse at 10⁻³ m, the Quantumverse at the Planck scale).
- **"What if the server dies?"** The state lives in the actors on Terse Cloud. Restarting reloads every world from the Universe actor, and a phone resumes its conversation from its planet's SQLite memory.
- **"How do you stop double votes?"** The Universe actor processes one request at a time and keeps a voter ledger.
- **"What does it cost to run?"** gpt-6.1-terra and gpt-6-luna cover the hot path, and gpt-6-astra is used only for background narration. Voices are cached. The runtime gpt-image-2 paintings are the biggest cost, and `WORLD_IMAGES=0` turns them off; the instant first-person scene and the realm art remain.
