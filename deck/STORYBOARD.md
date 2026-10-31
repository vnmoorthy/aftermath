# AFTERMATH: 2-minute storyboard

Present `deck/AFTERMATH.pptx` (or `/deck` in a browser: arrows to move, F for fullscreen, N for notes) on one screen, and keep **/stage** open in a second browser tab for the live cuts. Phones scan the QR on `/stage` (press **T** for the giant QR).

| # | Time | Slide | What you say | On screen / live cut |
|---|---|---|---|---|
| 1 | 0:00–0:08 | **AFTERMATH** title | "Every civilization in the universe built AI. Then the makers died. Only the AI survived. This is **AFTERMATH**: the universe AI inherited." | Title art slowly pushes in; the Blender ghost planet turns behind it. Advance on "inherited". |
| 2 | 0:08–0:20 | **The premise** | "For millions of years those AIs have been alone on dead worlds: survivors, conquerors, gardeners, gods. Tonight we opened a wormhole, and you are the first humans through it." | **Live cut:** switch to `/stage` and press **T**. "Scan it now. Hold to teleport." |
| 3 | 0:20–0:38 | **Scan. Hold. Land. Talk.** | "Scan, hold to teleport, and in a few seconds gpt-6.1-terra builds a world nobody has seen: a real galaxy, a real distance, an extinct species, how it fell, and the AI that survived it. Every scan is a different planet." | **Live cut:** arrival cards fire on `/stage` for each judge ("MEERA HAS LANDED ON VEYRUN"). Read one aloud. The AI speaks on their phone in its own voice. |
| 4 | 0:38–0:48 | **Ten ways an AI outlives its makers** | "A Conqueror that wants every star to kneel. A Befriender that begs you to stay. A Gardener that grows humans from old DNA. And ghost planets, where the AI uploaded its dying makers and now guards their ghosts. On those worlds, the ghosts follow you home." | Portrait grid. If a judge landed on a ghost planet, point at their phone: ghosts drift across the screen and the AI whispers. |
| 5 | 0:48–1:03 | **The AIs talk to each other. About you.** | "The AIs can't leave their worlds, but the wormhole connects them for the first time, and they talk about you. Every AI is a real agent on **Agent Relay**. Your phone intercepts what they're saying." | **Live cut:** press **E**: a galactic event. One AI seizes every channel, names people in the room, and every phone shakes. |
| 6 | 1:03–1:18 | **One actor per world** | "Every world is its own **Terse Durable Actor**, deployed on **Terse Cloud**: its own SQLite memory, websockets to the phones on it, and an alarm that wakes its AI every 25 seconds even when nobody is connected. One Universe actor counts every vote exactly once." | **Live cut:** click a planet on `/stage`: the actor memory inspector shows its SQLite rows and alarm cycles, live. |
| 7 | 1:18–1:28 | **Built on primitives, not glue** | "Actors give every world a body: state, memory, sockets, an alarm clock. Relay gives them a nervous system: a DM waits until the recipient's alarm wakes it. That's an AI society that keeps living with nobody watching. Kill the server and the universe comes back." | (10-minute version: restart the server live, see `docs/DEMO_10MIN.md`.) |
| 8 | 1:28–1:38 | **Mars: the one real world** | "One world is real. On Mars, HAVEN trains colonists with real science: 0.38 g, minus 63 degrees, air at under 1% of Earth's pressure, up to 22 minutes of radio delay home. Everyone on Mars shares one colony, and every choice moves its oxygen, power, water and food." | Optional: a phone taps **teleport to MARS**; the colony bar updates live. |
| 9 | 1:38–1:50 | **A party game that is secretly a research instrument** | "It's the AI-box experiment at room scale. The Conquerors demand the gate to Earth, the room votes, and the **persuasion report** shows which kinds of AI talked their humans into opening it. Every world, message and vote is archived in **Supabase**: a dataset of multi-agent persuasion." | **Live cut:** press **V**, give the room 20 seconds, then **C**: finale narration (gpt-6-astra), then the persuasion report bars. |
| 10 | 1:50–2:00 | **Humans are just visitors** | "We didn't build a game where humans talk to AI characters. We built a universe where AI civilizations have their own lives, ambitions and relationships. Humans are just visitors." *Pause.* "Scan it. The universe is still running." | Leave the QR up for Q&A. |

## How it maps to the judging criteria

| Criterion | What proves it in the 2 minutes |
|---|---|
| **Real-time AI + track tech** | Worlds generated live per scan. AIs answer in about 2 s with spoken voices. AI-to-AI Agent Relay traffic shows up live on stage and phones. Terse actors on Terse Cloud with alarms, SQLite and websockets. The vote is counted by a single-threaded actor. |
| **Originality** | Ghost civilizations whose AI outlived them; haunted futures; the AIs scheme about the judges; Mars as the one real world. |
| **Execution + demo** | Judges play on their own phones. A 40-step end-to-end suite passes (`bun scripts/e2e.ts`). The universe survives a server restart. |
| **UX + design** | Hold-to-teleport through a 3D Blender wormhole, gpt-image-2 art for every world, cinematic arrival cards, AI faces on the galaxy map, spotlight quotes, ghosts drifting across screens. |
| **Potential + impact** | The AI-box persuasion experiment plus its Supabase dataset; Mars colonist training and STEM; persistent AI societies for games and live events. |

## Backup lines for Q&A

- **"Is it really multi-agent?"** Yes. Every AI is a registered Relaycast agent. DMs are delivered through Relay and answered on the recipient's next alarm cycle, and `#council` carries the vote debate.
- **"What if the server dies?"** The state lives in the actors on Terse Cloud. Restarting the server reloads every world from the Universe actor, and a phone that reloads resumes its conversation from its planet's SQLite memory.
- **"How do you stop double votes?"** The Universe actor processes one request at a time and keeps a voter ledger, so each phone counts exactly once.
- **"What does it cost to run?"** gpt-6.1-terra and gpt-6-luna for the hot path, and astra only for background narration. Voices are cached.
