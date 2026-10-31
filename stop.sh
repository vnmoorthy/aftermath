#!/usr/bin/env bash
pkill -f "relaycast-engine --port 8787"; pkill -f "bun --env-file=.env server/index.ts"; pkill -f "terse actor dev"; echo stopped
