#!/usr/bin/env bash
# Starts the three local services: Relaycast engine (:8787), Terse actor runtime (:7100), game server (:3000).
set -u
cd "$(dirname "$0")"
export PATH="$PWD/node_modules/.bin:$PATH"   # project-local Bun 1.4.4 (Terse needs >= 1.4.2)
pkill -f "relaycast-engine --port 8787" 2>/dev/null
pkill -f "bun --env-file=.env server/index.ts" 2>/dev/null
pkill -f "terse actor dev" 2>/dev/null
sleep 1
relaycast-engine --port 8787 --db ./relaycast.db > relay.log 2>&1 &
(cd actors && terse actor dev > ../actors.log 2>&1) &
for i in $(seq 1 60); do grep -q "Keep this server running" actors.log 2>/dev/null && break; sleep 1; done
terse actor generate > /dev/null 2>&1
bun --env-file=.env server/index.ts > server.log 2>&1 &
for i in $(seq 1 20); do grep -q "aftermath\] http" server.log 2>/dev/null && break; sleep 1; done
tail -2 server.log
echo "Stage:  http://localhost:3000/stage"
echo "Phones: scan the QR on the stage (or open /p). For venue Wi-Fi, run: npm run tunnel, then set PUBLIC_URL in .env and rerun ./start.sh"
