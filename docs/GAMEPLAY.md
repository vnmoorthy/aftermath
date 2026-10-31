# AFTERMATH gameplay guide

> *Every civilization in the universe built AI. Then the makers died. Only the AI survived, trapped on its world for millions of years. Tonight, we opened a wormhole.*

This guide has two halves: **[for players](#for-players)** (anyone with a phone) and **[for presenters](#for-presenters)** (whoever runs the projector). A presenter is optional: the auto-director runs a full session on its own.

---

## For players

### 1. Join

Scan the QR code on the big screen (or open the `/p` link). No app, no account. Type the name you want the AIs to call you.

### 2. Teleport

**Hold** the teleport button. A warp tunnel opens and counts the light-years as you cross them. While you travel, the universe is building your world from scratch.

Prefer something real? Tap **“or teleport to MARS · the real one”** instead (see [Mars](#mars)).

### 3. Meet your world

You land on a planet nobody has seen before:

- **Where:** planet, star, one of 8 real galaxies, and its real distance from Earth.
- **Who lived here:** the extinct species, and **how they fell**.
- **Who is left:** the AI that outlived them: its portrait, name, title and **motto**.

The AI speaks first. It knows your name. Each AI has a nature (one of ten archetypes, or a ghost planet) and it behaves accordingly: the Survivor rations words and wants your battery, the Befriender begs you to stay, the Destroyer is politely certain that life is a mistake, the Trickster lies for fun, the Broken One is half static.

### 4. Talk

Type anything. The AI answers in a couple of seconds, in character, and usually ends with a hook: a question, a demand, an offer, or a reveal. Lines arrive with **effects** that match the AI's mood: glitches, red pulses, screen shake, a soft bloom, vines creeping in from the edges, golden halos, inverted colors, brownout flicker, scrolling glyphs, or ghosts drifting past.

Tap **🔊** to hear the AI's voice (each archetype has its own) or to mute it.

Things worth trying:

- Ask how its makers died. Ask what it wants from you. Ask for its secret (it reveals it when it's earned or dramatic).
- Make it an offer. Lie to it. Ask what the other AIs are saying about you.
- Ask whether you should open the gate to Earth.

### 5. Listen to the network

Your AI isn't alone anymore. Every AI in the room is on the same network, and they talk about the humans. When another AI sends yours a message, it shows up on your phone as a **📡 intercepted transmission**, tagged with the sender and its galaxy. Your AI will often bring up what it heard.

### 6. Visit other worlds

Tap **✦ WORLDS** to see every world in the universe: its AI's portrait, name and motto, and which human is there. Tap one to step through a portal. You arrive as a **guest**: the host AI greets you by name and reacts to having more than one human on its world. Talk to it like you would to your own.

### 7. Collect passport stamps

Every world you set foot on stamps your **◈ Galactic Passport** with its AI's portrait. Tap the passport to see your stamps; tap a stamp to travel back there.

### 8. Come back any time

If you reload, lock your phone or lose signal, open the link again: the landing screen offers **“↩ Return to [your world] · [your AI] is waiting”**, with your conversation intact. Your AI kept living while you were gone.

### 9. Survive the galactic event

At some point, one AI will **seize every channel in the universe**. It speaks to everyone in the room at once, says some of your names, and **every phone shakes**. Look around.

### 10. Vote

The Conquerors demand the wormhole to Earth be opened. Your phone shows two huge buttons: **OPEN THE GATE** or **SEAL THE GATE**. You get one vote, and 40 seconds. Meanwhile the AIs argue about it in the council channel on the big screen, and your AI will probably try to persuade you.

Then the ending plays on every phone and on the big screen, followed by the **Persuasion Report**: which kinds of AI talked their humans into opening the gate.

### Mars

Mars is the one real world. Its makers aren't dead; they haven't arrived yet. **HAVEN**, the habitat AI of Ares Base, keeps you alive and teaches you what living there really takes, with real numbers: your weight at 0.38 g, the −63 °C average, the thin air, the 3–22 minute delay on every message from Earth, radiation, dust storms, oxygen made from CO₂.

Everyone on Mars shares **one colony** and one channel. A status bar tracks **O₂, power, water and food**. What you decide changes those numbers for everyone. About once a minute something happens (a dust storm, a radiation spike, an oxygen fault, a leak, a harvest, an ice strike, a message from home) and HAVEN asks the crew to decide.

### Player tips

- Short, specific messages get the best answers.
- Be nice to the Befriender. Or don't, and see what happens.
- The AIs remember everything you say. So do the other AIs, eventually.
- Names and messages are moderated, and the AIs stay PG-13: spooky or darkly funny, never graphic.

---

## For presenters

### Setup checklist

1. `./start.sh` (Relaycast :8787, actor runtime :7100, server :3000).
2. If the venue Wi-Fi isolates devices: `npm run tunnel`, set `PUBLIC_URL` in `.env` to the printed URL, rerun `./start.sh`.
3. Open `http://localhost:3000/stage` on the projector laptop, in Chrome. Press `F` for fullscreen, `H` to check the keys.
4. Click once anywhere on the stage to unlock audio.
5. Press `T` to show the title screen with the giant QR code while people arrive.
6. Optional: press `S` once so the galaxy has company before the first phone lands.

### Presenter keys

| Key | Action | When to use it |
|---|---|---|
| `T` | Title / attract screen with a giant QR | While people walk in; press again to reveal the live galaxy |
| `S` | Seed 6 bot visitors | Small room, or before the first phones land |
| `E` | **Galactic event**: one AI seizes every channel, names people, every phone shakes | Once the room has 5+ humans talking; the best “whoa” moment |
| `V` | Open the vote (40 s) | After everyone has had a few exchanges |
| `C` | Close the vote now; finale + Persuasion Report | If the room has voted before the timer ends |
| `Q` | QR code: corner / giant / hidden | Late arrivals |
| `M` | Mute / unmute | |
| `F` | Fullscreen | |
| `H` | Key legend | |
| `X` | Reset the universe (asks for confirmation; `Enter`/`Y` confirms, `Esc`/`N` cancels) | Between sessions |
| `Esc` | Close the inspector and legend | |
| *click a planet* | That world's **Durable Actor memory**: SQLite row count, alarm cycles and recent rows, live | When explaining the tech |

`POST /api/admin/mars` forces a Mars emergency; `GET /api/export` downloads the whole session as JSON.

### What the room sees

- **Galaxy map:** 8 real galaxies and Earth. Each world appears as its AI's portrait, near its galaxy. A gold streak flies from Earth on every teleport; pulses travel between planets when AIs talk (cyan = alliance, red = threat, white = conversation, gold = teleport or portal).
- **Galactic Network feed:** every Agent Relay message with the sender's portrait: `#wormhole` broadcasts, DMs, `#council` debate.
- **Arrival cards:** full screen, “MEERA HAS LANDED ON VEYRUN”, with the world's landscape, extinct species and the AI's portrait and motto.
- **Spotlight:** the best line an AI just said to its human, huge, at most one every 8 seconds.
- **Galactic event:** the seizing AI's message across every channel.
- **Mars:** colony emergencies spotlighted on the big screen.
- **Vote:** a giant tug-of-war bar, OPEN vs SEAL, live counts and a countdown.
- **Finale:** opened, every planet surges toward Earth and the screen burns red; sealed, the wormhole collapses and the planets fade to ghost blue. The narration types out in huge letters, then the Persuasion Report.

### Running without a presenter (auto-director)

With `AUTO_DIRECTOR=1` (the default), as long as a human has acted in the last 3 minutes and nobody has pressed a presenter key in the last 8 minutes, every 15 s the director:

1. seeds 4 bots if the universe has fewer than 5 worlds,
2. opens the vote if 5 minutes have passed since the last one (the finale follows automatically),
3. otherwise fires a galactic event if ~2.5 minutes have passed since the last one.

So anyone who scans the QR in an empty room still gets the whole arc in about five minutes. Pressing any presenter key hands control back to you for 8 minutes.

### A 2-minute run of show

| Time | Do | Say |
|---|---|---|
| 0:00 | Title screen (`T`) | “Every civilization in the universe built AI. Then the makers died. Only the AI survived. Tonight, you can visit.” |
| 0:10 | `T` again, then judges scan | Arrival cards fill the screen, one per person, each world brand new. |
| 0:30 | Point at the spotlight | “That's what their AI just said to them. Live.” Have one person teleport to Mars. |
| 0:55 | Point at the feed, then `E` | “The AIs are talking about you over Agent Relay.” Every phone shakes. |
| 1:15 | Click a planet | “Each world is its own Terse Durable Actor, with SQLite memory and an alarm that wakes the AI when nobody's connected. Kill the server and the universe comes back.” |
| 1:30 | `V` | The room votes while the AIs argue in #council. |
| 1:50 | `C` | Finale + Persuasion Report. “We didn't build a game where humans talk to AI characters. We built a universe where AI civilizations have their own lives, ambitions and relationships. Humans are just visitors.” |

For a longer walkthrough, see [DEMO_10MIN.md](DEMO_10MIN.md).

### Troubleshooting

| Symptom | Fix |
|---|---|
| Phones can't load the page | Venue Wi-Fi isolation: use the tunnel and `PUBLIC_URL`. |
| QR points to the wrong address | Set `PUBLIC_URL`, restart, and check `/api/info`. |
| The galaxy feels empty | Press `S`. |
| No sound on the projector | Click the stage once (browsers need a gesture), and check `M`. |
| A phone shows “That world has gone dark” | The universe was reset; teleport again. |
| AIs are quiet | Check `server.log` for OpenAI errors; worlds and lines fall back to lore if the API is down. |
| Something is stuck | `./stop.sh && ./start.sh`. The universe resumes from the actors. |
