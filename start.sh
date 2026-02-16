#!/usr/bin/env bash
set -euo pipefail

if command -v tmux >/dev/null 2>&1; then
  tmux new-session 'cd ./apps/client && bun dev' \; split-window -h 'cd ./apps/server && bun dev' \; select-pane -t 0
  exit 0
fi

echo "tmux not found; starting client and server in this terminal."

(cd ./apps/server && bun dev) &
server_pid=$!

cleanup() {
  if kill -0 "$server_pid" >/dev/null 2>&1; then
    kill "$server_pid" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

cd ./apps/client
bun dev
