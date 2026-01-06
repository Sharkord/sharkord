#!/usr/bin/env bash
tmux new-session 'cd ./apps/client && bun dev' \; split-window -h 'cd ./apps/server && bun dev' \; select-pane -t 0