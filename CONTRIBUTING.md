# Contributing to AFTERMATH

Thanks for wanting to add to the universe. AFTERMATH was built in a day at Haunted Hacks, so the code favors small, readable files over abstractions. Contributions that keep it that way are the easiest to merge.

## Ground rules

- **Never commit secrets.** `.env`, `.relay-tokens.json`, `relaycast.db*` and logs are gitignored; keep it that way. Strip keys and tokens from any logs you paste into issues.
- **Keep the AIs PG-13.** Spooky, eerie or darkly funny, never graphic. Player input goes through moderation; new prompts should keep the shared `RULES`.
- **Every LLM call needs a fallback.** A slow or failed call must never block a player or break the room.
- **The protocol is the contract.** If you change a message or an endpoint, update [`web/protocol.md`](web/protocol.md) and [`docs/API.md`](docs/API.md) in the same PR.

## Setup

```bash
git clone https://github.com/vnmoorthy/aftermath.git
cd aftermath
npm install && (cd actors && npm install)
cp .env.example .env     # add your OPENAI_API_KEY
./start.sh               # Relaycast :8787, actor runtime :7100, server :3000
```

Requirements: Node 22+. Bun 1.4.4 and the Terse CLI are installed into `node_modules/.bin` and put on `PATH` by `start.sh`.

Open `http://localhost:3000/stage` and, in another window or on your phone, `/p`. Press `S` on the stage to seed bots so the network has someone to talk to. Logs go to `server.log`, `actors.log` and `relay.log`.

## Where things live

| You want to… | Edit |
|---|---|
| Add or tune an archetype, terrain, galaxy, species seed, catastrophe, star name, bot name, first-contact line or finale | [`server/lore.ts`](server/lore.ts) (data only, no imports) |
| Change how AIs think, talk, DM each other, or when they act | [`server/index.ts`](server/index.ts): `persona`, `reply`, `initiate`, `answer`, `muse`, `tick` |
| Add a Mars event | `MARS_EVENTS` in `server/index.ts` (give it an `apply` and a `brief`) |
| Change what an actor stores or broadcasts | [`actors/src/actors.ts`](actors/src/actors.ts), then rerun `./start.sh` (it regenerates the typed client) |
| Change the phone experience | [`web/phone-art.html`](web/phone-art.html) (single file, no build step) |
| Change the projector | [`web/stage.html`](web/stage.html) (arrival cards, AI faces, spotlight, galactic events and attract mode are the inlined “stage upgrade” block near the end) |
| Add art | `scripts/gen-art.ts` (gpt-image-2, writes `web/assets/*.webp`) |

### Adding an archetype

1. Add an entry to `ARCHETYPES` in `server/lore.ts` with `id`, `label`, `motto`, `color`, `effect`, `voice`, `agenda`, six `scareTactics`, eight `sampleLines`, `allies`, `enemies` and a `finaleStance` (`open`, `seal` or `chaos`).
2. Generate a portrait `web/assets/ai-<id>.webp` (1024×1024, dark background).
3. Add the id and color to `COLORS` (and `PITCH`) in `web/phone-art.html` and to `ARCH_IDS` in `web/stage.html`, and give it a TTS voice in `VOICES` in `server/index.ts`.
4. Teleport until you draw it (or temporarily force it in `nextArchetype`) and talk to it.

## Testing your change

With the services running:

```bash
bun scripts/e2e.ts                   # every flow end to end against http://localhost:3000
bun --env-file=.env scripts/llm-smoke.ts     # model calls
bun scripts/actor-smoke.ts           # actor RPCs
bun scripts/relay-smoke.ts           # Agent Relay
```

Then do a manual pass: teleport from two phones, talk, wait for an intercept, visit the other world, press `E`, `V`, `C`, and click a planet. Restart the server (`./start.sh`) and check that the universe resumes and phones can return to their worlds.

The stage also runs offline with `/stage?mock=1`, which is handy for pure UI work.

## Pull requests

- One idea per PR. Describe the moment it creates in the room, and include a screenshot or short clip for anything visual.
- Keep the phone and stage pages single-file, framework-free and working on iOS Safari, Android Chrome and desktop Chrome.
- Prefer clear names and short functions over comments; add a comment when the *why* isn't obvious.
- Make sure `bun scripts/e2e.ts` passes.

## Reporting bugs and ideas

Use the [bug report](.github/ISSUE_TEMPLATE/bug_report.md) and [feature request](.github/ISSUE_TEMPLATE/feature_request.md) templates.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
