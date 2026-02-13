#!/usr/bin/env bash
# Claude Code hook - sends event data to the AI Monitor backend.
# Reads JSON from stdin and POSTs it to the local API.

AI_MONITOR_URL="${AI_MONITOR_URL:-http://localhost:6820}"

# Read JSON payload from stdin
payload=$(cat)

# POST to the events endpoint (fire and forget, don't block Claude)
curl -s -X POST "${AI_MONITOR_URL}/api/events" \
  -H "Content-Type: application/json" \
  -d "$payload" \
  --connect-timeout 2 \
  --max-time 5 \
  > /dev/null 2>&1 &

exit 0
